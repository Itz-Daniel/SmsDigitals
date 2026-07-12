import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SmspvaApi } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const { serviceId, serviceName = "", country, currency = 'USD', autoRenew = false } = await req.json();

    if (!serviceId || !country) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    let purchasedNumber;

    try {
      // 1-month rentals exclusively via SMSPVA rent api for auto-renew support
      purchasedNumber = await SmspvaApi.rentNumber(country, serviceId, serviceName);
    } catch (e: any) {
      console.error(`SMSPVA rent failed:`, e.message || e);
      return NextResponse.json({ error: "Number out of stock or renting failed. Please try again later." }, { status: 404 });
    }

    // --- CALCULATE FINAL PRICE ---
    const supabaseAdmin = createAdminClient();
    const { data: settings } = await supabaseAdmin.from('settings').select('exchange_rate').eq('id', 1).single();
    const exchangeRate = settings?.exchange_rate || 1500;
    
    const finalCost = calculateFinalRetailPrice(purchasedNumber.cost, exchangeRate, currency);

    // --- DEDUCT BALANCE & CREATE RENTAL ---
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Expires in 30 days

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
      // Cancel the order so provider refunds us since our DB deduction failed
      await SmspvaApi.cancelOrder(purchasedNumber.orderId, country, serviceId);
      return NextResponse.json({ error: rentData?.error || "Insufficient balance or transaction failed." }, { status: 400 });
    }

    // Success!
    return NextResponse.json({
      success: true,
      data: {
        rental_id: rentData.rental_id,
        phone_number: purchasedNumber.phone,
        service: serviceName || serviceId,
        country: country,
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
