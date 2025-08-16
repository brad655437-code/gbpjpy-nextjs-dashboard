
import type { PredictionInput } from './types';
// import { analyzeTechnicals } from '../indicators';

export interface FeatureSet {
  priceFeatures: number[];
  technicalFeatures: number[];
  volumeFeatures: number[];
  timeFeatures: number[];
  combinedFeatures: number[];
}

export interface FeatureConfig {
  sequenceLength: number;
  includeVolume: boolean;
  includeTechnicals: boolean;
  includeTimeFeatures: boolean;
  normalizationMethod: 'minmax' | 'zscore' | 'robust';
}

export class FeatureEngineer {
  private config: FeatureConfig;
  private scalingParams: {
    mean?: number[];
    std?: number[];
    min?: number[];
    max?: number[];
    median?: number[];
    iqr?: number[];
  } = {};

  constructor(config: Partial<FeatureConfig> = {}) {
    this.config = {
      sequenceLength: 30,
      includeVolume: true,
      includeTechnicals: true,
      includeTimeFeatures: true,
      normalizationMethod: 'minmax',
      ...config
    };
  }

  /**
   * Extract comprehensive feature set from market data
   */
  extractFeatures(input: PredictionInput): FeatureSet {
    const { marketData, indicators } = input;
    
    const priceFeatures = this.extractPriceFeatures(marketData);
    
    const technicalFeatures = this.config.includeTechnicals 
      ? this.extractTechnicalFeatures(indicators)
      : [];
    
    const volumeFeatures = this.config.includeVolume 
      ? this.extractVolumeFeatures(marketData)
      : [];
    
    const timeFeatures = this.config.includeTimeFeatures 
      ? this.extractTimeFeatures(marketData)
      : [];
    
    const combinedFeatures = [
      ...priceFeatures,
      ...technicalFeatures,
      ...volumeFeatures,
      ...timeFeatures
    ];

    return {
      priceFeatures,
      technicalFeatures,
      volumeFeatures,
      timeFeatures,
      combinedFeatures
    };
  }

  /**
   * Extract price-based features
   */
  private extractPriceFeatures(marketData: PredictionInput['marketData']): number[] {
    const features: number[] = [];
    const prices = marketData.map(d => d.close);
    const highs = marketData.map(d => d.high);
    const lows = marketData.map(d => d.low);
    // const opens = marketData.map(d => d.open);

    if (prices.length < 2) return features;

    const returns1 = this.calculateReturns(prices, 1);
    const returns5 = this.calculateReturns(prices, 5);
    const returns10 = this.calculateReturns(prices, 10);
    
    features.push(
      returns1[returns1.length - 1] || 0,
      returns5[returns5.length - 1] || 0,
      returns10[returns10.length - 1] || 0
    );

    const volatility5 = this.calculateRollingVolatility(prices, 5);
    const volatility10 = this.calculateRollingVolatility(prices, 10);
    const volatility20 = this.calculateRollingVolatility(prices, 20);
    
    features.push(
      volatility5[volatility5.length - 1] || 0,
      volatility10[volatility10.length - 1] || 0,
      volatility20[volatility20.length - 1] || 0
    );

    const currentHigh = highs[highs.length - 1];
    const currentLow = lows[lows.length - 1];
    const currentClose = prices[prices.length - 1];
    const hlSpread = (currentHigh - currentLow) / currentClose;
    
    features.push(hlSpread);

    const pricePosition = (currentClose - currentLow) / (currentHigh - currentLow);
    features.push(isNaN(pricePosition) ? 0.5 : pricePosition);

    const ma5 = this.calculateMovingAverage(prices, 5);
    const ma10 = this.calculateMovingAverage(prices, 10);
    const ma20 = this.calculateMovingAverage(prices, 20);
    
    if (ma5.length > 0 && ma10.length > 0 && ma20.length > 0) {
      const currentMA5 = ma5[ma5.length - 1];
      const currentMA10 = ma10[ma10.length - 1];
      const currentMA20 = ma20[ma20.length - 1];
      
      features.push(
        (currentClose - currentMA5) / currentClose,
        (currentClose - currentMA10) / currentClose,
        (currentClose - currentMA20) / currentClose,
        (currentMA5 - currentMA10) / currentMA5,
        (currentMA10 - currentMA20) / currentMA10
      );
    }

    const momentum5 = prices.length >= 5 ? (currentClose - prices[prices.length - 6]) / prices[prices.length - 6] : 0;
    const momentum10 = prices.length >= 10 ? (currentClose - prices[prices.length - 11]) / prices[prices.length - 11] : 0;
    
    features.push(momentum5, momentum10);

    return features;
  }

