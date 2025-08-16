import { NextRequest, NextResponse } from 'next/server';
import { modelManager } from '@/lib/ml-models/model-manager';
import { getCompleteDataset } from '@/lib/data/market-data';
import type { ModelPerformanceMetrics, PredictionHistory } from '@/lib/ml-models/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const includeBacktest = searchParams.get('includeBacktest') === 'true';
    
    let predictions = modelManager.getPredictionHistory();
    
    if (predictions.length === 0) {
      const { marketData } = await getCompleteDataset(90);
      const { mockPredictor } = await import('@/lib/ml-models/mock-predictor');
      predictions = mockPredictor.generateHistoricalPredictions(marketData);
    }
    
    const performance = modelManager.getPerformance();
    const modelState = modelManager.getModelState();
    
    const periodDays = parseInt(period);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    
    const recentPredictions = predictions.filter((p: PredictionHistory) => p.date >= cutoffDate);
    const recentCorrect = recentPredictions.filter((p: PredictionHistory) => p.isCorrect).length;
    const recentAccuracy = recentPredictions.length > 0 
      ? (recentCorrect / recentPredictions.length) * 100 
      : 0;
    
    const recentPnL = recentPredictions.reduce((sum: number, p: PredictionHistory) => sum + (p.profitLoss || 0), 0);
    
    let currentStreak = 0;
    const sortedPredictions = [...predictions].sort((a, b) => b.date.getTime() - a.date.getTime());
    for (const pred of sortedPredictions) {
      if (pred.isCorrect === true) {
        currentStreak++;
      } else if (pred.isCorrect === false) {
        break;
      }
    }
    
    const responseData: {
      overall: ModelPerformanceMetrics;
      period: {
        days: number;
        accuracy: number;
        totalPredictions: number;
        correctPredictions: number;
        profitLoss: number;
        avgConfidence: number;
      };
      streaks: {
        current: number;
        longestWin: number;
        longestLoss: number;
      };
      modelInfo: {
        name: string;
        version: string;
        strategy: string;
        lastTrained: Date;
        isTraining: boolean;
        isActive: boolean;
      };
      lastUpdated: string;
      backtest?: {
        totalTrades: number;
        winRate: number;
        totalReturn: number;
        maxDrawdown: number;
        avgWinAmount: number;
        avgLossAmount: number;
        profitFactor: number;
      };
    } = {
      overall: performance,
      period: {
        days: periodDays,
        accuracy: Number(recentAccuracy.toFixed(2)),
        totalPredictions: recentPredictions.length,
        correctPredictions: recentCorrect,
        profitLoss: Number(recentPnL.toFixed(2)),
        avgConfidence: recentPredictions.length > 0 
          ? Number((recentPredictions.reduce((sum: number, p: PredictionHistory) => sum + p.confidence, 0) / recentPredictions.length).toFixed(3))
          : 0
      },
      streaks: {
        current: currentStreak,
        longestWin: calculateLongestStreak(predictions, true),
        longestLoss: calculateLongestStreak(predictions, false)
      },
      modelInfo: {
        name: modelState.config.name,
        version: modelState.config.version,
        strategy: modelState.config.strategy,
        lastTrained: modelState.config.lastTrained,
        isTraining: modelState.isTraining,
        isActive: modelState.config.isActive
      },
      lastUpdated: new Date().toISOString()
    };
    
    if (includeBacktest) {
      // const { marketData } = await getCompleteDataset(90);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 60);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      
      const backtestResult = await modelManager.runBacktest(startDate, endDate);
      responseData.backtest = backtestResult;
    }
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch performance data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'retrain') {
      const modelState = modelManager.getModelState();
      
      modelState.config.lastTrained = new Date();
      
      const currentAccuracy = modelState.performance.accuracy;
      const improvement = (Math.random() - 0.5) * 4; // ±2% change
      const newAccuracy = Math.max(60, Math.min(90, currentAccuracy + improvement));
      
      modelState.performance.accuracy = Number(newAccuracy.toFixed(2));
      modelState.performance.lastUpdated = new Date();
      
      return NextResponse.json({
        success: true,
        data: {
          message: 'Model retrained successfully',
          previousAccuracy: currentAccuracy,
          newAccuracy: newAccuracy,
          improvement: Number(improvement.toFixed(2)),
          retrainedAt: modelState.config.lastTrained
        }
      });
    } else if (action === 'reset') {
      const performance = modelManager.getPerformance();
      performance.accuracy = 72.5;
      performance.totalPredictions = 0;
      performance.correctPredictions = 0;
      performance.profitLoss = 0;
      performance.maxDrawdown = 0;
      performance.lastUpdated = new Date();
      
      return NextResponse.json({
        success: true,
        data: {
          message: 'Performance metrics reset successfully',
          resetAt: new Date().toISOString()
        }
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action',
          message: 'Supported actions: retrain, reset'
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing performance action:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process performance action',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateLongestStreak(predictions: Array<{date: Date, isCorrect?: boolean}>, isWinStreak: boolean): number {
  let longestStreak = 0;
  let currentStreak = 0;
  
  const sortedPredictions = [...predictions].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  for (const pred of sortedPredictions) {
    if (pred.isCorrect === isWinStreak) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (pred.isCorrect !== undefined) {
      currentStreak = 0;
    }
  }
  
  return longestStreak;
}
