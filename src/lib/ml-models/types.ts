
export interface PredictionInput {
  marketData: {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }[];
  indicators: {
    ichimoku: {
      tenkanSen: number;
      kijunSen: number;
      senkouSpanA: number;
      senkouSpanB: number;
      chikouSpan: number;
      signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    } | null;
    rsi: {
      value: number;
      signal: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
    };
  };
}

export interface PredictionOutput {
  date: Date;
  predictedPrice: number;
  direction: 'UP' | 'DOWN';
  confidence: number;
  reasoning: string;
  ichimokuSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  rsiValue: number;
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  avgConfidence: number;
  profitLoss: number;
  maxDrawdown: number;
  winRate: number;
  sharpeRatio?: number;
  lastUpdated: Date;
}

export interface TrainingData {
  features: number[][];
  labels: number[];
  dates: Date[];
}

export interface ModelConfig {
  name: string;
  version: string;
  strategy: 'ICHIMOKU_RSI' | 'COMBINED' | 'CUSTOM';
  parameters: {
    ichimokuPeriods: {
      tenkan: number;
      kijun: number;
      senkou: number;
    };
    rsiPeriod: number;
    confidenceThreshold: number;
    riskTolerance: number;
  };
  lastTrained: Date;
  isActive: boolean;
}

export interface BacktestResult {
  startDate: Date;
  endDate: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  avgWinAmount: number;
  avgLossAmount: number;
  profitFactor: number;
}

export interface PredictionHistory {
  id: string;
  date: Date;
  predictedPrice: number;
  actualPrice?: number;
  direction: 'UP' | 'DOWN';
  confidence: number;
  isCorrect?: boolean;
  profitLoss?: number;
  ichimokuSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  rsiValue: number;
  createdAt: Date;
}

export interface ModelState {
  isTraining: boolean;
  lastPrediction?: PredictionOutput;
  performance: ModelPerformanceMetrics;
  config: ModelConfig;
  recentPredictions: PredictionHistory[];
}
