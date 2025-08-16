
export interface IchimokuData {
  tenkanSen: number;      // Conversion Line (9-period)
  kijunSen: number;       // Base Line (26-period)
  senkouSpanA: number;    // Leading Span A
  senkouSpanB: number;    // Leading Span B
  chikouSpan: number;     // Lagging Span
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface PriceData {
  high: number;
  low: number;
  close: number;
}

/**
 * Calculate Tenkan-sen (Conversion Line)
 * Formula: (9-period high + 9-period low) / 2
 */
export function calculateTenkanSen(prices: PriceData[], period: number = 9): number {
  if (prices.length < period) return 0;
  
  const recentPrices = prices.slice(-period);
  const high = Math.max(...recentPrices.map(p => p.high));
  const low = Math.min(...recentPrices.map(p => p.low));
  
  return (high + low) / 2;
}

/**
 * Calculate Kijun-sen (Base Line)
 * Formula: (26-period high + 26-period low) / 2
 */
export function calculateKijunSen(prices: PriceData[], period: number = 26): number {
  if (prices.length < period) return 0;
  
  const recentPrices = prices.slice(-period);
  const high = Math.max(...recentPrices.map(p => p.high));
  const low = Math.min(...recentPrices.map(p => p.low));
  
  return (high + low) / 2;
}

/**
 * Calculate Senkou Span A (Leading Span A)
 * Formula: (Tenkan-sen + Kijun-sen) / 2, projected 26 periods ahead
 */
export function calculateSenkouSpanA(tenkanSen: number, kijunSen: number): number {
  return (tenkanSen + kijunSen) / 2;
}

/**
 * Calculate Senkou Span B (Leading Span B)
 * Formula: (52-period high + 52-period low) / 2, projected 26 periods ahead
 */
export function calculateSenkouSpanB(prices: PriceData[], period: number = 52): number {
  if (prices.length < period) return 0;
  
  const recentPrices = prices.slice(-period);
  const high = Math.max(...recentPrices.map(p => p.high));
  const low = Math.min(...recentPrices.map(p => p.low));
  
  return (high + low) / 2;
}

/**
 * Calculate Chikou Span (Lagging Span)
 * Formula: Current closing price, plotted 26 periods back
 */
export function calculateChikouSpan(currentClose: number): number {
  return currentClose;
}

/**
 * Generate Ichimoku trading signal based on price position relative to cloud
 * and line crossovers
 */
export function generateIchimokuSignal(
  currentPrice: number,
  tenkanSen: number,
  kijunSen: number,
  senkouSpanA: number,
  senkouSpanB: number
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const cloudTop = Math.max(senkouSpanA, senkouSpanB);
  const cloudBottom = Math.min(senkouSpanA, senkouSpanB);
  
  if (currentPrice > cloudTop && tenkanSen > kijunSen) {
    return 'BULLISH';
  }
  
  if (currentPrice < cloudBottom && tenkanSen < kijunSen) {
    return 'BEARISH';
  }
  
  if (currentPrice > cloudTop) {
    return 'BULLISH';
  }
  
  if (currentPrice < cloudBottom) {
    return 'BEARISH';
  }
  
  return 'NEUTRAL';
}

/**
 * Calculate complete Ichimoku Cloud data for given price history
 */
export function calculateIchimoku(prices: PriceData[]): IchimokuData | null {
  if (prices.length < 52) {
    return null; // Need at least 52 periods for full calculation
  }
  
  const tenkanSen = calculateTenkanSen(prices);
  const kijunSen = calculateKijunSen(prices);
  const senkouSpanA = calculateSenkouSpanA(tenkanSen, kijunSen);
  const senkouSpanB = calculateSenkouSpanB(prices);
  const chikouSpan = calculateChikouSpan(prices[prices.length - 1].close);
  
  const signal = generateIchimokuSignal(
    prices[prices.length - 1].close,
    tenkanSen,
    kijunSen,
    senkouSpanA,
    senkouSpanB
  );
  
  return {
    tenkanSen: Number(tenkanSen.toFixed(3)),
    kijunSen: Number(kijunSen.toFixed(3)),
    senkouSpanA: Number(senkouSpanA.toFixed(3)),
    senkouSpanB: Number(senkouSpanB.toFixed(3)),
    chikouSpan: Number(chikouSpan.toFixed(3)),
    signal
  };
}

/**
 * Calculate Ichimoku for multiple periods (useful for historical analysis)
 */
export function calculateIchimokuSeries(prices: PriceData[]): IchimokuData[] {
  const results: IchimokuData[] = [];
  
  for (let i = 52; i <= prices.length; i++) {
    const subset = prices.slice(0, i);
    const ichimoku = calculateIchimoku(subset);
    if (ichimoku) {
      results.push(ichimoku);
    }
  }
  
  return results;
}
