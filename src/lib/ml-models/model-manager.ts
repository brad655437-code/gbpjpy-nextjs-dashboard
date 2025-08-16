
import { mockPredictor } from './mock-predictor';
import { tensorflowPredictor, type EnhancedPredictionOutput } from './tensorflow-predictor';
import { defaultFeatureEngineer } from './feature-engineering';
import type {
  PredictionInput,
  PredictionOutput,
  ModelPerformanceMetrics,
  PredictionHistory,
  BacktestResult,
  TrainingData
} from './types';
import { getMarketData } from '../data/market-data';
import { analyzeTechnicals } from '../indicators';

export type PredictorType = 'mock' | 'tensorflow';

export interface ModelManagerConfig {
  defaultPredictor: PredictorType;
  autoSwitchThreshold: number; // Accuracy threshold to auto-switch to ML
  trainingDataSize: number; // Number of days for training data
  retrainingInterval: number; // Days between retraining
}

export class ModelManager {
  private currentPredictor: PredictorType;
  private config: ModelManagerConfig;
  private lastTrainingDate: Date | null = null;
  private isInitialized: boolean = false;

  constructor(config: Partial<ModelManagerConfig> = {}) {
    this.config = {
      defaultPredictor: 'mock',
      autoSwitchThreshold: 0.65, // Switch to ML when accuracy > 65%
      trainingDataSize: 365, // 1 year of training data
      retrainingInterval: 7, // Retrain weekly
      ...config
    };
    
    this.currentPredictor = this.config.defaultPredictor;
  }

  /**
   * Initialize the model manager and load any saved models
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await tensorflowPredictor.loadModels();
      
      // Check if we have trained models available
      if (tensorflowPredictor.hasTrainedModels()) {
        console.log('ModelManager: TensorFlow models found, switching to TensorFlow predictor');
        this.currentPredictor = 'tensorflow';
      } else {
        console.log('ModelManager: No trained models found, using mock predictor');
        this.currentPredictor = 'mock';
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('Could not initialize TensorFlow models, using mock predictor:', error);
      this.currentPredictor = 'mock';
      this.isInitialized = true;
    }
  }

  /**
   * Generate prediction using the current predictor
   */
  async predict(input: PredictionInput): Promise<PredictionOutput | EnhancedPredictionOutput> {
    await this.initialize();
    
    await this.checkRetrainingNeeded();
    
    console.log('ModelManager: Using predictor:', this.currentPredictor);
    
    try {
      if (this.currentPredictor === 'tensorflow') {
        console.log('ModelManager: Attempting TensorFlow prediction...');
        const result = await tensorflowPredictor.predict(input);
        console.log('ModelManager: TensorFlow prediction successful, type:', typeof result.confidenceInterval);
        return result;
      } else {
        console.log('ModelManager: Using mock predictor');
        return mockPredictor.predict(input);
      }
    } catch (error) {
      console.error('Error generating prediction with', this.currentPredictor, 'predictor:', error);
      
      if (this.currentPredictor === 'tensorflow') {
        console.warn('Falling back to mock predictor due to error:', error);
        return mockPredictor.predict(input);
      }
      
      throw error;
    }
  }

  /**
   * Train TensorFlow models with historical data
   */
  async trainModels(_forceRetrain: boolean = false): Promise<void> {
    try {
      console.log('ModelManager: Starting training process...');
      
      const marketData = await getMarketData(this.config.trainingDataSize);
      
      if (marketData.length < 100) {
        throw new Error('Insufficient training data');
      }

      console.log('ModelManager: Preparing training data from', marketData.length, 'market data points');
      
      const trainingData = await this.prepareTrainingData(marketData);
      
      if (trainingData.features.length < 50) {
        throw new Error('Insufficient features for training');
      }

      console.log('ModelManager: Training TensorFlow models with', trainingData.features.length, 'feature sets');
      
      const trainingPromise = tensorflowPredictor.trainModels(trainingData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Training timeout after 15 minutes')), 900000)
      );
      
      await Promise.race([trainingPromise, timeoutPromise]);
      
      console.log('ModelManager: Saving trained models...');
      await tensorflowPredictor.saveModels();
      
      this.lastTrainingDate = new Date();
      
      console.log('ModelManager: Evaluating model performance...');
      await this.evaluateAndSwitch();
      
      console.log('ModelManager: Training process completed successfully');
      
    } catch (error) {
      console.error('ModelManager: Error training models:', error);
      throw error;
    }
  }

