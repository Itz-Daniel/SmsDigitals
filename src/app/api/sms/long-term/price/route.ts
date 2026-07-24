import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";

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
    const { country, serviceName, days = 30, currency = 'USD' } = await req.json();

    if (!country || !serviceName) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const durationDays = Math.max(1, Math.min(365, parseInt(days) || 30));
    const supabaseAdmin = createAdminClient();

    // Fetch Admin Pricing Controls & Minimum Floor Settings (checking settings then api_settings)
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
