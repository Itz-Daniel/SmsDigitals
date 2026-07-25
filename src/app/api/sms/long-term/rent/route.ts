import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SmspvaApi } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";
import { enforceActiveAccount } from "@/lib/fraud-guard";

export const dynamic = 'force-dynamic';

// Bulk Volume Discount Curve for Long-Term Rentals
function getDurationDiscount(days: number): number {
  if (days >= 60) return 0.70; // 70% Bulk Discount -> ~$9.00 USD (~₦13,500 NGN) for 60 days
  if (days >= 30) return 0.65; // 65% Bulk Discount -> ~$5.25 USD (~₦7,875 NGN) for 30 days
  if (days >= 14) return 0.50; // 50% Bulk Discount -> ~$3.50 USD (~₦5,250 NGN) for 14 days
  if (days >= 7)  return 0.40; // 40% Bulk Discount -> ~$2.10 USD (~₦3,150 NGN) for 7 days
  if (days >= 3)  return 0.15; // 15% Bulk Discount -> ~$1.27 USD (~₦1,900 NGN) for 3 days
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
    let purchasedNumber;

    try {
      // Long-term rentals via SMSPVA rent api for auto-renew support
      purchasedNumber = await SmspvaApi.rentNumber(country, serviceId, serviceName);
    } catch (e: any) {
      console.error(`SMSPVA rent failed:`, e.message || e);
      return NextResponse.json({ error: "Number out of stock or renting failed. Please try again later." }, { status: 404 });
    }

    // --- CALCULATE DYNAMIC PRO-RATED DURATION PRICE WITH PROFIT FLOOR ---
    const supabaseAdmin = createAdminClient();

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent, exchange_rate')
      .eq('id', 1)
      .single();

    const { data: apiSettings } = await supabaseAdmin
      .from('api_settings')
      .select('rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent, exchange_rate')
      .limit(1)
      .single();

    const min1DayFloorUsd = settings?.rental_min_floor_usd ?? apiSettings?.rental_min_floor_usd ?? 0.80;
    const dailyBaseRateUsd = settings?.rental_daily_rate_usd ?? apiSettings?.rental_daily_rate_usd ?? 0.50;
    const marginPercent = settings?.rental_margin_percent ?? apiSettings?.rental_margin_percent ?? 30;
    const exchangeRate = settings?.exchange_rate ?? apiSettings?.exchange_rate ?? 1500;

    const discountRate = getDurationDiscount(durationDays);
    const rawCalculatedUsd = (dailyBaseRateUsd * durationDays) * (1 - discountRate);

    // 🛡️ ENFORCE PROFIT FLOOR GUARD ($0.80 Minimum for 1-Day Rental)
    const baseUsdWithFloor = Math.max(min1DayFloorUsd, rawCalculatedUsd);
    const finalUsd = baseUsdWithFloor * (1 + marginPercent / 100);

    const finalCost = calculateFinalRetailPrice(finalUsd, exchangeRate, currency);

    // Dynamic Expiration Timestamp (days * 24 hours)
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: rentData, error: rentError } = await supabaseAdmin.rpc('buy_long_term_rental', {
      p_user_id: user.id,
      p_provider: 'smspva',
      p_provider_order_id: purchasedNumber.orderId,
      p_phone_number: purchasedNumber.phone,
      p_service: serviceName || serviceId,
      p_country: country,
      p_cost: finalCost,
      p_currency: currency,
      p_expires_at: expiresAt,
      p_auto_renew: autoRenew
    });

    if (rentError || (rentData && !rentData.success)) {
      console.error("Database rent error:", rentError || rentData?.error);
      await SmspvaApi.cancelOrder(purchasedNumber.orderId, country, serviceId);
      return NextResponse.json({ error: rentData?.error || "Insufficient balance or transaction failed." }, { status: 400 });
    }

    // Record Transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      type: 'Purchase',
      amount: finalCost,
      currency: currency,
      status: 'Success',
      reference: purchasedNumber.orderId,
      description: `Rented ${serviceName || serviceId} (${country.toUpperCase()}) line for ${durationDays} Days`
    });

    // Success!
    return NextResponse.json({
      success: true,
      data: {
        rental_id: rentData.rental_id,
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
