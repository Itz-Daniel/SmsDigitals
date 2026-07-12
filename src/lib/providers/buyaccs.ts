import { unstable_cache } from 'next/cache';

const API_KEY = process.env.BUYACCS_API_KEY;
const BASE_URL = 'https://buy-accs.net/api';

if (!API_KEY) {
  console.warn("BUYACCS_API_KEY is missing from environment variables.");
}

/**
 * Type definitions for Buy-accs.net API responses
 */
export interface BuyAccsCategory {
  id: number;
  weight: number;
  name: string;
  searchMarks: BuyAccsSearchMark[];
}

export interface BuyAccsSearchMark {
  id: number;
  alias: string;
  name: string;
}

export interface BuyAccsGood {
  id: number;
  price: number;
  count: number;
  title: string;
  description: string;
  category_id: number | null;
  search_marks: number[];
}

// In-memory cache to bypass Next.js 2MB unstable_cache limit
let categoriesCache: { data: BuyAccsCategory[], expiresAt: number } | null = null;
let goodsCache: { data: BuyAccsGood[], expiresAt: number } | null = null;

/**
 * Fetches all product categories.
 * Cached for 10 minutes in memory.
 */
export const getBuyAccsCategories = async (): Promise<BuyAccsCategory[]> => {
  if (!API_KEY) return [];

  // Return from cache if valid
  if (categoriesCache && Date.now() < categoriesCache.expiresAt) {
    return categoriesCache.data;
  }

  try {
    const res = await fetch(`${BASE_URL}/categories?api_key=${API_KEY}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    
    const data = await res.json();
    const categories = data.categories || [];
    
    // Update cache (10 mins)
    categoriesCache = { data: categories, expiresAt: Date.now() + 600 * 1000 };
    return categories;
  } catch (error) {
    console.error("Failed to fetch buy-accs categories:", error);
    return categoriesCache ? categoriesCache.data : [];
  }
};

/**
 * Fetches all available goods.
 * Cached for 5 minutes (300s) in memory.
 * Filters out out-of-stock items immediately to save memory.
 */
export const getBuyAccsGoods = async (): Promise<BuyAccsGood[]> => {
  if (!API_KEY) return [];

  // Return from cache if valid
  if (goodsCache && Date.now() < goodsCache.expiresAt) {
    return goodsCache.data;
  }

  try {
    // Must pass currency=usd to get USD pricing
    const res = await fetch(`${BASE_URL}/goods?api_key=${API_KEY}&currency=usd`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    
    const data = await res.json();
    
    if (data.errors) {
       console.error("Buy-accs API Error:", data.errors);
       return goodsCache ? goodsCache.data : [];
    }

    // Filter out items with no stock to save massive amounts of memory
    const goods = (data.goods || []).filter((g: BuyAccsGood) => g.count > 0 && g.price > 0);
    
    // Update cache (5 mins)
    goodsCache = { data: goods, expiresAt: Date.now() + 300 * 1000 };
    return goods;
  } catch (error) {
    console.error("Failed to fetch buy-accs goods:", error);
    return goodsCache ? goodsCache.data : [];
  }
};

/**
 * LIVE ENDPOINT: Buys a specific account. 
 * THIS IS NEVER CACHED.
 */
export async function buyAccsPurchase(goodId: number, count: number = 1): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!API_KEY) return { success: false, error: "API key missing" };

  try {
    const res = await fetch(`${BASE_URL}/buy?api_key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        good_id: goodId,
        count: count
      })
    });

    const data = await res.json();

    // API returns errors in an 'errors' object if it fails
    if (data.errors || !res.ok) {
       console.error("Buy-accs Purchase Error:", data.errors || data);
       return { 
         success: false, 
         error: data.errors ? JSON.stringify(data.errors) : "Purchase failed" 
       };
    }

    return { success: true, data: data };

  } catch (error: any) {
    console.error("Failed to execute buy-accs purchase:", error);
    return { success: false, error: error.message };
  }
}
