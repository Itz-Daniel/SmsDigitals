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

    // Fetch Admin Pricing Controls & Minimum Floor Settings
    const { data: settings } = await supabaseAdmin
      .from('api_settings')
      .select('rental_min_floor_usd, rental_daily_rate_usd, rental_margin_percent, exchange_rate')
      .limit(1)
      .single();

    const min1DayFloorUsd = settings?.rental_min_floor_usd || 2.50; // Default $2.50 (~₦3,750 NGN) to prevent undercutting single activations
    const dailyBaseRateUsd = settings?.rental_daily_rate_usd || 1.50;
    const marginPercent = settings?.rental_margin_percent || 40;
    const exchangeRate = settings?.exchange_rate || 1500;

    const discountRate = getDurationDiscount(durationDays);

    // Calculate raw total before floor guard
    const rawCalculatedUsd = (dailyBaseRateUsd * durationDays) * (1 - discountRate);

    // 🛡️ ENFORCE PROFIT FLOOR GUARD: 1-Day Rental can NEVER be cheaper than min1DayFloorUsd ($2.50)
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
