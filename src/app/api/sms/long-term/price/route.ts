import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";

export const dynamic = 'force-dynamic';

function getDurationDiscount(days: number): number {
  if (days >= 60) return 0.30; // 30% bulk discount for 2+ months
  if (days >= 30) return 0.20; // 20% bulk discount for 1 month
  if (days >= 14) return 0.10; // 10% discount for 2 weeks
  if (days >= 7)  return 0.05; // 5% discount for 1 week
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

    // Base 1-day wholesale cost (e.g. $0.35/day)
    const baseDailyCostUsd = 0.35;
    const discountRate = getDurationDiscount(durationDays);

    // Wholesale total with discount
    const rawWholesaleTotal = (baseDailyCostUsd * durationDays) * (1 - discountRate);

    // Fetch dynamic exchange rate
    const { data: settings } = await supabaseAdmin.from('settings').select('exchange_rate').eq('id', 1).single();
    const exchangeRate = settings?.exchange_rate || 1500;
    
    // Calculate final retail price
    const finalCost = calculateFinalRetailPrice(rawWholesaleTotal, exchangeRate, currency);

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
