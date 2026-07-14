import { NextResponse } from 'next/server';
import { getUltimateLogsServices } from '@/lib/providers/ultimatelogs';
import { calculateFinalRetailPrice, calculateUserDiscount } from '@/lib/pricing-engine';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated to get VIP discount
    const { data: { user } } = await supabase.auth.getUser();
    let userDiscount = 0;
    
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

    // 1. Fetch raw wholesale data from Ultimate Logs AND exchange rate
    const [rawGoods, settingsRes] = await Promise.all([
      getUltimateLogsServices(),
      supabase.from('settings').select('exchange_rate').eq('id', 1).single() // fallback handled below
    ]);

    const exchangeRate = settingsRes.data?.exchange_rate || 1500;

    // 2. Transform goods: filter out zero-stock, apply Retail Pricing
    const transformedGoods = rawGoods
      .filter(g => g.price > 0 && g.in_stock > 0)
      .map(g => {
        // Ultimate Logs API returns prices in NGN.
        // Convert to USD so our standard margin tiers apply correctly.
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

    return NextResponse.json({
      success: true,
      data: transformedGoods
    });
  } catch (error: any) {
    console.error("Failed to fetch marketplace goods:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load marketplace catalog" },
      { status: 500 }
    );
  }
}