  /**
   * Extract technical indicator features
   */
  private extractTechnicalFeatures(indicators: PredictionInput['indicators']): number[] {
    const features: number[] = [];

    if (indicators.ichimoku) {
      const ich = indicators.ichimoku;
      features.push(
        ich.tenkanSen,
        ich.kijunSen,
        ich.senkouSpanA,
        ich.senkouSpanB,
        ich.chikouSpan,
        ich.signal === 'BULLISH' ? 1 : ich.signal === 'BEARISH' ? -1 : 0
      );
    } else {
      features.push(0, 0, 0, 0, 0, 0); // Placeholder values
    }

    features.push(
      indicators.rsi.value / 100,
      indicators.rsi.signal === 'OVERBOUGHT' ? 1 : indicators.rsi.signal === 'OVERSOLD' ? -1 : 0
    );

    if (indicators.macd) {
      const macd = indicators.macd;
      features.push(
        macd.macd,
        macd.signal,
        macd.histogram,
        macd.signalType === 'BULLISH' ? 1 : macd.signalType === 'BEARISH' ? -1 : 0
      );
    } else {
      features.push(0, 0, 0, 0);
    }

    if (indicators.bollinger) {
      const bb = indicators.bollinger;
      features.push(
        bb.upperBand,
        bb.middleBand,
        bb.lowerBand,
        bb.bandwidth,
        bb.squeeze ? 1 : 0,
        bb.signal === 'BULLISH' ? 1 : bb.signal === 'BEARISH' ? -1 : 0
      );
    } else {
      features.push(0, 0, 0, 0, 0, 0);
    }

    if (indicators.fibonacci) {
      const fib = indicators.fibonacci;
      features.push(
        fib.swingHigh,
        fib.swingLow,
        fib.levels.level236,
        fib.levels.level382,
        fib.levels.level500,
        fib.levels.level618,
        fib.levels.level786,
        fib.signal === 'SUPPORT' ? 1 : fib.signal === 'RESISTANCE' ? -1 : 0
      );
    } else {
      features.push(0, 0, 0, 0, 0, 0, 0, 0);
    }

    if (indicators.volume) {
      const vol = indicators.volume;
      features.push(
        vol.volumeMA,
        vol.volumeOscillator,
        vol.volumeTrend === 'INCREASING' ? 1 : vol.volumeTrend === 'DECREASING' ? -1 : 0,
        vol.signal === 'BULLISH' ? 1 : vol.signal === 'BEARISH' ? -1 : 0
      );
    } else {
      features.push(0, 0, 0, 0);
    }

    return features;
  }

  /**
   * Extract volume-based features
   */
  private extractVolumeFeatures(marketData: PredictionInput['marketData']): number[] {
    const features: number[] = [];
    const volumes = marketData.map(d => d.volume || 0).filter(v => v > 0);
    
    if (volumes.length === 0) return [0, 0, 0, 0, 0];

    const prices = marketData.map(d => d.close);
    
    const volumeMA5 = this.calculateMovingAverage(volumes, 5);
    const volumeMA10 = this.calculateMovingAverage(volumes, 10);
    const volumeMA20 = this.calculateMovingAverage(volumes, 20);
    
    const currentVolume = volumes[volumes.length - 1];
    const currentVolumeMA5 = volumeMA5[volumeMA5.length - 1] || currentVolume;
    const currentVolumeMA10 = volumeMA10[volumeMA10.length - 1] || currentVolume;
    const currentVolumeMA20 = volumeMA20[volumeMA20.length - 1] || currentVolume;
    
    features.push(
      currentVolume / currentVolumeMA5,
      currentVolume / currentVolumeMA10,
      currentVolume / currentVolumeMA20
    );

    if (volumes.length >= 2 && prices.length >= 2) {
      const volumeChange = (currentVolume - volumes[volumes.length - 2]) / volumes[volumes.length - 2];
      const priceChange = (prices[prices.length - 1] - prices[prices.length - 2]) / prices[prices.length - 2];
      
      const vpCorrelation = volumeChange * priceChange;
      features.push(vpCorrelation);
    } else {
      features.push(0);
    }

    const volumeVolatility = this.calculateRollingVolatility(volumes, 10);
    features.push(volumeVolatility[volumeVolatility.length - 1] || 0);

    return features;
  }

