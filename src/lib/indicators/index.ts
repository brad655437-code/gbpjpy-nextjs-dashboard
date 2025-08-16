

import {
  calculateTenkanSen,
  calculateKijunSen,
  calculateSenkouSpanA,
  calculateSenkouSpanB,
  calculateChikouSpan,
  generateIchimokuSignal,
  calculateIchimoku,
  calculateIchimokuSeries,
  type IchimokuData,
  type PriceData
} from './ichimoku';

import {
  calculateRSI,
  calculateRSIWilder,
  generateRSISignal,
  calculateRSIWithSignal,
  calculateRSISeries,
  detectRSIDivergence,
  type RSIData
} from './rsi';

import {
  calculateMACD,
  calculateMACDSeries,
  generateMACDSignal,
  type MACDData
} from './macd';

import {
  calculateBollingerBands,
  calculateBollingerSeries,
  generateBollingerSignal,
  type BollingerData
} from './bollinger';

import {
  calculateFibonacci,
  calculateFibonacciSeries,
  generateFibonacciSignal,
  type FibonacciData
} from './fibonacci';

import {
  calculateVolumeAnalysis,
  calculateVolumeSeries,
  generateVolumeSignal,
  type VolumeData
} from './volume';

export {
  calculateTenkanSen,
  calculateKijunSen,
  calculateSenkouSpanA,
  calculateSenkouSpanB,
  calculateChikouSpan,
  generateIchimokuSignal,
  calculateIchimoku,
  calculateIchimokuSeries,
  calculateRSI,
  calculateRSIWilder,
  generateRSISignal,
  calculateRSIWithSignal,
  calculateRSISeries,
  detectRSIDivergence,
  calculateMACD,
  calculateMACDSeries,
  generateMACDSignal,
  calculateBollingerBands,
  calculateBollingerSeries,
  generateBollingerSignal,
  calculateFibonacci,
  calculateFibonacciSeries,
  generateFibonacciSignal,
  calculateVolumeAnalysis,
  calculateVolumeSeries,
  generateVolumeSignal
};

export type { IchimokuData, PriceData, RSIData, MACDData, BollingerData, FibonacciData, VolumeData };

export interface TechnicalAnalysis {
  ichimoku: IchimokuData | null;
  rsi: RSIData;
  macd: MACDData | null;
  bollinger: BollingerData | null;
  fibonacci: FibonacciData | null;
  volume: VolumeData | null;
  combinedSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  confidence: number;
}

/**
 * Combine Ichimoku and RSI signals for comprehensive analysis
 */
export function analyzeTechnicals(
  prices: { high: number; low: number; close: number; volume?: number }[],
  period: number = 14
): TechnicalAnalysis {
  const ichimoku = calculateIchimoku(prices);
  const closePrices = prices.map(p => p.close);
  const volumes = prices.map(p => p.volume || 0).filter(v => v > 0);
  const rsi = calculateRSIWithSignal(closePrices, period);
  const macd = calculateMACD(closePrices);
  const bollinger = calculateBollingerBands(closePrices);
  const fibonacci = calculateFibonacci(prices);
  const volume = volumes.length > 0 ? calculateVolumeAnalysis(volumes, closePrices) : null;
  
  let combinedSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' = 'NEUTRAL';
  let confidence = 0.5;
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  let totalSignals = 0;
  
  if (ichimoku) {
    totalSignals++;
    if (ichimoku.signal === 'BULLISH') bullishSignals++;
    else if (ichimoku.signal === 'BEARISH') bearishSignals++;
  }
  
  totalSignals++;
  if (rsi.signal === 'OVERSOLD') bullishSignals++;
  else if (rsi.signal === 'OVERBOUGHT') bearishSignals++;
  
  if (macd) {
    totalSignals++;
    if (macd.signalType === 'BULLISH') bullishSignals++;
    else if (macd.signalType === 'BEARISH') bearishSignals++;
  }
  
  if (bollinger) {
    totalSignals++;
    if (bollinger.signal === 'BULLISH') bullishSignals++;
    else if (bollinger.signal === 'BEARISH') bearishSignals++;
  }
  
  if (fibonacci) {
    totalSignals++;
    if (fibonacci.signal === 'SUPPORT') bullishSignals++;
    else if (fibonacci.signal === 'RESISTANCE') bearishSignals++;
  }
  
  if (volume) {
    totalSignals++;
    if (volume.signal === 'BULLISH') bullishSignals++;
    else if (volume.signal === 'BEARISH') bearishSignals++;
  }
  
  const bullishRatio = bullishSignals / totalSignals;
  const bearishRatio = bearishSignals / totalSignals;
  
  if (bullishRatio >= 0.7) {
    combinedSignal = 'STRONG_BUY';
    confidence = 0.8 + (bullishRatio - 0.7) * 0.5;
  } else if (bullishRatio >= 0.5) {
    combinedSignal = 'BUY';
    confidence = 0.6 + (bullishRatio - 0.5) * 0.4;
  } else if (bearishRatio >= 0.7) {
    combinedSignal = 'STRONG_SELL';
    confidence = 0.8 + (bearishRatio - 0.7) * 0.5;
  } else if (bearishRatio >= 0.5) {
    combinedSignal = 'SELL';
    confidence = 0.6 + (bearishRatio - 0.5) * 0.4;
  } else {
    combinedSignal = 'NEUTRAL';
    confidence = 0.5;
  }
  
  if (bollinger?.squeeze) {
    confidence *= 0.8;
  }
  
  if (volume?.volumeTrend === 'INCREASING' && 
      ((combinedSignal === 'BUY' || combinedSignal === 'STRONG_BUY') ||
       (combinedSignal === 'SELL' || combinedSignal === 'STRONG_SELL'))) {
    confidence *= 1.1;
  }
  
  confidence = Math.min(confidence, 0.95);
  confidence = Math.max(confidence, 0.3);
  
  return {
    ichimoku,
    rsi,
    macd,
    bollinger,
    fibonacci,
    volume,
    combinedSignal,
    confidence: Number(confidence.toFixed(3))
  };
}
