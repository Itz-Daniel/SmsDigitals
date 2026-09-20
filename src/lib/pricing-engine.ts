// SmsDigitals Direct Naira Pricing Engine v2.0
// Pure Direct Naira controls with live USD conversion, 1-Click promo modes, and wholesale safety floors.

export interface ServicePriceRule {
  priceNgn: number;
}

export const DEFAULT_BASELINE_FLOOR_NGN = 1200; // Baseline safety floor for any unlisted service

// VIP Customer Volume Discounts based on lifetime deposits
export function calculateUserDiscount(lifetimeDepositsUsd: number): number {
  if (lifetimeDepositsUsd >= 500) return 0.12; // Gold: 12% off
  if (lifetimeDepositsUsd >= 150) return 0.07; // Silver: 7% off
  if (lifetimeDepositsUsd >= 50) return 0.03;  // Bronze: 3% off
  return 0.00;
}

/**
 * Calculates the final retail price for any service.
 * - Prioritizes the exact Naira price set by the Admin in Settings on the website.
 * - Applies promo multipliers (e.g. -10% for weekend, +20% for surge).
 * - Enforces the absolute wholesale safety floor so you NEVER sell at a loss.
 */
export function calculateFinalRetailPrice(
  rawCostUsd: number, 
  exchangeRateOrDiscount: number = 1500, 
  currencyOrService: string = 'USD', 
  userDiscount: number = 0,
  serviceName: string = '',
  customBrandRules?: Record<string, any> | null,
  globalPromoMultiplier: number = 1.0,
  baselineFloorNgn: number = DEFAULT_BASELINE_FLOOR_NGN
): number {
  // Handle legacy positional overloads gracefully:
  // e.g., calculateFinalRetailPrice(rawCost, discountPercent, serviceName)
  let exchangeRate = 1500;
  let currency = 'USD';
  let discount = userDiscount;
  let resolvedServiceName = serviceName;

  if (exchangeRateOrDiscount < 10 && typeof currencyOrService === 'string' && currencyOrService !== 'USD' && currencyOrService !== 'NGN') {
    // Called as: calculateFinalRetailPrice(cost, discount, serviceName)
    discount = exchangeRateOrDiscount;
    resolvedServiceName = currencyOrService;
    currency = 'USD';
    exchangeRate = 1500;
  } else {
    exchangeRate = typeof exchangeRateOrDiscount === 'number' && exchangeRateOrDiscount >= 10 ? exchangeRateOrDiscount : 1500;
    currency = currencyOrService === 'NGN' ? 'NGN' : 'USD';
  }

  const nameLower = (resolvedServiceName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Unpack structured brand_pricing settings from Supabase
  let activeRules: Record<string, any> | null = customBrandRules || null;
  let activePromo = globalPromoMultiplier || 1.0;
  let activeFloor = baselineFloorNgn || DEFAULT_BASELINE_FLOOR_NGN;

  if (customBrandRules && typeof customBrandRules === 'object') {
    if (customBrandRules.pricesNgn && typeof customBrandRules.pricesNgn === 'object') {
      activeRules = customBrandRules.pricesNgn;
    }
    if (typeof customBrandRules.promoMultiplier === 'number' && customBrandRules.promoMultiplier > 0) {
      activePromo = customBrandRules.promoMultiplier;
    }
    if (typeof customBrandRules.baselineFloorNgn === 'number' && customBrandRules.baselineFloorNgn > 0) {
      activeFloor = customBrandRules.baselineFloorNgn;
    }
  }

  // 1. Determine base Naira price directly from Admin's website settings
  let baseNgn: number | null = null;
  
  if (activeRules && typeof activeRules === 'object' && nameLower) {
    for (const [key, rule] of Object.entries(activeRules)) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (nameLower.includes(cleanKey) || cleanKey.includes(nameLower)) {
        if (typeof rule === 'number' && rule > 0) {
          baseNgn = rule;
        } else if (rule && typeof rule.priceNgn === 'number' && rule.priceNgn > 0) {
          baseNgn = rule.priceNgn;
        } else if (rule && typeof rule.minPriceUsd === 'number') {
          baseNgn = Math.round(rule.minPriceUsd * exchangeRate);
        }
        break;
      }
    }
  }

  // If service has not been assigned a specific custom price, use the Admin's website Baseline Floor
  if (baseNgn === null || isNaN(baseNgn) || baseNgn <= 0) {
    baseNgn = activeFloor || DEFAULT_BASELINE_FLOOR_NGN;
  }

  // 2. Apply Global Promo Multiplier (1.0 = normal, 0.85 = 15% off, 1.2 = 20% surge)
  const promo = typeof activePromo === 'number' && activePromo > 0 ? activePromo : 1.0;
  let finalNgn = Math.round(baseNgn * promo);

  // 3. Absolute Safety Margin: Ensure we NEVER sell below wholesale cost + 70%
  const wholesaleCostNgn = Math.ceil((rawCostUsd || 0.15) * exchangeRate);
  const absoluteSafetyFloorNgn = Math.ceil(wholesaleCostNgn * 1.70);
  if (finalNgn < absoluteSafetyFloorNgn) {
    finalNgn = absoluteSafetyFloorNgn;
  }

  // 4. Apply VIP user discount if applicable
  if (userDiscount > 0 && userDiscount < 1) {
    finalNgn = Math.max(absoluteSafetyFloorNgn, Math.round(finalNgn * (1 - userDiscount)));
  }

  // 5. Format return value
  if (currency === 'NGN') {
    return finalNgn;
  }

  // Dollar equivalent rounded to 2 decimal places
  const usdPrice = Math.round((finalNgn / (exchangeRate || 1500)) * 100) / 100;
  return usdPrice;
}