  /**
   * Extract time-based features
   */
  private extractTimeFeatures(marketData: PredictionInput['marketData']): number[] {
    const features: number[] = [];
    
    if (marketData.length === 0) return features;
    
    const currentDate = marketData[marketData.length - 1].date;
    
    const dayOfWeek = currentDate.getDay() / 6;
    features.push(dayOfWeek);
    
    const hourOfDay = currentDate.getHours() / 23;
    features.push(hourOfDay);
    
    const dayOfMonth = (currentDate.getDate() - 1) / 30;
    features.push(dayOfMonth);
    
    const monthOfYear = currentDate.getMonth() / 11;
    features.push(monthOfYear);
    
    const quarter = Math.floor(currentDate.getMonth() / 3) / 3;
    features.push(quarter);

    return features;
  }

  /**
   * Calculate returns for different periods
   */
  private calculateReturns(prices: number[], period: number): number[] {
    const returns: number[] = [];
    
    for (let i = period; i < prices.length; i++) {
      const returnValue = (prices[i] - prices[i - period]) / prices[i - period];
      returns.push(returnValue);
    }
    
    return returns;
  }

  /**
   * Calculate rolling volatility (standard deviation)
   */
  private calculateRollingVolatility(prices: number[], window: number): number[] {
    const volatilities: number[] = [];
    
    for (let i = window - 1; i < prices.length; i++) {
      const windowPrices = prices.slice(i - window + 1, i + 1);
      const returns = this.calculateReturns(windowPrices, 1);
      
      if (returns.length > 0) {
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        volatilities.push(Math.sqrt(variance));
      } else {
        volatilities.push(0);
      }
    }
    
    return volatilities;
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(values: number[], window: number): number[] {
    const averages: number[] = [];
    
    for (let i = window - 1; i < values.length; i++) {
      const windowValues = values.slice(i - window + 1, i + 1);
      const average = windowValues.reduce((sum, val) => sum + val, 0) / window;
      averages.push(average);
    }
    
    return averages;
  }

  /**
   * Normalize features using specified method
   */
  normalizeFeatures(features: number[][], method?: 'minmax' | 'zscore' | 'robust'): number[][] {
    const normMethod = method || this.config.normalizationMethod;
    
    if (features.length === 0) return features;
    
    const numFeatures = features[0].length;
    const normalizedFeatures: number[][] = [];
    
    if (Object.keys(this.scalingParams).length === 0) {
      this.calculateScalingParams(features, normMethod);
    }
    
    for (const featureRow of features) {
      const normalizedRow: number[] = [];
      
      for (let i = 0; i < numFeatures; i++) {
        const value = featureRow[i];
        let normalizedValue: number;
        
        switch (normMethod) {
          case 'minmax':
            const min = this.scalingParams.min![i];
            const max = this.scalingParams.max![i];
            normalizedValue = max > min ? (value - min) / (max - min) : 0.5;
            break;
            
          case 'zscore':
            const mean = this.scalingParams.mean![i];
            const std = this.scalingParams.std![i];
            normalizedValue = std > 0 ? (value - mean) / std : 0;
            break;
            
          case 'robust':
            const median = this.scalingParams.median![i];
            const iqr = this.scalingParams.iqr![i];
            normalizedValue = iqr > 0 ? (value - median) / iqr : 0;
            break;
            
          default:
            normalizedValue = value;
        }
        
        normalizedRow.push(normalizedValue);
      }
      
      normalizedFeatures.push(normalizedRow);
    }
    
    return normalizedFeatures;
  }

  /**
   * Calculate scaling parameters for normalization
   */
  private calculateScalingParams(features: number[][], method: 'minmax' | 'zscore' | 'robust'): void {
    if (features.length === 0) return;
    
    const numFeatures = features[0].length;
    
    switch (method) {
      case 'minmax':
        this.scalingParams.min = [];
        this.scalingParams.max = [];
        
        for (let i = 0; i < numFeatures; i++) {
          const column = features.map(row => row[i]);
          this.scalingParams.min.push(Math.min(...column));
          this.scalingParams.max.push(Math.max(...column));
        }
        break;
        
      case 'zscore':
        this.scalingParams.mean = [];
        this.scalingParams.std = [];
        
        for (let i = 0; i < numFeatures; i++) {
          const column = features.map(row => row[i]);
          const mean = column.reduce((sum, val) => sum + val, 0) / column.length;
          const variance = column.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / column.length;
          
          this.scalingParams.mean.push(mean);
          this.scalingParams.std.push(Math.sqrt(variance));
        }
        break;
        
      case 'robust':
        this.scalingParams.median = [];
        this.scalingParams.iqr = [];
        
        for (let i = 0; i < numFeatures; i++) {
          const column = features.map(row => row[i]).sort((a, b) => a - b);
          const median = this.calculateMedian(column);
          const q1 = this.calculatePercentile(column, 25);
          const q3 = this.calculatePercentile(column, 75);
          
          this.scalingParams.median.push(median);
          this.scalingParams.iqr.push(q3 - q1);
        }
        break;
    }
  }

  /**
   * Calculate median of sorted array
   */
  private calculateMedian(sortedArray: number[]): number {
    const mid = Math.floor(sortedArray.length / 2);
    return sortedArray.length % 2 === 0
      ? (sortedArray[mid - 1] + sortedArray[mid]) / 2
      : sortedArray[mid];
  }

  /**
   * Calculate percentile of sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Create sequences for LSTM training
   */
  createSequences(features: number[][], labels: number[], sequenceLength?: number): {
    sequences: number[][][];
    sequenceLabels: number[];
  } {
    const seqLength = sequenceLength || this.config.sequenceLength;
    const sequences: number[][][] = [];
    const sequenceLabels: number[] = [];
    
    for (let i = seqLength; i < features.length; i++) {
      const sequence = features.slice(i - seqLength, i);
      sequences.push(sequence);
      sequenceLabels.push(labels[i]);
    }
    
    return { sequences, sequenceLabels };
  }

  /**
   * Get feature names for interpretability
   */
  getFeatureNames(): string[] {
    const names: string[] = [];
    
    names.push(
      'return_1d', 'return_5d', 'return_10d',
      'volatility_5d', 'volatility_10d', 'volatility_20d',
      'hl_spread', 'price_position',
      'price_vs_ma5', 'price_vs_ma10', 'price_vs_ma20',
      'ma5_vs_ma10', 'ma10_vs_ma20',
      'momentum_5d', 'momentum_10d'
    );
    
    if (this.config.includeTechnicals) {
      names.push(
        'ichimoku_tenkan', 'ichimoku_kijun', 'ichimoku_senkou_a', 'ichimoku_senkou_b', 'ichimoku_chikou', 'ichimoku_signal',
        'rsi_value', 'rsi_signal',
        'macd_line', 'macd_signal', 'macd_histogram', 'macd_signal_type',
        'bb_upper', 'bb_middle', 'bb_lower', 'bb_bandwidth', 'bb_squeeze', 'bb_signal',
        'fib_swing_high', 'fib_swing_low', 'fib_236', 'fib_382', 'fib_500', 'fib_618', 'fib_786', 'fib_signal',
        'volume_ma', 'volume_oscillator', 'volume_trend', 'volume_signal'
      );
    }
    
    if (this.config.includeVolume) {
      names.push(
        'volume_vs_ma5', 'volume_vs_ma10', 'volume_vs_ma20',
        'volume_price_correlation', 'volume_volatility'
      );
    }
    
    if (this.config.includeTimeFeatures) {
      names.push(
        'day_of_week', 'hour_of_day', 'day_of_month', 'month_of_year', 'quarter'
      );
    }
    
    return names;
  }
}

export const defaultFeatureEngineer = new FeatureEngineer();
