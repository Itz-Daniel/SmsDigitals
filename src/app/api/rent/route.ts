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

    // 1. Fetch User Wallet, VIP Tier Discount, and Exchange Rate Settings FIRST
    const [{ data: wallet }, { data: appSettings }] = await Promise.all([
      supabaseAdmin
        .from('wallets')
        .select('balance_usd, balance_ngn, lifetime_deposits_usd')
        .eq('user_id', user.id)
        .single(),
      supabaseAdmin
        .from('settings')
        .select('exchange_rate, brand_pricing')
        .eq('id', 1)
        .single()
    ]);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found. Please contact support." }, { status: 404 });
    }

    const exchangeRate = appSettings?.exchange_rate || 1500;
    const brandPricing = appSettings?.brand_pricing || null;
    const discountPercentage = calculateUserDiscount(wallet.lifetime_deposits_usd || 0);

    // 2. Pre-Check Available Funds BEFORE contacting upstream providers (Stops wholesale balance drain)
    const totalAvailableNgn = (wallet.balance_ngn || 0) + ((wallet.balance_usd || 0) * exchangeRate);

    if (totalAvailableNgn <= 0) {
      return NextResponse.json({ 
        error: "Insufficient Balance. Please fund your account to continue." 
      }, { status: 402 });
    }

    // Check cached wholesale cost or conservative floor estimate ($0.20)
    const { data: cachedPrice } = await supabaseAdmin
      .from('cached_prices')
      .select('lowest_raw_cost')
      .eq('country', country)
      .eq('service', serviceName || serviceId)
      .maybeSingle();

    const estimatedWholesale = cachedPrice?.lowest_raw_cost || 0.20;
    const estimatedPriceNgn = calculateFinalRetailPrice(
      estimatedWholesale,
      exchangeRate,
      'NGN',
      discountPercentage,
      serviceName || serviceId,
      brandPricing
    );

    if (totalAvailableNgn < estimatedPriceNgn) {
      if (currency === 'USD') {
        const availableUsd = (totalAvailableNgn / exchangeRate).toFixed(2);
        const estimatedUsd = (estimatedPriceNgn / exchangeRate).toFixed(2);
        return NextResponse.json({ 
          error: `Insufficient Balance. Estimated Required: $${estimatedUsd}, Available: $${availableUsd}. Please fund your account to continue.` 
        }, { status: 402 });
      } else {
        return NextResponse.json({ 
          error: `Insufficient Balance. Estimated Required: ₦${estimatedPriceNgn.toLocaleString(undefined, { maximumFractionDigits: 2 })}, Available: ₦${totalAvailableNgn.toLocaleString(undefined, { maximumFractionDigits: 2 })}. Please fund your account to continue.` 
        }, { status: 402 });
      }
    }

    // 3. Multi-Provider Fallback Cascade Sequence (Primary: 5SIM, Backup: Grizzly SMS)
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

    // 4. Exact Pricing Calculation
    const wholesaleCostUsd = successResponse.costUsd || 0.50;

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

    // Fail-safe check against actual final price
    if (totalAvailableNgn < finalPriceNgn) {
      // IMMEDIATE ROLLBACK on provider to prevent loss of wholesale balance
      try {
        if (usedProviderName === '5sim') {
          await FiveSimApi.cancelOrder(successResponse.orderId);
        } else if (usedProviderName === 'grizzly') {
          await GrizzlyApi.cancelOrder(successResponse.orderId);
        }
      } catch (_cancelErr) {}

      if (currency === 'USD') {
        const availableUsd = (totalAvailableNgn / exchangeRate).toFixed(2);
        return NextResponse.json({ 
          error: `Insufficient Balance. Required: $${finalPriceUsd.toFixed(2)}, Available: $${availableUsd}. Please fund your account to continue.` 
        }, { status: 402 });
      } else {
        return NextResponse.json({ 
          error: `Insufficient Balance. Required: ₦${finalPriceNgn.toLocaleString(undefined, { maximumFractionDigits: 2 })}, Available: ₦${totalAvailableNgn.toLocaleString(undefined, { maximumFractionDigits: 2 })}. Please fund your account to continue.` 
        }, { status: 402 });
      }
    }

    // Deduct accurately without zeroing out unspent foreign currency
    let newBalanceNgn = wallet.balance_ngn || 0;
    let newBalanceUsd = wallet.balance_usd || 0;

    if (currency === 'USD') {
      if (newBalanceUsd >= finalPriceUsd) {
        newBalanceUsd -= finalPriceUsd;
      } else {
        const deficitUsd = finalPriceUsd - newBalanceUsd;
        const deficitNgn = deficitUsd * exchangeRate;
        newBalanceUsd = 0;
        newBalanceNgn = Math.max(0, newBalanceNgn - deficitNgn);
      }
    } else {
      if (newBalanceNgn >= finalPriceNgn) {
        newBalanceNgn -= finalPriceNgn;
      } else {
        const deficitNgn = finalPriceNgn - newBalanceNgn;
        const deficitUsd = deficitNgn / exchangeRate;
        newBalanceNgn = 0;
        newBalanceUsd = Math.max(0, newBalanceUsd - deficitUsd);
      }
    }

    await supabaseAdmin
      .from('wallets')
      .update({ 
        balance_ngn: newBalanceNgn,
        balance_usd: newBalanceUsd 
      })
      .eq('user_id', user.id);

    // 5. Record Rental Order in Supabase
    const purchaseCost = currency === 'USD' ? finalPriceUsd : finalPriceNgn;
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
        cost: purchaseCost,
        currency: currency,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (rentalError) {
      console.error("Failed to insert rental into DB:", rentalError);
      // Atomic rollback: restore exact original wallet balances
      await supabaseAdmin
        .from('wallets')
        .update({ 
          balance_ngn: wallet.balance_ngn,
          balance_usd: wallet.balance_usd
        })
        .eq('user_id', user.id);

      try {
        if (usedProviderName === '5sim') {
          await FiveSimApi.cancelOrder(successResponse.orderId);
        } else if (usedProviderName === 'grizzly') {
          await GrizzlyApi.cancelOrder(successResponse.orderId);
        }
      } catch (_cancelErr) {}

      return NextResponse.json({ 
        error: "Failed to allocate number in system. Your wallet balance has been preserved." 
      }, { status: 500 });
    }

    // 6. Record Transaction Ledger
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'Purchase',
      amount: purchaseCost,
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
        cost: purchaseCost,
        currency: currency,
        expires_at: expiresAt,
        created_at: newRental?.created_at || new Date().toISOString()
      },
      order_id: successResponse.orderId,
      phone_number: successResponse.phoneNumber,
      service: serviceId,
      cost: purchaseCost,
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
