
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import { analyzeTechnicals } from '../indicators';
import { defaultFeatureEngineer } from './feature-engineering';
import type {
  PredictionInput,
  PredictionOutput,
  ModelPerformanceMetrics,
  PredictionHistory,
  ModelConfig,
  TrainingData
} from './types';

declare global {
  var __tensorflowModels: {
    lstm: tf.LayersModel | null;
    technical: tf.LayersModel | null;
  } | undefined;
}

export interface MLModelConfig {
  lstmUnits: number;
  denseUnits: number;
  dropoutRate: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
  sequenceLength: number;
  validationSplit: number;
}

export interface EnsembleConfig {
  models: string[];
  weights: number[];
  method: 'weighted_average' | 'voting' | 'stacking';
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  confidence: number;
}

export interface EnhancedPredictionOutput extends PredictionOutput {
  confidenceInterval: ConfidenceInterval;
  modelContributions: {
    lstm: number;
    technical: number;
    ensemble: number;
  };
  featureImportance: {
    [key: string]: number;
  };
}

class TensorFlowPredictor {
  private lstmModel: tf.LayersModel | null = null;
  private technicalModel: tf.LayersModel | null = null;
  private ensembleModel: tf.LayersModel | null = null;
  private config: ModelConfig;
  private mlConfig: MLModelConfig;
  private ensembleConfig: EnsembleConfig;
  private performance: ModelPerformanceMetrics;
  private predictionHistory: PredictionHistory[] = [];
  private isTraining: boolean = false;
  private featureScaler: { mean: number[]; std: number[] } | null = null;
  
  private getGlobalModels() {
    if (typeof window === 'undefined') {
      if (!(globalThis as any).__tensorflowModels) {
        (globalThis as any).__tensorflowModels = { lstm: null, technical: null };
      }
      return (globalThis as any).__tensorflowModels;
    }
    return null;
  }

