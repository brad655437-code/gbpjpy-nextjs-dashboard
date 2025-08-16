

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
  detectRSIDivergence
};

export type { IchimokuData, PriceData, RSIData };

export interface TechnicalAnalysis {
  ichimoku: IchimokuData | null;
  rsi: RSIData;
  combinedSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  confidence: number;
}

/**
 * Combine Ichimoku and RSI signals for comprehensive analysis
 */
export function analyzeTechnicals(
  prices: { high: number; low: number; close: number }[],
  period: number = 14
): TechnicalAnalysis {
  const ichimoku = calculateIchimoku(prices);
  const closePrices = prices.map(p => p.close);
  const rsi = calculateRSIWithSignal(closePrices, period);
  
  let combinedSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' = 'NEUTRAL';
  let confidence = 0.5;
  
  if (ichimoku) {
    if (ichimoku.signal === 'BULLISH' && rsi.signal === 'OVERSOLD') {
      combinedSignal = 'STRONG_BUY';
      confidence = 0.85;
    } else if (ichimoku.signal === 'BEARISH' && rsi.signal === 'OVERBOUGHT') {
      combinedSignal = 'STRONG_SELL';
      confidence = 0.85;
    }
    else if (ichimoku.signal === 'BULLISH' && rsi.signal === 'NEUTRAL') {
      combinedSignal = 'BUY';
      confidence = 0.65;
    } else if (ichimoku.signal === 'BEARISH' && rsi.signal === 'NEUTRAL') {
      combinedSignal = 'SELL';
      confidence = 0.65;
    }
    else if (ichimoku.signal === 'BULLISH' && rsi.signal === 'OVERBOUGHT') {
      combinedSignal = 'NEUTRAL';
      confidence = 0.45;
    } else if (ichimoku.signal === 'BEARISH' && rsi.signal === 'OVERSOLD') {
      combinedSignal = 'NEUTRAL';
      confidence = 0.45;
    }
    else if (ichimoku.signal === 'NEUTRAL' && rsi.signal === 'OVERSOLD') {
      combinedSignal = 'BUY';
      confidence = 0.55;
    } else if (ichimoku.signal === 'NEUTRAL' && rsi.signal === 'OVERBOUGHT') {
      combinedSignal = 'SELL';
      confidence = 0.55;
    }
  } else {
    if (rsi.signal === 'OVERSOLD') {
      combinedSignal = 'BUY';
      confidence = 0.55;
    } else if (rsi.signal === 'OVERBOUGHT') {
      combinedSignal = 'SELL';
      confidence = 0.55;
    }
  }
  
  return {
    ichimoku,
    rsi,
    combinedSignal,
    confidence: Number(confidence.toFixed(3))
  };
}
