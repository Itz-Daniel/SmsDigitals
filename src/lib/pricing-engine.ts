export function calculateTieredMargin(rawCostUsd: number): number {
  if (rawCostUsd < 0.50) {
    return 1.0; // 100% margin on cheap numbers (e.g., $0.20 -> $0.40)
  }
  if (rawCostUsd <= 2.00) {
    return 0.50; // 50% margin on medium numbers (e.g., $1.00 -> $1.50)
  }
  return 0.25; // 25% margin on expensive numbers (e.g., $5.00 -> $6.25)
}

export function calculateFinalRetailPrice(rawCostUsd: number, exchangeRate: number, currency: string = 'USD'): number {
  const margin = calculateTieredMargin(rawCostUsd);
  const retailUsd = rawCostUsd + (rawCostUsd * margin);
  
  if (currency === 'NGN') {
    const finalNgn = retailUsd * exchangeRate;
    return Math.ceil(finalNgn); // Always round up to nearest Naira
  }
  
  return Math.round(retailUsd * 100) / 100; // Round to 2 decimal places for USD
}
