import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi, ProviderResponse } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice, calculateUserDiscount } from "@/lib/pricing-engine";
import { notifyTelegramAdmin } from "@/lib/telegram-admin";
import { enforceActiveAccount } from "@/lib/fraud-guard";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 🛡️ BANNED / FLAGGED ACCOUNT LOCK
    const accountBlock = await enforceActiveAccount(user.id);
    if (accountBlock) return accountBlock;

    const { serviceId, serviceName = "", country, region, currency = 'USD' } = await req.json();

    if (!serviceId || !country) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch User Wallet and VIP Tier Discount
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance_usd, balance_ngn, lifetime_deposits_usd')
      .eq('user_id', user.id)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found. Please contact support." }, { status: 404 });
    }

    const discountPercentage = calculateUserDiscount(wallet.lifetime_deposits_usd || 0);

    // 2. Multi-Provider Fallback Cascade Sequence (Primary: 5SIM, Backup: Grizzly SMS)
    const providers = [
      new FiveSimApi(),
      new GrizzlyApi()
    ];

    let successResponse: ProviderResponse | null = null;
    let usedProviderName = "";

    for (const provider of providers) {
      try {
        const res = await provider.rentNumber(country, serviceId, serviceName);
        if (res && res.success && res.phoneNumber) {
          successResponse = res;
          usedProviderName = provider.name;
          break;
        }
      } catch {
        console.warn(`Provider ${provider.name} failed for ${country}/${serviceId}, cascading...`);
      }
    }

    if (!successResponse) {
      await notifyTelegramAdmin(`🚨 Out of Stock: No virtual number available for ${country}/${serviceId}`);
      return NextResponse.json({ 
        error: "This line is currently out of stock for this country. Please try again in a few moments or select another country." 
      }, { status: 503 });
    }

    // 3. Pricing Calculation (Driven directly by Admin Settings in Database)
    const wholesaleCostUsd = successResponse.costUsd || 0.50;
    
    const { data: appSettings } = await supabaseAdmin
      .from('settings')
      .select('exchange_rate, brand_pricing')
      .eq('id', 1)
      .single();
    const exchangeRate = appSettings?.exchange_rate || 1500;
    const brandPricing = appSettings?.brand_pricing || null;

    const finalPriceNgn = calculateFinalRetailPrice(
      wholesaleCostUsd,
      exchangeRate,
      'NGN',
      discountPercentage,
      serviceName || serviceId,
      brandPricing
    );
    const finalPriceUsd = calculateFinalRetailPrice(
      wholesaleCostUsd,
      exchangeRate,
      'USD',
      discountPercentage,
      serviceName || serviceId,
      brandPricing
    );

    // 4. Balance Deduction Check
    if (currency === 'NGN') {
      if ((wallet.balance_ngn || 0) < finalPriceNgn) {
        return NextResponse.json({ 
          error: `Insufficient NGN Balance. Required: ₦${finalPriceNgn.toLocaleString(undefined, { maximumFractionDigits: 2 })}, Available: ₦${(wallet.balance_ngn || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}.` 
        }, { status: 402 });
      }

      // Deduct NGN Balance
      await supabaseAdmin
        .from('wallets')
        .update({ balance_ngn: wallet.balance_ngn - finalPriceNgn })
        .eq('user_id', user.id);
    } else {
      if ((wallet.balance_usd || 0) < finalPriceUsd) {
        return NextResponse.json({ 
          error: `Insufficient USD Balance. Required: $${finalPriceUsd.toFixed(2)}, Available: $${(wallet.balance_usd || 0).toFixed(2)}.` 
        }, { status: 402 });
      }

      // Deduct USD Balance
      await supabaseAdmin
        .from('wallets')
        .update({ balance_usd: wallet.balance_usd - finalPriceUsd })
        .eq('user_id', user.id);
    }

    // 5. Record Rental Order in Supabase
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
    const { data: newRental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .insert({
        user_id: user.id,
        order_id: successResponse.orderId,
        phone_number: successResponse.phoneNumber,
        service: serviceId,
        provider: usedProviderName,
        region: region || country,
        status: 'Waiting',
        cost: finalPriceUsd,
        currency: currency,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (rentalError) {
      console.error("Failed to insert rental into DB:", rentalError);
    }

    // 6. Record Transaction Ledger
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'Purchase',
      amount: finalPriceUsd,
      currency: currency,
      status: 'Success',
      reference: successResponse.orderId,
      description: `Purchased ${serviceName || serviceId} (${country.toUpperCase()}) line`
    });

    return NextResponse.json({
      success: true,
      rental: {
        id: newRental?.id || successResponse.orderId,
        order_id: successResponse.orderId,
        phone_number: successResponse.phoneNumber,
        service: serviceId,
        region: region || country,
        status: 'Waiting',
        cost: finalPriceUsd,
        currency: currency,
        expires_at: expiresAt,
        created_at: newRental?.created_at || new Date().toISOString()
      },
      order_id: successResponse.orderId,
      phone_number: successResponse.phoneNumber,
      service: serviceId,
      cost: finalPriceUsd,
      currency: currency,
      expires_at: expiresAt,
      message: "Virtual Number Procured Successfully!"
    });

  } catch (err: unknown) {
    console.error("Number procurement API error:", err);
    const msg = (err as Error)?.message || "";
    const isProviderErr = /5sim|grizzly|provider|api/i.test(msg);
    const safeError = isProviderErr
      ? "This line is currently out of stock. Please try again in a few moments or select another country."
      : (msg || "Temporary server error while procuring number.");
    return NextResponse.json({ error: safeError }, { status: 500 });
  }
}