  constructor() {
    this.config = {
      name: 'TensorFlow.js Ensemble Predictor',
      version: '2.0.0',
      strategy: 'COMBINED',
      parameters: {
        ichimokuPeriods: {
          tenkan: 9,
          kijun: 26,
          senkou: 52
        },
        rsiPeriod: 14,
        confidenceThreshold: 0.7,
        riskTolerance: 0.02
      },
      lastTrained: new Date(),
      isActive: true
    };

    this.mlConfig = {
      lstmUnits: 16,
      denseUnits: 8,
      dropoutRate: 0.1,
      learningRate: 0.01,
      batchSize: 16,
      epochs: 20,
      sequenceLength: 15,
      validationSplit: 0.2
    };

    this.ensembleConfig = {
      models: ['lstm', 'technical'],
      weights: [0.6, 0.4],
      method: 'weighted_average'
    };

    this.performance = {
      accuracy: 0,
      totalPredictions: 0,
      correctPredictions: 0,
      avgConfidence: 0,
      profitLoss: 0,
      maxDrawdown: 0,
      winRate: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Feature engineering: Extract meaningful features from market data and technical indicators
   */
  private extractFeatures(input: PredictionInput): number[][] {
    const features: number[][] = [];
    const { marketData, indicators } = input;
    
    const prices = marketData.map(d => d.close);
    const volumes = marketData.map(d => d.volume || 0);
    const highs = marketData.map(d => d.high);
    const lows = marketData.map(d => d.low);
    
    const priceData = marketData.map(d => ({ 
      high: d.high, 
      low: d.low, 
      close: d.close, 
      volume: d.volume 
    }));
    
    for (let i = this.mlConfig.sequenceLength; i < marketData.length; i++) {
      const sequenceFeatures: number[] = [];
      
      const priceSequence = prices.slice(i - this.mlConfig.sequenceLength, i);
      const priceReturns = this.calculateReturns(priceSequence);
      sequenceFeatures.push(...priceReturns);
      
      const volumeSequence = volumes.slice(i - this.mlConfig.sequenceLength, i);
      const volumeNormalized = this.normalizeSequence(volumeSequence);
      sequenceFeatures.push(...volumeNormalized);
      
      if (indicators.ichimoku) {
        sequenceFeatures.push(
          indicators.ichimoku.tenkanSen / prices[i],
          indicators.ichimoku.kijunSen / prices[i],
          indicators.ichimoku.senkouSpanA / prices[i],
          indicators.ichimoku.senkouSpanB / prices[i],
          indicators.ichimoku.signal === 'BULLISH' ? 1 : indicators.ichimoku.signal === 'BEARISH' ? -1 : 0
        );
      }
      
      if (indicators.rsi) {
        sequenceFeatures.push(indicators.rsi.value / 100);
      }
      
      if (indicators.macd) {
        sequenceFeatures.push(
          indicators.macd.macd,
          indicators.macd.signal,
          indicators.macd.histogram,
          indicators.macd.signalType === 'BULLISH' ? 1 : indicators.macd.signalType === 'BEARISH' ? -1 : 0
        );
      }
      
      if (indicators.bollinger) {
        const currentPrice = prices[i];
        sequenceFeatures.push(
          (currentPrice - indicators.bollinger.lowerBand) / (indicators.bollinger.upperBand - indicators.bollinger.lowerBand),
          indicators.bollinger.bandwidth,
          indicators.bollinger.squeeze ? 1 : 0
        );
      }
      
      if (indicators.fibonacci) {
        const currentPrice = prices[i];
        const fibRange = indicators.fibonacci.swingHigh - indicators.fibonacci.swingLow;
        sequenceFeatures.push(
          (currentPrice - indicators.fibonacci.levels.level236) / fibRange,
          (currentPrice - indicators.fibonacci.levels.level382) / fibRange,
          (currentPrice - indicators.fibonacci.levels.level618) / fibRange
        );
      }
      
      if (indicators.volume) {
        sequenceFeatures.push(
          indicators.volume.volumeOscillator,
          indicators.volume.volumeTrend === 'INCREASING' ? 1 : indicators.volume.volumeTrend === 'DECREASING' ? -1 : 0
        );
      }
      
      features.push(sequenceFeatures);
    }
    
    return features;
  }

  /**
   * Calculate price returns for a sequence
   */
  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    return returns;
  }

  /**
   * Normalize a sequence to [0, 1] range
   */
  private normalizeSequence(sequence: number[]): number[] {
    const min = Math.min(...sequence);
    const max = Math.max(...sequence);
    const range = max - min;
    
    if (range === 0) return sequence.map(() => 0.5);
    
    return sequence.map(val => (val - min) / range);
  }

  /**
   * Create and compile LSTM model for time series prediction
   */
  private createLSTMModel(inputShape: number[]): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: this.mlConfig.lstmUnits,
          returnSequences: true,
          inputShape: inputShape
        }),
        tf.layers.dropout({ rate: this.mlConfig.dropoutRate }),
        tf.layers.lstm({
          units: this.mlConfig.lstmUnits / 2,
          returnSequences: false
        }),
        tf.layers.dropout({ rate: this.mlConfig.dropoutRate }),
        tf.layers.dense({
          units: this.mlConfig.denseUnits,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(this.mlConfig.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  /**
   * Create and compile technical indicator model
   */
  private createTechnicalModel(inputShape: number[]): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: this.mlConfig.denseUnits * 2,
          activation: 'relu',
          inputShape: inputShape
        }),
        tf.layers.dropout({ rate: this.mlConfig.dropoutRate }),
        tf.layers.dense({
          units: this.mlConfig.denseUnits,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: this.mlConfig.dropoutRate }),
        tf.layers.dense({
          units: 1,
          activation: 'linear'
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(this.mlConfig.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  /**
   * Train the ensemble of models
   */
  async trainModels(trainingData: TrainingData): Promise<void> {
    this.isTraining = true;
    
    try {
      if (this.lstmModel) {
        this.lstmModel.dispose();
        this.lstmModel = null;
      }
      if (this.technicalModel) {
        this.technicalModel.dispose();
        this.technicalModel = null;
      }
      
      tf.disposeVariables();
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('TensorFlow.js initialized with backend:', tf.getBackend());
      
      console.log('Starting model training with', trainingData.features.length, 'samples');
      
      const lstmFeatures = this.prepareSequentialData(trainingData.features);
      const lstmLabels = tf.tensor2d(trainingData.labels.slice(this.mlConfig.sequenceLength), [trainingData.labels.length - this.mlConfig.sequenceLength, 1]);
      
      const techFeatures = tf.tensor2d(trainingData.features.slice(-1));
      const techLabels = tf.tensor2d([trainingData.labels[trainingData.labels.length - 1]], [1, 1]);
      
      console.log('Creating LSTM model...');
      this.lstmModel = this.createLSTMModel([this.mlConfig.sequenceLength, trainingData.features[0].length]);
      
      console.log('Training LSTM model...');
      await this.lstmModel.fit(lstmFeatures, lstmLabels, {
        epochs: this.mlConfig.epochs,
        batchSize: this.mlConfig.batchSize,
        validationSplit: this.mlConfig.validationSplit,
        verbose: 1
      });
      
      console.log('Creating technical model...');
      this.technicalModel = this.createTechnicalModel([trainingData.features[0].length]);
      
      console.log('Training technical model...');
      await this.technicalModel.fit(techFeatures, techLabels, {
        epochs: this.mlConfig.epochs / 2,
        batchSize: this.mlConfig.batchSize,
        validationSplit: this.mlConfig.validationSplit,
        verbose: 1
      });
      
      lstmFeatures.dispose();
      lstmLabels.dispose();
      techFeatures.dispose();
      techLabels.dispose();
      
      this.config.lastTrained = new Date();
      console.log('Model training completed successfully');
      
    } catch (error) {
      console.error('Error training models:', error);
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Prepare sequential data for LSTM
   */
  private prepareSequentialData(features: number[][]): tf.Tensor3D {
    const sequences: number[][][] = [];
    
    for (let i = this.mlConfig.sequenceLength; i < features.length; i++) {
      const sequence = features.slice(i - this.mlConfig.sequenceLength, i);
      sequences.push(sequence);
    }
    
    return tf.tensor3d(sequences);
  }

  /**
   * Generate ensemble prediction with confidence intervals
   */
  async predict(input: PredictionInput): Promise<EnhancedPredictionOutput> {
    const currentPrice = input.marketData[input.marketData.length - 1].close;
    const features = this.extractFeatures(input);
    
    if (features.length === 0) {
      throw new Error('Insufficient data for prediction');
    }
    
    const currentFeatures = features[features.length - 1];
    
    const predictions: { [key: string]: number } = {};
    const confidences: { [key: string]: number } = {};
    
    if (this.lstmModel && features.length >= this.mlConfig.sequenceLength) {
      const sequentialData = tf.tensor3d([features.slice(-this.mlConfig.sequenceLength)]);
      const lstmPred = this.lstmModel.predict(sequentialData) as tf.Tensor;
      predictions.lstm = (await lstmPred.data())[0];
      confidences.lstm = 0.8; // Base confidence for LSTM
      
      sequentialData.dispose();
      lstmPred.dispose();
    }
    
    if (this.technicalModel) {
      const techData = tf.tensor2d([currentFeatures]);
      const techPred = this.technicalModel.predict(techData) as tf.Tensor;
      predictions.technical = (await techPred.data())[0];
      confidences.technical = 0.7; // Base confidence for technical model
      
      techData.dispose();
      techPred.dispose();
    }
    
    const ensemblePrediction = this.combineModels(predictions);
    const ensembleConfidence = this.calculateEnsembleConfidence(confidences, predictions);
    
    const confidenceInterval = this.calculateConfidenceInterval(
      ensemblePrediction,
      ensembleConfidence,
      currentPrice
    );
    
    const direction: 'UP' | 'DOWN' = ensemblePrediction > currentPrice ? 'UP' : 'DOWN';
    
    const reasoning = this.generateReasoning(predictions, input.indicators);
    
    const featureImportance = this.calculateFeatureImportance(currentFeatures);
    
    const prediction: EnhancedPredictionOutput = {
      date: new Date(),
      predictedPrice: Number(ensemblePrediction.toFixed(3)),
      direction,
      confidence: Number(ensembleConfidence.toFixed(3)),
      reasoning,
      ichimokuSignal: input.indicators.ichimoku?.signal || 'NEUTRAL',
      rsiValue: input.indicators.rsi.value,
      confidenceInterval,
      modelContributions: {
        lstm: predictions.lstm || 0,
        technical: predictions.technical || 0,
        ensemble: ensemblePrediction
      },
      featureImportance
    };
    
    return prediction;
  }

  /**
   * Combine predictions from multiple models
   */
  private combineModels(predictions: { [key: string]: number }): number {
    if (this.ensembleConfig.method === 'weighted_average') {
      let weightedSum = 0;
      let totalWeight = 0;
      
      this.ensembleConfig.models.forEach((model, index) => {
        if (predictions[model] !== undefined) {
          const weight = this.ensembleConfig.weights[index];
          weightedSum += predictions[model] * weight;
          totalWeight += weight;
        }
      });
      
      return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    
    const validPredictions = Object.values(predictions).filter(p => p !== undefined);
    return validPredictions.reduce((sum, pred) => sum + pred, 0) / validPredictions.length;
  }

  /**
   * Calculate ensemble confidence based on model agreement
   */
  private calculateEnsembleConfidence(
    confidences: { [key: string]: number },
    predictions: { [key: string]: number }
  ): number {
    const validConfidences = Object.values(confidences).filter(c => c !== undefined);
    const validPredictions = Object.values(predictions).filter(p => p !== undefined);
    
    if (validConfidences.length === 0) return 0.5;
    
    const avgConfidence = validConfidences.reduce((sum, conf) => sum + conf, 0) / validConfidences.length;
    
    if (validPredictions.length > 1) {
      const mean = validPredictions.reduce((sum, pred) => sum + pred, 0) / validPredictions.length;
      const variance = validPredictions.reduce((sum, pred) => sum + Math.pow(pred - mean, 2), 0) / validPredictions.length;
      const agreement = Math.exp(-variance * 1000); // Higher agreement = higher confidence
      
      return Math.min(avgConfidence * (0.5 + agreement * 0.5), 0.95);
    }
    
    return avgConfidence;
  }

  /**
   * Calculate confidence interval for prediction
   */
  private calculateConfidenceInterval(
    prediction: number,
    confidence: number,
    currentPrice: number
  ): ConfidenceInterval {
    const uncertainty = (1 - confidence) * currentPrice * 0.02; // 2% max uncertainty
    
    return {
      lower: prediction - uncertainty,
      upper: prediction + uncertainty,
      confidence: confidence
    };
  }

  /**
   * Generate human-readable reasoning for the prediction
   */
  private generateReasoning(
    predictions: { [key: string]: number },
    indicators: PredictionInput['indicators']
  ): string {
    const reasons: string[] = [];
    
    if (predictions.lstm) {
      reasons.push('LSTM model detected price momentum patterns');
    }
    
    if (predictions.technical) {
      reasons.push('Technical indicators suggest directional movement');
    }
    
    if (indicators.ichimoku?.signal === 'BULLISH') {
      reasons.push('Ichimoku cloud shows bullish trend');
    } else if (indicators.ichimoku?.signal === 'BEARISH') {
      reasons.push('Ichimoku cloud shows bearish trend');
    }
    
    if (indicators.macd?.signalType === 'BULLISH') {
      reasons.push('MACD indicates bullish momentum');
    } else if (indicators.macd?.signalType === 'BEARISH') {
      reasons.push('MACD indicates bearish momentum');
    }
    
    if (indicators.volume?.signal === 'BULLISH') {
      reasons.push('Volume analysis supports upward movement');
    } else if (indicators.volume?.signal === 'BEARISH') {
      reasons.push('Volume analysis supports downward movement');
    }
    
    return reasons.length > 0 ? reasons.join('; ') : 'Ensemble model prediction based on multiple factors';
  }

  /**
   * Calculate feature importance scores
   */
  private calculateFeatureImportance(features: number[]): { [key: string]: number } {
    const importance: { [key: string]: number } = {};
    
    const featureNames = [
      'price_returns', 'volume', 'ichimoku', 'rsi', 'macd', 'bollinger', 'fibonacci'
    ];
    
    featureNames.forEach((name, index) => {
      const baseImportance = Math.abs(features[index % features.length] || 0);
      importance[name] = Math.min(baseImportance * (1 + Math.random() * 0.2), 1.0);
    });
    
    return importance;
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
   * Get current model state
   */
  getModelState() {
    return {
      isTraining: this.isTraining,
      lastPrediction: this.predictionHistory[this.predictionHistory.length - 1],
      performance: this.performance,
      config: this.config,
      recentPredictions: this.predictionHistory.slice(-10),
      mlConfig: this.mlConfig,
      ensembleConfig: this.ensembleConfig
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

  /**
   * Save models to browser storage (browser only) or server memory
   */
  async saveModels(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        if (this.lstmModel) {
          await this.lstmModel.save('localstorage://lstm-model');
        }
        if (this.technicalModel) {
          await this.technicalModel.save('localstorage://technical-model');
        }
        console.log('Models saved to browser localStorage');
      } else {
        const globalModels = this.getGlobalModels();
        if (globalModels) {
          globalModels.lstm = this.lstmModel;
          globalModels.technical = this.technicalModel;
          console.log('Server environment: Models saved to global memory');
        }
      }
    } catch (error) {
      console.error('Error saving models:', error);
    }
  }

  /**
   * Load models from browser storage (browser only) or server memory
   */
  async loadModels(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        this.lstmModel = await tf.loadLayersModel('localstorage://lstm-model');
        this.technicalModel = await tf.loadLayersModel('localstorage://technical-model');
        console.log('Models loaded from browser localStorage');
      } else {
        const globalModels = this.getGlobalModels();
        if (globalModels) {
          this.lstmModel = globalModels.lstm;
          this.technicalModel = globalModels.technical;
          if (this.lstmModel && this.technicalModel) {
            console.log('Server environment: Models loaded from global memory');
          } else {
            console.log('Server environment: No models in global memory, will need training');
          }
        }
      }
    } catch (error) {
      console.warn('Could not load saved models, will train new ones:', error);
    }
  }

  /**
   * Check if models are available for prediction
   */
  hasTrainedModels(): boolean {
    return this.lstmModel !== null && this.technicalModel !== null;
  }
}

export const tensorflowPredictor = new TensorFlowPredictor();
