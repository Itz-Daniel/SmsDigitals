import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";
import { enforceActiveAccount } from "@/lib/fraud-guard";

export const dynamic = 'force-dynamic';

// Bulk Volume Discount Curve for Long-Term Rentals
function getDurationDiscount(days: number): number {
  if (days >= 60) return 0.70; // 70% Bulk Discount
  if (days >= 30) return 0.65; // 65% Bulk Discount
  if (days >= 14) return 0.50; // 50% Bulk Discount
  if (days >= 7)  return 0.40; // 40% Bulk Discount
  if (days >= 3)  return 0.15; // 15% Bulk Discount
  return 0;
}

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

    // --- RATE LIMITING ---
    const { data: isAllowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_identifier: user.id,
      p_endpoint: '/api/sms/long-term/rent',
      p_max_requests: 3,
      p_window_seconds: 20
    });

    if (rateLimitError) {
      console.error("Rate limit check failed:", rateLimitError);
    } else if (isAllowed === false) {
      return NextResponse.json({ error: "You are doing that too fast. Please wait 20 seconds." }, { status: 429 });
    }

    const { serviceId, serviceName = "", country, days = 30, currency = 'USD', autoRenew = false } = await req.json();

    if (!serviceId || !country) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const durationDays = Math.max(1, Math.min(365, parseInt(days) || 30));
    const supabaseAdmin = createAdminClient();

    // 1. CALCULATE PRICING FIRST (with resilient fallback)
    let settings: any = null;
    const { data: sData, error: sErr } = await supabaseAdmin
      .from('settings')
      .select('rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent, exchange_rate, brand_pricing')
      .eq('id', 1)
      .maybeSingle();

    if (sErr && (sErr.message?.includes('column') || sErr.code === 'PGRST204')) {
      const { data: sFallback } = await supabaseAdmin
        .from('settings')
        .select('exchange_rate, brand_pricing')
        .eq('id', 1)
        .maybeSingle();
      settings = sFallback;
    } else {
      settings = sData;
    }

    let apiSettings: any = null;
    const { data: aData, error: aErr } = await supabaseAdmin
      .from('api_settings')
      .select('rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent, exchange_rate, brand_pricing')
      .limit(1)
      .maybeSingle();

    if (aErr && (aErr.message?.includes('column') || aErr.code === 'PGRST204')) {
      const { data: aFallback } = await supabaseAdmin
        .from('api_settings')
        .select('exchange_rate, brand_pricing')
        .limit(1)
        .maybeSingle();
      apiSettings = aFallback;
    } else {
      apiSettings = aData;
    }

    const min1DayFloorUsd = settings?.rental_min_floor_usd ?? settings?.brand_pricing?.rental_min_floor_usd ?? apiSettings?.rental_min_floor_usd ?? apiSettings?.brand_pricing?.rental_min_floor_usd ?? 0.80;
    const dailyBaseRateUsd = settings?.rental_daily_rate_usd ?? settings?.brand_pricing?.rental_daily_rate_usd ?? apiSettings?.rental_daily_rate_usd ?? apiSettings?.brand_pricing?.rental_daily_rate_usd ?? 0.50;
    const marginPercent = settings?.rental_margin_percent ?? settings?.brand_pricing?.rental_margin_percent ?? apiSettings?.rental_margin_percent ?? apiSettings?.brand_pricing?.rental_margin_percent ?? 30;
    const exchangeRate = settings?.exchange_rate ?? apiSettings?.exchange_rate ?? 1500;

    const discountRate = getDurationDiscount(durationDays);
    const rawCalculatedUsd = (dailyBaseRateUsd * durationDays) * (1 - discountRate);

    // 🛡️ ENFORCE PROFIT FLOOR GUARD ($0.80 Minimum for 1-Day Rental)
    const baseUsdWithFloor = Math.max(min1DayFloorUsd, rawCalculatedUsd);
    const finalUsd = baseUsdWithFloor * (1 + marginPercent / 100);

    const finalPriceNgn = calculateFinalRetailPrice(finalUsd, exchangeRate, 'NGN');
    const finalPriceUsd = calculateFinalRetailPrice(finalUsd, exchangeRate, 'USD');
    const finalCost = currency === 'USD' ? finalPriceUsd : finalPriceNgn;

    // 2. CHECK USER WALLET IN 'wallets' BEFORE CONTACTING PROVIDER (ZERO MONEY RISK)
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('balance_usd, balance_ngn')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: "Wallet not found. Please contact support." }, { status: 404 });
    }

    const totalAvailableNgn = (wallet.balance_ngn || 0) + ((wallet.balance_usd || 0) * exchangeRate);

    if (totalAvailableNgn < finalPriceNgn) {
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

    // 3. NOW SAFELY PROVISION NUMBER FROM PROVIDER
    let purchasedNumber;
    try {
      purchasedNumber = await FiveSimApi.rentNumber(country, serviceId, serviceName);
    } catch (e: any) {
      console.error(`5SIM rent failed:`, e.message || e);
      return NextResponse.json({ error: "Number out of stock or renting failed. Please try again later or select another service." }, { status: 404 });
    }

    if (!purchasedNumber || !purchasedNumber.phone) {
      return NextResponse.json({ error: "Provider returned an invalid number. Please try again." }, { status: 502 });
    }

    // 4. ATOMIC BALANCE DEDUCTION & PERSISTENCE
    const newBalanceNgn = Math.max(0, totalAvailableNgn - finalPriceNgn);
    const { error: deductError } = await supabaseAdmin
      .from('wallets')
      .update({
        balance_ngn: newBalanceNgn,
        balance_usd: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (deductError) {
      console.error("Wallet deduction error:", deductError);
      await FiveSimApi.cancelOrder(purchasedNumber.orderId);
      return NextResponse.json({ error: "Failed to process payment. Please try again." }, { status: 500 });
    }

    // Dynamic Expiration Timestamp (days * 24 hours)
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // 5. INSERT RENTAL RECORD
    const { data: newRental, error: rentalInsertError } = await supabaseAdmin
      .from('long_term_rentals')
      .insert({
        user_id: user.id,
        provider: '5sim',
        provider_order_id: purchasedNumber.orderId,
        phone_number: purchasedNumber.phone,
        service: serviceName || serviceId,
        country: country,
        price_paid: finalCost,
        currency: currency,
        expires_at: expiresAt,
        auto_renew: autoRenew,
        status: 'Active',
        incoming_sms: []
      })
      .select()
      .single();

    if (rentalInsertError) {
      console.error("Rental insertion error:", rentalInsertError);
      // Rollback wallet balance
      await supabaseAdmin
        .from('wallets')
        .update({ balance_ngn: totalAvailableNgn })
        .eq('user_id', user.id);
      await FiveSimApi.cancelOrder(purchasedNumber.orderId);
      return NextResponse.json({ error: "Failed to activate rental in database. Your balance has been preserved." }, { status: 500 });
    }

    // 6. RECORD TRANSACTION LEDGER
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'Purchase',
      amount: finalCost,
      currency: currency,
      status: 'Success',
      reference: `rent_lt_${purchasedNumber.orderId}`,
      description: `Dedicated ${durationDays}-Day Rental: ${serviceName || serviceId} (${purchasedNumber.phone})`
    });

    return NextResponse.json({
      success: true,
      data: {
        rental_id: newRental.id,
        phone_number: purchasedNumber.phone,
        service: serviceName || serviceId,
        country: country,
        duration_days: durationDays,
        cost: finalCost,
        currency: currency,
        expires_at: expiresAt
      }
    });

  } catch (error: any) {
    console.error("Long-Term Rent API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
