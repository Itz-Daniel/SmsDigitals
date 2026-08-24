const BASE_URL = 'https://ultimatelogsmarketplace.com/api/v1';

function getApiKey(): string | undefined {
  return process.env.ULTIMATE_LOGS_API_KEY;
}

export interface UltimateLogsProduct {
  id: number;
  name: string;
  price: number;
  currency: string;
  in_stock: number;
  description?: string;
  category_name?: string; // injected during flattening
}

export interface UltimateLogsCategory {
  category_id: number;
  category_name: string;
  products: UltimateLogsProduct[];
}

// In-memory cache for fast sub-millisecond retrieval
let productsCache: { data: UltimateLogsProduct[], expiresAt: number } | null = null;
let lastKnownGoodProducts: UltimateLogsProduct[] = [];

/**
 * Fetches all available services/goods.
 * High-speed caching with Next.js Data Cache (revalidate: 180s) and In-Memory Tier (600s).
 */
export const getUltimateLogsServices = async (): Promise<UltimateLogsProduct[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return lastKnownGoodProducts;

  if (productsCache && Date.now() < productsCache.expiresAt && productsCache.data.length > 0) {
    return productsCache.data;
  }

  try {
    const res = await fetch(`${BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      },
      next: { revalidate: 180 },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    
    const json = await res.json();
    
    if (!json.success || !json.data) {
       console.error("Ultimate Logs API Error:", json);
       return lastKnownGoodProducts.length > 0 ? lastKnownGoodProducts : (productsCache?.data || []);
    }

    // Flatten nested products and inject category name
    const allProducts: UltimateLogsProduct[] = [];
    (json.data as UltimateLogsCategory[]).forEach(cat => {
      if (cat.products && Array.isArray(cat.products)) {
        cat.products.forEach(p => {
          allProducts.push({
            ...p,
            category_name: cat.category_name
          });
        });
      }
    });

    if (allProducts.length > 0) {
      lastKnownGoodProducts = allProducts;
      productsCache = { data: allProducts, expiresAt: Date.now() + 600 * 1000 };
    }

    return allProducts.length > 0 ? allProducts : lastKnownGoodProducts;
  } catch (error) {
    console.error("Failed to fetch Ultimate Logs services (using cached fallback):", error);
    return lastKnownGoodProducts.length > 0 ? lastKnownGoodProducts : (productsCache?.data || []);
  }
};

/**
 * LIVE ENDPOINT: Buys a specific service. 
 * THIS IS NEVER CACHED.
 */
export async function buyUltimateLogsService(productId: number, quantity: number = 1): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) return { success: false, error: "API key missing" };

  try {
    const res = await fetch(`${BASE_URL}/purchase`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        product: productId,
        qty: quantity
      }),
      cache: 'no-store'
    });

    const json = await res.json();

    if (!json.success || !res.ok) {
       console.error("Ultimate Logs Purchase Error:", json);
       return { 
         success: false, 
         error: json.message || "Purchase failed" 
       };
    }

    // If successful, data should contain order_id, items array etc.
    return { success: true, data: json.data };

  } catch (error: any) {
    console.error("Failed to execute Ultimate Logs purchase:", error);
    return { success: false, error: error.message };
  }
}
