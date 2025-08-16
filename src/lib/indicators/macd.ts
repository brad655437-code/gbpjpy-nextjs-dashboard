export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
  signalType: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);
  
  for (let i = period; i < prices.length; i++) {
    const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
    ema.push(currentEMA);
  }
  
  return ema;
}

export function calculateMACD(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): MACDData | null {
  if (prices.length < slowPeriod + signalPeriod) {
    return null;
  }
  
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  if (fastEMA.length === 0 || slowEMA.length === 0) {
    return null;
  }
  
  const macdLine: number[] = [];
  const startIndex = slowPeriod - fastPeriod;
  
  for (let i = 0; i < slowEMA.length; i++) {
    const fastValue = fastEMA[i + startIndex];
    const slowValue = slowEMA[i];
    macdLine.push(fastValue - slowValue);
  }
  
  const signalEMA = calculateEMA(macdLine, signalPeriod);
  
  if (signalEMA.length === 0) {
    return null;
  }
  
  const currentMACD = macdLine[macdLine.length - 1];
  const currentSignal = signalEMA[signalEMA.length - 1];
  const histogram = currentMACD - currentSignal;
  
  const signalType = generateMACDSignal(currentMACD, currentSignal, histogram);
  
  return {
    macd: Number(currentMACD.toFixed(4)),
    signal: Number(currentSignal.toFixed(4)),
    histogram: Number(histogram.toFixed(4)),
    signalType
  };
}

export function generateMACDSignal(
  macd: number, 
  signal: number, 
  histogram: number
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (macd > signal && histogram > 0) {
    return 'BULLISH';
  } else if (macd < signal && histogram < 0) {
    return 'BEARISH';
  } else {
    return 'NEUTRAL';
  }
}

export function calculateMACDSeries(
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): MACDData[] {
  const results: MACDData[] = [];
  const minLength = slowPeriod + signalPeriod;
  
  for (let i = minLength; i <= prices.length; i++) {
    const subset = prices.slice(0, i);
    const macd = calculateMACD(subset, fastPeriod, slowPeriod, signalPeriod);
    if (macd) {
      results.push(macd);
    }
  }
  
  return results;
}
