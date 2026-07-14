import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { FiveSimApi, GrizzlyApi } from "@/lib/providers/sms-providers";
import { calculateFinalRetailPrice, calculateUserDiscount } from "@/lib/pricing-engine";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { country, serviceName, currency = 'USD' } = await req.json();

    if (!country || !serviceName) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const supabase = await createClient(); // For getting the current user session

    // 1. Check local cache first (valid for 15 minutes)
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
        // If entirely out of stock, see if we have a stale cache we can fallback to gracefully
        if (cached) {
          lowestRawCost = cached.lowest_raw_cost;
          fromCache = true; // Fallback to stale cache
        } else {
          return NextResponse.json({ error: "Out of Stock", available: false }, { status: 200 });
        }
      } else {
        lowestRawCost = Math.min(...prices);

        // 3. Update cache asynchronously (don't await so we return fast)
        supabaseAdmin.rpc('upsert_cached_price', {
          p_country: country,
          p_service: serviceName,
          p_lowest_raw_cost: lowestRawCost
        }).then(({error}) => {
          if (error) console.error("Cache Upsert Error:", error);
        });
      }
    }

    // 4. Fetch dynamic exchange rate
    const { data: settings } = await supabaseAdmin.from('settings').select('exchange_rate').eq('id', 1).single(); // fallback
    const exchangeRate = settings?.exchange_rate || 1500;
    
    // Check if user is authenticated to get VIP discount
    const { data: { user } } = await supabase.auth.getUser();
    let userDiscount = 0;
    
    if (user) {
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('lifetime_deposits_usd')
        .eq('user_id', user.id)
        .single();
        
      if (wallet?.lifetime_deposits_usd) {
        userDiscount = calculateUserDiscount(wallet.lifetime_deposits_usd);
      }
    }

    // 5. Calculate Smart Tiered Pricing
    const finalCost = calculateFinalRetailPrice(lowestRawCost, exchangeRate, currency, userDiscount);

    return NextResponse.json({
      success: true,
      available: true,
      cost: finalCost,
      currency: currency,
      cached: fromCache
    });

  } catch (error: any) {
    console.error("Live Pricing API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
