import { NextRequest, NextResponse } from 'next/server';
import { mockPredictor } from '@/lib/ml-models/mock-predictor';
import { generateCompleteDataset, type PredictionData } from '@/lib/data/dummy-data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid pagination parameters',
          message: 'Page must be >= 1, limit must be between 1 and 100'
        },
        { status: 400 }
      );
    }
    
    let predictions = mockPredictor.getPredictionHistory();
    
    if (predictions.length === 0) {
      const { marketData } = generateCompleteDataset(90);
      predictions = mockPredictor.generateHistoricalPredictions(marketData);
    }
    
    let filteredPredictions = predictions;
    if (startDate) {
      const start = new Date(startDate);
      filteredPredictions = filteredPredictions.filter(p => p.date >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filteredPredictions = filteredPredictions.filter(p => p.date <= end);
    }
    
    filteredPredictions.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPredictions = filteredPredictions.slice(startIndex, endIndex);
    
    const totalCount = filteredPredictions.length;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return NextResponse.json({
      success: true,
      data: {
        predictions: paginatedPredictions,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch predictions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { predictionId, actualPrice, isCorrect, profitLoss } = body;
    
    if (!predictionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field',
          message: 'predictionId is required'
        },
        { status: 400 }
      );
    }
    
    const predictions = mockPredictor.getPredictionHistory();
    const predictionIndex = predictions.findIndex(p => p.id === predictionId);
    
    if (predictionIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prediction not found',
          message: `No prediction found with id: ${predictionId}`
        },
        { status: 404 }
      );
    }
    
    const updatedPrediction = {
      ...predictions[predictionIndex],
      actualPrice: actualPrice ? Number(actualPrice) : undefined,
      isCorrect: isCorrect !== undefined ? Boolean(isCorrect) : undefined,
      profitLoss: profitLoss ? Number(profitLoss) : undefined
    };
    
    mockPredictor.updatePerformance(updatedPrediction);
    
    return NextResponse.json({
      success: true,
      data: {
        prediction: updatedPrediction,
        message: 'Prediction updated successfully'
      }
    });
  } catch (error) {
    console.error('Error updating prediction:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update prediction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