  /**
   * Prepare training data from historical market data
   */
  private async prepareTrainingData(marketData: Array<{date: Date; open: number; high: number; low: number; close: number; volume?: number}>): Promise<TrainingData> {
    const features: number[][] = [];
    const labels: number[] = [];
    const dates: Date[] = [];

    for (let i = 30; i < marketData.length - 1; i++) { // Need 30 days for sequence + 1 for label
      try {
        const historicalWindow = marketData.slice(i - 30, i + 1);
        
        const priceData = historicalWindow.map(d => ({
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume
        }));
        
        const technicals = analyzeTechnicals(priceData);
        
        const input: PredictionInput = {
          marketData: historicalWindow.map(d => ({
            date: new Date(d.date),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume
          })),
          indicators: {
            ichimoku: technicals.ichimoku,
            rsi: technicals.rsi,
            macd: technicals.macd,
            bollinger: technicals.bollinger,
            fibonacci: technicals.fibonacci,
            volume: technicals.volume
          }
        };

        const featureSet = defaultFeatureEngineer.extractFeatures(input);
        
        if (featureSet.combinedFeatures.length > 0) {
          features.push(featureSet.combinedFeatures);
          
          const currentPrice = historicalWindow[historicalWindow.length - 1].close;
          const nextPrice = marketData[i + 1].close;
          const priceChange = (nextPrice - currentPrice) / currentPrice;
          
          labels.push(priceChange > 0 ? 1 : 0);
          dates.push(new Date(historicalWindow[historicalWindow.length - 1].date));
        }
      } catch (error) {
        console.warn('Error processing training data point:', error);
        continue;
      }
    }

    return { features, labels, dates };
  }

  /**
   * Check if models need retraining
   */
  private async checkRetrainingNeeded(): Promise<void> {
    if (!this.lastTrainingDate) {
      return; // No previous training, don't auto-retrain
    }

    const daysSinceTraining = (Date.now() - this.lastTrainingDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceTraining >= this.config.retrainingInterval) {
      try {
        console.log('Auto-retraining models...');
        await this.trainModels();
      } catch (error) {
        console.error('Auto-retraining failed:', error);
      }
    }
  }

  /**
   * Evaluate model performance and switch if needed
   */
  private async evaluateAndSwitch(): Promise<void> {
    const mlPerformance = tensorflowPredictor.getPerformance();
    const mockPerformance = mockPredictor.getPerformance();
    
    if (this.lastTrainingDate && tensorflowPredictor.hasTrainedModels()) {
      this.currentPredictor = 'tensorflow';
      console.log('ModelManager: Switched to TensorFlow predictor after successful training');
      return;
    }
    
    if (mlPerformance.totalPredictions >= 10) {
      if (mlPerformance.accuracy > this.config.autoSwitchThreshold && 
          mlPerformance.accuracy > mockPerformance.accuracy + 0.05) {
        this.currentPredictor = 'tensorflow';
        console.log('Switched to TensorFlow predictor (accuracy:', mlPerformance.accuracy, ')');
      } else if (mockPerformance.accuracy > mlPerformance.accuracy + 0.1) {
        this.currentPredictor = 'mock';
        console.log('Switched to mock predictor (accuracy:', mockPerformance.accuracy, ')');
      }
    }
  }

  /**
   * Manually switch predictor type
   */
  switchPredictor(type: PredictorType): void {
    this.currentPredictor = type;
  }

  /**
   * Get current predictor type
   */
  getCurrentPredictor(): PredictorType {
    return this.currentPredictor;
  }

  /**
   * Get performance metrics from current predictor
   */
  getPerformance(): ModelPerformanceMetrics {
    if (this.currentPredictor === 'tensorflow') {
      return tensorflowPredictor.getPerformance();
    } else {
      return mockPredictor.getPerformance();
    }
  }

  /**
   * Get prediction history from current predictor
   */
  getPredictionHistory(): PredictionHistory[] {
    if (this.currentPredictor === 'tensorflow') {
      return tensorflowPredictor.getPredictionHistory();
    } else {
      return mockPredictor.getPredictionHistory();
    }
  }

  /**
   * Update performance with actual results
   */
  updatePerformance(prediction: PredictionHistory): void {
    if (this.currentPredictor === 'tensorflow') {
      tensorflowPredictor.updatePerformance(prediction);
    } else {
      mockPredictor.updatePerformance(prediction);
    }
  }

  /**
   * Run backtest using current predictor
   */
  async runBacktest(startDate: Date, endDate: Date): Promise<BacktestResult> {
    const marketData = await getMarketData(365); // Get 1 year of data
    
    if (this.currentPredictor === 'tensorflow') {
      return mockPredictor.runBacktest(marketData, startDate, endDate);
    } else {
      return mockPredictor.runBacktest(marketData, startDate, endDate);
    }
  }

  /**
   * Get model state information
   */
  getModelState() {
    const baseState = {
      currentPredictor: this.currentPredictor,
      isInitialized: this.isInitialized,
      lastTrainingDate: this.lastTrainingDate,
      config: this.config
    };

    if (this.currentPredictor === 'tensorflow') {
      return {
        ...baseState,
        ...tensorflowPredictor.getModelState()
      };
    } else {
      return {
        ...baseState,
        isTraining: false,
        performance: mockPredictor.getPerformance(),
        config: mockPredictor.getModelState().config,
        recentPredictions: mockPredictor.getPredictionHistory().slice(-10)
      };
    }
  }

  /**
   * Check if TensorFlow models are available
   */
  async isTensorFlowAvailable(): Promise<boolean> {
    try {
      const tf = await import('@tensorflow/tfjs');
      return tf && typeof tf.tensor === 'function' && tensorflowPredictor.hasTrainedModels();
    } catch {
      return false;
    }
  }
}

export const modelManager = new ModelManager();
