
export interface RSIData {
  value: number;
  signal: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
}

/**
 * Calculate RSI for a given array of closing prices
 * @param prices Array of closing prices (most recent last)
 * @param period RSI period (default 14)
 * @returns RSI value between 0 and 100
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // Return neutral value if insufficient data
  }
  
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  const recentChanges = changes.slice(-period);
  
  let totalGains = 0;
  let totalLosses = 0;
  
  recentChanges.forEach(change => {
    if (change > 0) {
      totalGains += change;
    } else {
      totalLosses += Math.abs(change);
    }
  });
  
  const avgGain = totalGains / period;
  const avgLoss = totalLosses / period;
  
  if (avgLoss === 0) {
    return 100;
  }
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return Number(rsi.toFixed(2));
}

/**
 * Calculate RSI with Wilder's smoothing method (more accurate)
 * This is the traditional RSI calculation method
 */
export function calculateRSIWilder(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50;
  }
  
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  if (changes.length < period) {
    return 50;
  }
  
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
  }
  
  if (avgLoss === 0) {
    return 100;
  }
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return Number(rsi.toFixed(2));
}

/**
 * Generate RSI trading signal based on overbought/oversold levels
 */
export function generateRSISignal(
  rsi: number,
  overboughtLevel: number = 70,
  oversoldLevel: number = 30
): 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL' {
  if (rsi >= overboughtLevel) {
    return 'OVERBOUGHT';
  } else if (rsi <= oversoldLevel) {
    return 'OVERSOLD';
  } else {
    return 'NEUTRAL';
  }
}

/**
 * Calculate RSI with signal interpretation
 */
export function calculateRSIWithSignal(
  prices: number[],
  period: number = 14,
  overboughtLevel: number = 70,
  oversoldLevel: number = 30
): RSIData {
  const rsi = calculateRSIWilder(prices, period);
  const signal = generateRSISignal(rsi, overboughtLevel, oversoldLevel);
  
  return {
    value: rsi,
    signal
  };
}

/**
 * Calculate RSI for multiple periods (useful for historical analysis)
 */
export function calculateRSISeries(
  prices: number[],
  period: number = 14
): number[] {
  const results: number[] = [];
  
  for (let i = period; i <= prices.length; i++) {
    const subset = prices.slice(0, i);
    const rsi = calculateRSIWilder(subset, period);
    results.push(rsi);
  }
  
  return results;
}

/**
 * Calculate RSI divergence (useful for advanced analysis)
 * Returns true if there's a bullish or bearish divergence
 */
export function detectRSIDivergence(
  prices: number[],
  rsiValues: number[],
  lookbackPeriod: number = 5
): {
  bullishDivergence: boolean;
  bearishDivergence: boolean;
} {
  if (prices.length < lookbackPeriod * 2 || rsiValues.length < lookbackPeriod * 2) {
    return { bullishDivergence: false, bearishDivergence: false };
  }
  
  const recentPrices = prices.slice(-lookbackPeriod);
  const recentRSI = rsiValues.slice(-lookbackPeriod);
  const previousPrices = prices.slice(-lookbackPeriod * 2, -lookbackPeriod);
  const previousRSI = rsiValues.slice(-lookbackPeriod * 2, -lookbackPeriod);
  
  const recentPriceMin = Math.min(...recentPrices);
  const recentPriceMax = Math.max(...recentPrices);
  const recentRSIMin = Math.min(...recentRSI);
  const recentRSIMax = Math.max(...recentRSI);
  
  const previousPriceMin = Math.min(...previousPrices);
  const previousPriceMax = Math.max(...previousPrices);
  const previousRSIMin = Math.min(...previousRSI);
  const previousRSIMax = Math.max(...previousRSI);
  
  const bullishDivergence = recentPriceMin < previousPriceMin && recentRSIMin > previousRSIMin;
  
  const bearishDivergence = recentPriceMax > previousPriceMax && recentRSIMax < previousRSIMax;
  
  return { bullishDivergence, bearishDivergence };
}
