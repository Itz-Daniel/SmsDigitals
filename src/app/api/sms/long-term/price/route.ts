import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";

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
    const { country, serviceName, days = 30, currency = 'USD' } = await req.json();

    if (!country || !serviceName) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const durationDays = Math.max(1, Math.min(365, parseInt(days) || 30));
    const supabaseAdmin = createAdminClient();

    // Fetch Admin Pricing Controls & Minimum Floor Settings
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

    // Realistic Defaults: $0.80 floor (~₦1,200 NGN) for 1-day rental, $0.50 base daily rate, 30% margin
    const min1DayFloorUsd = settings?.rental_min_floor_usd ?? apiSettings?.rental_min_floor_usd ?? 0.80;
    const dailyBaseRateUsd = settings?.rental_daily_rate_usd ?? apiSettings?.rental_daily_rate_usd ?? 0.50;
    const marginPercent = settings?.rental_margin_percent ?? apiSettings?.rental_margin_percent ?? 30;
    const exchangeRate = settings?.exchange_rate ?? apiSettings?.exchange_rate ?? 1500;

    const discountRate = getDurationDiscount(durationDays);

    // Calculate raw total before floor guard
    const rawCalculatedUsd = (dailyBaseRateUsd * durationDays) * (1 - discountRate);

    // 🛡️ ENFORCE PROFIT FLOOR GUARD: 1-Day Rental Floor ($0.80 USD = ~₦1,200 NGN)
    const baseUsdWithFloor = Math.max(min1DayFloorUsd, rawCalculatedUsd);

    // Apply Admin Profit Margin
    const finalUsd = baseUsdWithFloor * (1 + marginPercent / 100);

    // Convert to target currency
    const finalCost = calculateFinalRetailPrice(finalUsd, exchangeRate, currency);

    return NextResponse.json({
      success: true,
      available: true,
      cost: finalCost,
      days: durationDays,
      discountPercentage: Math.round(discountRate * 100),
      currency: currency
    });

  } catch (error: any) {
    console.error("Long Term Pricing API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
