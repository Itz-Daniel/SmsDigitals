import { NextResponse } from 'next/server';
import { getUltimateLogsServices } from '@/lib/providers/ultimatelogs';
import { calculateFinalRetailPrice, calculateUserDiscount } from '@/lib/pricing-engine';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let exchangeRate = 1500;
    let userDiscount = 0;

    // 1. Resilient Supabase lookups (non-blocking)
    try {
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      const { data: settingsData } = await supabase
        .from('settings')
        .select('exchange_rate')
        .eq('id', 1)
        .single();

      if (settingsData?.exchange_rate) {
        exchangeRate = settingsData.exchange_rate;
      }

      if (user) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('lifetime_deposits_usd')
          .eq('user_id', user.id)
          .single();

        if (wallet?.lifetime_deposits_usd) {
          userDiscount = calculateUserDiscount(wallet.lifetime_deposits_usd);
        }
      }
    } catch (dbErr) {
      console.warn("Supabase lookup bypassed in marketplace goods:", dbErr);
    }

    // 2. Fetch live goods strictly from provider
    const rawGoods = await getUltimateLogsServices();

    // 3. Transform goods
    let transformedGoods: any[] = [];
    if (Array.isArray(rawGoods) && rawGoods.length > 0) {
      transformedGoods = rawGoods
        .filter(g => g && g.price > 0 && g.in_stock > 0)
        .map(g => {
          let wholesalePriceUsd = g.price;
          if (g.currency === 'NGN') {
            wholesalePriceUsd = g.price / exchangeRate;
          }

          return {
            id: g.id.toString(),
            provider_api_id: g.id.toString(),
            name: g.name || 'Unknown Account',
            description: g.description || g.category_name || '',
            category: g.category_name || 'Uncategorized',
            wholesale_price_usd: wholesalePriceUsd,
            retail_price_usd: calculateFinalRetailPrice(wholesalePriceUsd, exchangeRate, 'USD', userDiscount),
            retail_price_ngn: calculateFinalRetailPrice(wholesalePriceUsd, exchangeRate, 'NGN', userDiscount),
            stock: g.in_stock || 1000,
          };
        });
    }

    return NextResponse.json(
      {
        success: true,
        data: transformedGoods
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        }
      }
    );
  } catch (error: any) {
    console.error("Error in marketplace goods route:", error);
    return NextResponse.json({
      success: false,
      data: []
    }, { status: 500 });
  }
}
