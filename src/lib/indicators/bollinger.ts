export interface BollingerData {
  upperBand: number;
  middleBand: number;
  lowerBand: number;
  bandwidth: number;
  squeeze: boolean;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  
  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((acc, price) => acc + price, 0);
  return sum / period;
}

export function calculateStandardDeviation(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  
  const recentPrices = prices.slice(-period);
  const mean = calculateSMA(recentPrices, period);
  
  const squaredDifferences = recentPrices.map(price => Math.pow(price - mean, 2));
  const variance = squaredDifferences.reduce((acc, diff) => acc + diff, 0) / period;
  
  return Math.sqrt(variance);
}

export function calculateBollingerBands(
  prices: number[], 
  period: number = 20, 
  stdDev: number = 2
): BollingerData | null {
  if (prices.length < period) {
    return null;
  }
  
  const middleBand = calculateSMA(prices, period);
  const standardDeviation = calculateStandardDeviation(prices, period);
  
  const upperBand = middleBand + (standardDeviation * stdDev);
  const lowerBand = middleBand - (standardDeviation * stdDev);
  
  const bandwidth = ((upperBand - lowerBand) / middleBand) * 100;
  const squeeze = bandwidth < 10;
  
  const currentPrice = prices[prices.length - 1];
  const signal = generateBollingerSignal(currentPrice, upperBand, middleBand, lowerBand, squeeze);
  
  return {
    upperBand: Number(upperBand.toFixed(3)),
    middleBand: Number(middleBand.toFixed(3)),
    lowerBand: Number(lowerBand.toFixed(3)),
    bandwidth: Number(bandwidth.toFixed(2)),
    squeeze,
    signal
  };
}

export function generateBollingerSignal(
  currentPrice: number,
  upperBand: number,
  middleBand: number,
  lowerBand: number,
  squeeze: boolean
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (squeeze) {
    return 'NEUTRAL';
  }
  
  if (currentPrice <= lowerBand) {
    return 'BULLISH';
  } else if (currentPrice >= upperBand) {
    return 'BEARISH';
  } else if (currentPrice > middleBand) {
    return 'BULLISH';
  } else if (currentPrice < middleBand) {
    return 'BEARISH';
  } else {
    return 'NEUTRAL';
  }
}

export function calculateBollingerSeries(
  prices: number[], 
  period: number = 20, 
  stdDev: number = 2
): BollingerData[] {
  const results: BollingerData[] = [];
  
  for (let i = period; i <= prices.length; i++) {
    const subset = prices.slice(0, i);
    const bollinger = calculateBollingerBands(subset, period, stdDev);
    if (bollinger) {
      results.push(bollinger);
    }
  }
  
  return results;
}
