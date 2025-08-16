
import { analyzeTechnicals, type IchimokuData, type RSIData } from '../indicators';
import type {
  PredictionInput,
  PredictionOutput,
  ModelPerformanceMetrics,
  PredictionHistory,
  ModelConfig,
  BacktestResult
} from './types';

export class MockMLPredictor {
  private config: ModelConfig;
  private performance: ModelPerformanceMetrics;
  private predictionHistory: PredictionHistory[] = [];
  private isLearning: boolean = false;

  constructor() {
    this.config = {
      name: 'Ichimoku-RSI Predictor',
      version: '1.0.0',
      strategy: 'ICHIMOKU_RSI',
      parameters: {
        ichimokuPeriods: {
          tenkan: 9,
          kijun: 26,
          senkou: 52
        },
        rsiPeriod: 14,
        confidenceThreshold: 0.6,
        riskTolerance: 0.02
      },
      lastTrained: new Date(),
      isActive: true
    };

    this.performance = {
      accuracy: 72.5,
      totalPredictions: 0,
      correctPredictions: 0,
      avgConfidence: 0.68,
      profitLoss: 0,
      maxDrawdown: 0,
      winRate: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Generate a prediction based on current market data and technical indicators
   */
  predict(input: PredictionInput): PredictionOutput {
    const currentPrice = input.marketData[input.marketData.length - 1].close;
    const { ichimoku, rsi } = input.indicators;

    const priceData = input.marketData.map(d => ({ high: d.high, low: d.low, close: d.close }));
    const analysis = analyzeTechnicals(priceData);
    const { combinedSignal, confidence } = analysis;

    let direction: 'UP' | 'DOWN';
    let predictedPrice: number;
    let reasoning: string;
    let finalConfidence: number;

    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 multiplier
    finalConfidence = Math.min(confidence * randomFactor, 0.95);

    if (combinedSignal === 'STRONG_BUY') {
      direction = 'UP';
      const priceChange = currentPrice * (0.005 + Math.random() * 0.015); // 0.5% to 2% increase
      predictedPrice = currentPrice + priceChange;
      reasoning = 'Strong bullish signals from both Ichimoku cloud and RSI oversold condition';
    } else if (combinedSignal === 'STRONG_SELL') {
      direction = 'DOWN';
      const priceChange = currentPrice * (0.005 + Math.random() * 0.015); // 0.5% to 2% decrease
      predictedPrice = currentPrice - priceChange;
      reasoning = 'Strong bearish signals from Ichimoku cloud and RSI overbought condition';
    } else if (combinedSignal === 'BUY') {
      direction = 'UP';
      const priceChange = currentPrice * (0.002 + Math.random() * 0.008); // 0.2% to 1% increase
      predictedPrice = currentPrice + priceChange;
      reasoning = ichimoku?.signal === 'BULLISH' 
        ? 'Ichimoku cloud shows bullish trend' 
        : 'RSI indicates oversold condition';
    } else if (combinedSignal === 'SELL') {
      direction = 'DOWN';
      const priceChange = currentPrice * (0.002 + Math.random() * 0.008); // 0.2% to 1% decrease
      predictedPrice = currentPrice - priceChange;
      reasoning = ichimoku?.signal === 'BEARISH' 
        ? 'Ichimoku cloud shows bearish trend' 
        : 'RSI indicates overbought condition';
    } else {
      const recentPrices = input.marketData.slice(-5).map(d => d.close);
      const trend = recentPrices[recentPrices.length - 1] - recentPrices[0];
      
      if (trend > 0) {
        direction = 'UP';
        predictedPrice = currentPrice + (currentPrice * 0.001 * Math.random());
      } else {
        direction = 'DOWN';
        predictedPrice = currentPrice - (currentPrice * 0.001 * Math.random());
      }
      
      reasoning = 'Mixed signals - prediction based on recent price momentum';
      finalConfidence = Math.max(finalConfidence * 0.7, 0.5); // Reduce confidence for neutral signals
    }

    const noise = (Math.random() - 0.5) * currentPrice * 0.002; // ±0.2% noise
    predictedPrice += noise;

    const prediction: PredictionOutput = {
      date: new Date(),
      predictedPrice: Number(predictedPrice.toFixed(3)),
      direction,
      confidence: Number(finalConfidence.toFixed(3)),
      reasoning,
      ichimokuSignal: ichimoku?.signal || 'NEUTRAL',
      rsiValue: rsi.value
    };

    this.simulateLearning();

    return prediction;
  }

  /**
   * Simulate model learning and performance updates
   */
  private simulateLearning(): void {
    if (Math.random() < 0.05) { // 5% chance
      this.isLearning = true;
      
      const improvement = (Math.random() - 0.5) * 2; // -1% to +1%
      this.performance.accuracy = Math.max(65, Math.min(85, this.performance.accuracy + improvement));
      this.performance.avgConfidence = Math.max(0.5, Math.min(0.9, this.performance.avgConfidence + improvement * 0.01));
      
      this.performance.lastUpdated = new Date();
      this.config.lastTrained = new Date();
      
      setTimeout(() => {
        this.isLearning = false;
      }, 2000); // Learning simulation lasts 2 seconds
    }
  }

  /**
   * Update model performance based on actual results
   */
  updatePerformance(prediction: PredictionHistory): void {
    this.predictionHistory.push(prediction);
    
    if (prediction.isCorrect !== undefined) {
      this.performance.totalPredictions++;
      if (prediction.isCorrect) {
        this.performance.correctPredictions++;
      }
      
      this.performance.accuracy = (this.performance.correctPredictions / this.performance.totalPredictions) * 100;
      this.performance.winRate = this.performance.accuracy;
      
      if (prediction.profitLoss) {
        this.performance.profitLoss += prediction.profitLoss;
      }
      
      const totalConfidence = this.predictionHistory.reduce((sum, p) => sum + p.confidence, 0);
      this.performance.avgConfidence = totalConfidence / this.predictionHistory.length;
      
      this.performance.lastUpdated = new Date();
    }
  }

  /**
   * Generate historical predictions for backtesting
   */
  generateHistoricalPredictions(
    marketData: Array<{date: Date; open: number; high: number; low: number; close: number; volume?: number}>,
    startIndex: number = 52
  ): PredictionHistory[] {
    const predictions: PredictionHistory[] = [];
    
    for (let i = startIndex; i < marketData.length - 1; i++) {
      const historicalData = marketData.slice(0, i + 1);
      const priceData = historicalData.map(d => ({ high: d.high, low: d.low, close: d.close }));
      
      const analysis = analyzeTechnicals(priceData);
      
      const input: PredictionInput = {
        marketData: historicalData,
        indicators: {
          ichimoku: analysis.ichimoku,
          rsi: analysis.rsi
        }
      };
      
      const prediction = this.predict(input);
      
      const actualPrice = marketData[i + 1].close;
      const actualDirection = actualPrice > historicalData[i].close ? 'UP' : 'DOWN';
      const isCorrect = prediction.direction === actualDirection;
      
      const profitLoss = isCorrect ? prediction.confidence * 100 : -prediction.confidence * 100;
      
      const historyEntry: PredictionHistory = {
        id: `pred_${i}_${Date.now()}`,
        date: prediction.date,
        predictedPrice: prediction.predictedPrice,
        actualPrice,
        direction: prediction.direction,
        confidence: prediction.confidence,
        isCorrect,
        profitLoss,
        ichimokuSignal: prediction.ichimokuSignal,
        rsiValue: prediction.rsiValue,
        createdAt: prediction.date
      };
      
      predictions.push(historyEntry);
      this.updatePerformance(historyEntry);
    }
    
    return predictions;
  }

  /**
   * Run backtest simulation
   */
  runBacktest(
    marketData: Array<{date: Date; open: number; high: number; low: number; close: number; volume?: number}>,
    startDate: Date,
    endDate: Date
  ): BacktestResult {
    const filteredData = marketData.filter(d => d.date >= startDate && d.date <= endDate);
    const predictions = this.generateHistoricalPredictions(filteredData);
    
    const winningTrades = predictions.filter(p => p.isCorrect).length;
    const losingTrades = predictions.filter(p => !p.isCorrect).length;
    const totalReturn = predictions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);
    
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;
    
    predictions.forEach(p => {
      runningPnL += p.profitLoss || 0;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    
    const avgWinAmount = winningTrades > 0 
      ? predictions.filter(p => p.isCorrect).reduce((sum, p) => sum + (p.profitLoss || 0), 0) / winningTrades 
      : 0;
    
    const avgLossAmount = losingTrades > 0 
      ? Math.abs(predictions.filter(p => !p.isCorrect).reduce((sum, p) => sum + (p.profitLoss || 0), 0) / losingTrades)
      : 0;
    
    return {
      startDate,
      endDate,
      totalTrades: predictions.length,
      winningTrades,
      losingTrades,
      totalReturn,
      maxDrawdown,
      sharpeRatio: totalReturn / Math.max(maxDrawdown, 1), // Simplified Sharpe ratio
      winRate: (winningTrades / predictions.length) * 100,
      avgWinAmount,
      avgLossAmount,
      profitFactor: avgLossAmount > 0 ? avgWinAmount / avgLossAmount : 0
    };
  }

  /**
   * Get current model state
   */
  getModelState() {
    return {
      isTraining: this.isLearning,
      lastPrediction: this.predictionHistory[this.predictionHistory.length - 1],
      performance: this.performance,
      config: this.config,
      recentPredictions: this.predictionHistory.slice(-10)
    };
  }

  /**
   * Get performance metrics
   */
  getPerformance(): ModelPerformanceMetrics {
    return { ...this.performance };
  }

  /**
   * Get prediction history
   */
  getPredictionHistory(): PredictionHistory[] {
    return [...this.predictionHistory];
  }
}

export const mockPredictor = new MockMLPredictor();
