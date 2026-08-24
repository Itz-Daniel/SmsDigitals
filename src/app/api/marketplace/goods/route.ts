import { NextResponse } from 'next/server';
import { getUltimateLogsServices } from '@/lib/providers/ultimatelogs';
import { calculateFinalRetailPrice, calculateUserDiscount } from '@/lib/pricing-engine';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated to get VIP discount & exchange rate in parallel
    const [authRes, rawGoods, settingsRes] = await Promise.all([
      supabase.auth.getUser().catch(() => ({ data: { user: null } })),
      getUltimateLogsServices(),
      supabase.from('settings').select('exchange_rate').single().catch(() => ({ data: { exchange_rate: 1500 } }))
    ]);

    let userDiscount = 0;
    const user = authRes?.data?.user;
    
    if (user) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('lifetime_deposits_usd')
        .eq('user_id', user.id)
        .single()
        .catch(() => ({ data: null }));
        
      if (wallet?.lifetime_deposits_usd) {
        userDiscount = calculateUserDiscount(wallet.lifetime_deposits_usd);
      }
    }

    const exchangeRate = settingsRes?.data?.exchange_rate || 1500;

    // 2. Transform goods: filter out zero-stock, apply Retail Pricing
    const transformedGoods = rawGoods
      .filter(g => g.price > 0 && g.in_stock > 0)
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
    console.error("Failed to fetch marketplace goods:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load marketplace catalog" },
      { status: 500 }
    );
  }
}
