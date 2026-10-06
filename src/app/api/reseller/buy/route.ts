import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { storeSlug, country = 'us', serviceId, serviceName, currency = 'USD' } = await req.json();

    if (!storeSlug || !serviceId) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch Reseller Storefront
    const { data: store } = await supabaseAdmin
      .from('reseller_storefronts')
      .select('*')
      .eq('store_slug', storeSlug.toLowerCase())
      .single();

    if (!store) {
      return NextResponse.json({ error: "Reseller storefront not found." }, { status: 404 });
    }

    // 2. Fetch Reseller Wallet Balance and Exchange Rate Settings FIRST
    const [{ data: resellerWallet }, { data: settings }] = await Promise.all([
      supabaseAdmin
        .from('wallets')
        .select('balance_usd, balance_ngn')
        .eq('user_id', store.user_id)
        .single(),
      supabaseAdmin
        .from('settings')
        .select('exchange_rate')
        .eq('id', 1)
        .single()
    ]);

    if (!resellerWallet) {
      return NextResponse.json({ error: "Reseller wallet inactive." }, { status: 400 });
    }

    const exchangeRate = settings?.exchange_rate || 1500;
    const totalResellerNgn = (Number(resellerWallet.balance_ngn) || 0) + ((Number(resellerWallet.balance_usd) || 0) * exchangeRate);

    // Pre-check balance before calling upstream providers (Stops wholesale balance drain)
    if (totalResellerNgn <= 0) {
      return NextResponse.json({ error: "Storefront temporarily out of stock (reseller low balance)." }, { status: 402 });
    }

    // 3. Multi-Provider Number Procurement Cascade (5SIM & Grizzly)
    const providers = [
      new FiveSimApi(),
      new GrizzlyApi()
    ];

    let successResponse: any = null;
    let usedProviderName = "";

    for (const provider of providers) {
      try {
        const res = await provider.rentNumber(country, serviceId, serviceName);
        if (res && res.success && res.phoneNumber) {
          successResponse = res;
          usedProviderName = provider.name;
          break;
        }
      } catch (e) {
        console.warn(`Reseller Cascade: Provider ${provider.name} failed for ${country}/${serviceId}`);
      }
    }

    if (!successResponse) {
      return NextResponse.json({ 
        error: "Line out of stock. All carrier networks are currently depleted for this service." 
      }, { status: 503 });
    }

    // 4. Wholesale vs Retail Markup Pricing Math
    const wholesaleUsd = successResponse.costUsd || 0.50;
    const resellerMarkupPercent = store.profit_margin_percent || 20;

    // Wholesale price charged to Reseller Wallet
    const wholesaleCostUsd = calculateFinalRetailPrice(wholesaleUsd, 0, serviceName || serviceId);
    // Retail price displayed to End Customer
    const customerRetailUsd = wholesaleCostUsd * (1 + resellerMarkupPercent / 100);
    const wholesaleNgn = Math.round(wholesaleCostUsd * exchangeRate);

    if (totalResellerNgn < wholesaleNgn) {
      // Immediate cancellation on provider
      try {
        if (usedProviderName === '5sim') {
          await FiveSimApi.cancelOrder(successResponse.orderId);
        } else if (usedProviderName === 'grizzly') {
          await GrizzlyApi.cancelOrder(successResponse.orderId);
        }
      } catch (_cErr) {}
      return NextResponse.json({ error: "Storefront temporarily out of stock (reseller low balance)." }, { status: 402 });
    }

    // Deduct accurately without wiping unspent USD
    let newResellerNgn = Number(resellerWallet.balance_ngn) || 0;
    let newResellerUsd = Number(resellerWallet.balance_usd) || 0;

    if (newResellerNgn >= wholesaleNgn) {
      newResellerNgn -= wholesaleNgn;
    } else {
      const deficitNgn = wholesaleNgn - newResellerNgn;
      const deficitUsd = deficitNgn / exchangeRate;
      newResellerNgn = 0;
      newResellerUsd = Math.max(0, newResellerUsd - deficitUsd);
    }

    await supabaseAdmin
      .from('wallets')
      .update({ balance_ngn: newResellerNgn, balance_usd: newResellerUsd })
      .eq('user_id', store.user_id);

    // 6. Record Rental in Database
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
    const { data: newRental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .insert({
        user_id: store.user_id, // Owned by Reseller account
        order_id: successResponse.orderId,
        phone_number: successResponse.phoneNumber,
        service: serviceId,
        provider: usedProviderName,
        region: country,
        country: country,
        status: 'Waiting',
        cost: customerRetailUsd,
        currency: currency,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (rentalError) {
      console.error("Reseller rental insertion failed:", rentalError);
      // Rollback wallet balance
      await supabaseAdmin
        .from('wallets')
        .update({ 
          balance_ngn: resellerWallet.balance_ngn, 
          balance_usd: resellerWallet.balance_usd 
        })
        .eq('user_id', store.user_id);

      try {
        if (usedProviderName === '5sim') {
          await FiveSimApi.cancelOrder(successResponse.orderId);
        } else if (usedProviderName === 'grizzly') {
          await GrizzlyApi.cancelOrder(successResponse.orderId);
        }
      } catch (_cErr) {}

      return NextResponse.json({ error: "Failed to record rental in database." }, { status: 500 });
    }

    // 7. Log Reseller Passive Profit Transaction
    const profitUsd = customerRetailUsd - wholesaleCostUsd;
    await supabaseAdmin.from('transactions').insert({
      user_id: store.user_id,
      type: 'Reseller Sale',
      amount: profitUsd,
      currency: currency,
      status: 'Success',
      reference: `reseller_${successResponse.orderId}`,
      description: `Passive sale profit from ${store.store_name} (${serviceName || serviceId})`
    });

    return NextResponse.json({
      success: true,
      order: {
        rental_id: newRental?.id || successResponse.orderId,
        order_id: successResponse.orderId,
        phone_number: successResponse.phoneNumber,
        service: serviceId,
        cost: customerRetailUsd,
        currency: currency,
        expires_at: expiresAt
      },
      message: `🎉 Number provisioned via ${store.store_name}!`
    });

  } catch (error: any) {
    console.error("Reseller Buy API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process storefront purchase." }, { status: 500 });
  }
}
