import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { country, serviceName, currency = 'USD' } = await req.json();

    if (!country || !serviceName) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // In a production environment, we would query the SMSPVA API to get the exact rent cost 
    // for this specific country and service. 
    // For now, we use a base wholesale cost of $5.00 USD for a 30-day rental.
    const rawWholesaleCost = 5.00;

    // Fetch dynamic exchange rate
    const { data: settings } = await supabaseAdmin.from('settings').select('exchange_rate').eq('id', 1).single();
    const exchangeRate = settings?.exchange_rate || 1500;
    
    // Calculate Smart Tiered Pricing
    const finalCost = calculateFinalRetailPrice(rawWholesaleCost, exchangeRate, currency);

    return NextResponse.json({
      success: true,
      available: true,
      cost: finalCost,
      currency: currency
    });

  } catch (error: any) {
    console.error("Long Term Pricing API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
