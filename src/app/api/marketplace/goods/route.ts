import { NextResponse } from 'next/server';
import { getBuyAccsGoods, getBuyAccsCategories } from '@/lib/providers/buyaccs';
import { calculateFinalRetailPrice } from '@/lib/pricing-engine';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 1. Fetch raw wholesale data from Buy-accs AND exchange rate
    const [rawGoods, categories, settingsRes] = await Promise.all([
      getBuyAccsGoods(),
      getBuyAccsCategories(),
      supabase.from('settings').select('exchange_rate').eq('id', 1).single()
    ]);

    const exchangeRate = settingsRes.data?.exchange_rate || 1500;

    // 2. Map Categories into a fast lookup dictionary
    const categoryMap = new Map<number, { name: string; weight: number }>();
    categories.forEach(cat => {
      categoryMap.set(cat.id, { name: cat.name, weight: cat.weight });
      // Map subcategories (search marks) for more granular names if needed
      if (cat.searchMarks && Array.isArray(cat.searchMarks)) {
        cat.searchMarks.forEach(sm => {
          categoryMap.set(sm.id, { name: sm.name, weight: cat.weight });
        });
      }
    });

    // 3. Transform goods: filter out zero-stock, apply Retail Pricing
    const transformedGoods = rawGoods
      .filter(g => g.count > 0 && g.price > 0)
      .map(g => {
        // Find category name. Try search marks first, fallback to category_id
        let categoryName = 'Uncategorized';
        if (g.search_marks && g.search_marks.length > 0) {
          categoryName = categoryMap.get(g.search_marks[0])?.name || categoryName;
        } else if (g.category_id) {
          categoryName = categoryMap.get(g.category_id)?.name || categoryName;
        }

        return {
          id: g.id.toString(),
          provider_api_id: g.id.toString(),
          name: g.title || 'Unknown Account',
          description: g.description || '',
          category: categoryName,
          wholesale_price_usd: g.price,
          retail_price_usd: calculateFinalRetailPrice(g.price, exchangeRate, 'USD'),
          retail_price_ngn: calculateFinalRetailPrice(g.price, exchangeRate, 'NGN'),
          stock: g.count,
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
