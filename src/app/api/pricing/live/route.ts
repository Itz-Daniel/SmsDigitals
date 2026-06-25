import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi } from "@/lib/providers/sms-providers";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { country, serviceName, currency = 'USD' } = await req.json();

    if (!country || !serviceName) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    // Fetch live prices concurrently
    const [fiveSimRes, grizzlyRes] = await Promise.allSettled([
      FiveSimApi.getPrice(country, serviceName),
      GrizzlyApi.getPrice(country, serviceName)
    ]);

    const prices: number[] = [];

    if (fiveSimRes.status === 'fulfilled' && typeof fiveSimRes.value.cost === 'number' && !isNaN(fiveSimRes.value.cost)) {
      // Assuming cost is in USD (if account is set to USD) or fallback raw amount
      // Most 5sim USD accounts return prices around 0.10 to 1.00
      prices.push(fiveSimRes.value.cost);
    }

    if (grizzlyRes.status === 'fulfilled' && typeof grizzlyRes.value.cost === 'number' && !isNaN(grizzlyRes.value.cost)) {
      prices.push(grizzlyRes.value.cost);
    }

    if (prices.length === 0) {
      return NextResponse.json({ error: "Out of Stock", available: false }, { status: 200 });
    }

    // Find the absolute lowest raw price available
    const lowestRawCost = Math.min(...prices);

    // Fetch dynamic profit margin and exchange rate
    const supabaseAdmin = createAdminClient();
    const { data: settings } = await supabaseAdmin.from('settings').select('profit_margin, exchange_rate').eq('id', 1).single();
    const profitMargin = settings?.profit_margin || 0.40;
    const exchangeRate = settings?.exchange_rate || 1500;
    
    // Calculate final retail price
    const retailCostUsd = lowestRawCost + (lowestRawCost * profitMargin);
    let finalCost = retailCostUsd;
    
    if (currency === 'NGN') {
      finalCost = retailCostUsd * exchangeRate;
    }

    // Round safely
    finalCost = currency === 'NGN' ? Math.ceil(finalCost) : Math.round(finalCost * 100) / 100;

    return NextResponse.json({
      success: true,
      available: true,
      cost: finalCost,
      currency: currency
    });

  } catch (error: unknown) {
    console.error("Live Pricing API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
