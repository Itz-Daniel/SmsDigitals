import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FiveSimApi, GrizzlyApi } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice } from "@/lib/pricing-engine";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { country, serviceName, currency = 'USD' } = await req.json();

    if (!country || !serviceName) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fast Cache Lookup (valid for 15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: cached } = await supabaseAdmin
      .from('cached_prices')
      .select('lowest_raw_cost, updated_at')
      .eq('country', country)
      .eq('service', serviceName)
      .single();

    let lowestRawCost = 0;
    let fromCache = false;

    if (cached && new Date(cached.updated_at).getTime() > new Date(fifteenMinsAgo).getTime()) {
      lowestRawCost = cached.lowest_raw_cost;
      fromCache = true;
    } else {
      // 2. Fetch live prices concurrently
      const results = await Promise.allSettled([
        FiveSimApi.getPrice(country, serviceName),
        GrizzlyApi.getPrice(country, serviceName)
      ]);

      const prices: number[] = [];
      for (const res of results) {
        if (res.status === 'fulfilled' && typeof res.value.cost === 'number' && !isNaN(res.value.cost) && res.value.cost > 0) {
          prices.push(res.value.cost);
        }
      }

      if (prices.length === 0) {
        if (cached) {
          lowestRawCost = cached.lowest_raw_cost;
          fromCache = true;
        } else {
          return NextResponse.json({ error: "Out of Stock", available: false }, { status: 200 });
        }
      } else {
        lowestRawCost = Math.min(...prices);

        // Async Cache Update (fire and forget for instant response)
        supabaseAdmin.rpc('upsert_cached_price', {
          p_country: country,
          p_service: serviceName,
          p_lowest_raw_cost: lowestRawCost
        }).then(({error}) => {
          if (error) console.error("Cache Upsert Error:", error);
        });
      }
    }

    // 3. Fast Settings Lookup
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('exchange_rate, brand_pricing')
      .eq('id', 1)
      .single();

    const exchangeRate = settings?.exchange_rate || 1500;
    const brandPricing = settings?.brand_pricing || null;

    // 4. Calculate Final Retail Price instantaneously
    const finalCost = calculateFinalRetailPrice(lowestRawCost, exchangeRate, currency, 0, serviceName, brandPricing);

    return NextResponse.json({
      success: true,
      available: true,
      cost: finalCost,
      currency: currency,
      cached: fromCache
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });

  } catch (error: any) {
    console.error("Live Pricing API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
