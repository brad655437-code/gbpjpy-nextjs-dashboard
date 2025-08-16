import { NextRequest, NextResponse } from 'next/server';
import { mockPredictor } from '@/lib/ml-models/mock-predictor';
import { generateCompleteDataset, type MarketDataPoint } from '@/lib/data/dummy-data';
import type { PredictionInput } from '@/lib/ml-models/types';

export async function GET() {
  try {
    const { marketData } = generateCompleteDataset(90);
    
    const recentData = marketData.slice(-60); // Last 60 days for context
    
    const input: PredictionInput = {
      marketData: recentData,
      indicators: {
        ichimoku: null, // Will be calculated in the predictor
        rsi: { value: 50, signal: 'NEUTRAL' } // Will be calculated in the predictor
      }
    };
    
    const prediction = mockPredictor.predict(input);
    
    return NextResponse.json({
      success: true,
      data: {
        prediction,
        timestamp: new Date().toISOString(),
        modelVersion: mockPredictor.getModelState().config.version
      }
    });
  } catch (error) {
    console.error('Error generating prediction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate prediction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketData, indicators } = body;
    
    if (!marketData || !Array.isArray(marketData)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          message: 'marketData must be an array'
        },
        { status: 400 }
      );
    }
    
    const input: PredictionInput = {
      marketData: marketData.map((d: any) => ({
        date: new Date(d.date),
        open: Number(d.open),
        high: Number(d.high),
        low: Number(d.low),
        close: Number(d.close),
        volume: d.volume ? Number(d.volume) : undefined
      })),
      indicators: indicators || {
        ichimoku: null,
        rsi: { value: 50, signal: 'NEUTRAL' }
      }
    };
    
    const prediction = mockPredictor.predict(input);
    
    return NextResponse.json({
      success: true,
      data: {
        prediction,
        timestamp: new Date().toISOString(),
        modelVersion: mockPredictor.getModelState().config.version
      }
    });
  } catch (error) {
    console.error('Error processing prediction request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process prediction request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
