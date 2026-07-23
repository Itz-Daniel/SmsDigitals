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

// In-memory cache to bypass Next.js unstable_cache limits
let productsCache: { data: UltimateLogsProduct[], expiresAt: number } | null = null;

/**
 * Fetches all available services/goods.
 * Cached for 5 minutes (300s) in memory.
 */
export const getUltimateLogsServices = async (): Promise<UltimateLogsProduct[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  if (productsCache && Date.now() < productsCache.expiresAt) {
    return productsCache.data;
  }

  try {
    const res = await fetch(`${BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    
    const json = await res.json();
    
    if (!json.success || !json.data) {
       console.error("Ultimate Logs API Error:", json);
       return productsCache ? productsCache.data : [];
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

    // Cache for 5 minutes
    productsCache = { data: allProducts, expiresAt: Date.now() + 300 * 1000 };
    return allProducts;
  } catch (error) {
    console.error("Failed to fetch Ultimate Logs services:", error);
    return productsCache ? productsCache.data : [];
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
