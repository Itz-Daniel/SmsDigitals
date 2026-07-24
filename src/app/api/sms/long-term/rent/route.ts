import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SmspvaApi } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";
import { enforceActiveAccount } from "@/lib/fraud-guard";

export const dynamic = 'force-dynamic';

function getDurationDiscount(days: number): number {
  if (days >= 60) return 0.30;
  if (days >= 30) return 0.20;
  if (days >= 14) return 0.10;
  if (days >= 7)  return 0.05;
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

    // --- CALCULATE DYNAMIC PRO-RATED DURATION PRICE ---
    const supabaseAdmin = createAdminClient();
    const { data: settings } = await supabaseAdmin.from('settings').select('exchange_rate').eq('id', 1).single();
    const exchangeRate = settings?.exchange_rate || 1500;
    
    const baseDailyCostUsd = 0.35;
    const discountRate = getDurationDiscount(durationDays);
    const rawWholesaleTotal = (baseDailyCostUsd * durationDays) * (1 - discountRate);

    const finalCost = calculateFinalRetailPrice(rawWholesaleTotal, exchangeRate, currency);

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
