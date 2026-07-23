export interface BrandMarginRule {
  minPriceUsd: number;
  multiplier: number;
}

export const DEFAULT_BRAND_PRICE_RULES: Record<string, BrandMarginRule> = {
  "telegram": { minPriceUsd: 1.00, multiplier: 2.5 },
  "tinder": { minPriceUsd: 1.20, multiplier: 2.5 },
  "whatsapp": { minPriceUsd: 0.90, multiplier: 1.5 },
  "openai": { minPriceUsd: 1.00, multiplier: 2.5 },
  "chatgpt": { minPriceUsd: 1.00, multiplier: 2.5 },
  "instagram": { minPriceUsd: 0.80, multiplier: 2.0 },
  "facebook": { minPriceUsd: 0.80, multiplier: 2.0 },
  "twitter": { minPriceUsd: 0.80, multiplier: 2.0 },
  "google": { minPriceUsd: 0.75, multiplier: 2.0 },
  "gmail": { minPriceUsd: 0.75, multiplier: 2.0 },
  "tiktok": { minPriceUsd: 0.75, multiplier: 2.0 },
};

export function calculateTieredMargin(rawCostUsd: number): number {
  if (rawCostUsd < 0.50) {
    return 1.0; // 100% margin on cheap numbers
  }
  if (rawCostUsd <= 2.00) {
    return 0.50; // 50% margin on medium numbers
  }
  return 0.25; // 25% margin on expensive numbers
}

export function calculateUserDiscount(lifetimeDepositsUsd: number): number {
  if (lifetimeDepositsUsd >= 500) return 0.12; // Gold: 12% off
  if (lifetimeDepositsUsd >= 150) return 0.07; // Silver: 7% off
  if (lifetimeDepositsUsd >= 50) return 0.03;  // Bronze: 3% off
  return 0.00;
}

export function calculateFinalRetailPrice(
  rawCostUsd: number, 
  exchangeRate: number, 
  currency: string = 'USD', 
  userDiscount: number = 0,
  serviceName: string = '',
  customBrandRules?: Record<string, BrandMarginRule> | null
): number {
  const nameLower = (serviceName || '').toLowerCase();
  const rules = customBrandRules && Object.keys(customBrandRules).length > 0 
    ? customBrandRules 
    : DEFAULT_BRAND_PRICE_RULES;
  
  let matchedRule: BrandMarginRule | null = null;
  for (const [key, rule] of Object.entries(rules)) {
    if (nameLower.includes(key.toLowerCase())) {
      matchedRule = rule;
      break;
    }
  }

  let retailUsd = 0;

  if (matchedRule) {
    const calculatedUsd = rawCostUsd * (matchedRule.multiplier || 1.0);
    retailUsd = Math.max(calculatedUsd, matchedRule.minPriceUsd || 0);
  } else {
    const margin = calculateTieredMargin(rawCostUsd);
    retailUsd = rawCostUsd + (rawCostUsd * margin);
  }

  // Apply VIP Discount
  retailUsd = retailUsd * (1 - userDiscount);

  if (currency === 'NGN') {
    const finalNgn = retailUsd * exchangeRate;
    return Math.ceil(finalNgn); // Always round up to nearest Naira
  }

  return Math.round(retailUsd * 100) / 100;
}
