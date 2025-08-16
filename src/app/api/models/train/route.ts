import { NextRequest, NextResponse } from 'next/server';
import { modelManager } from '@/lib/ml-models/model-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { forceRetrain = false } = body;

    await modelManager.trainModels(forceRetrain);

    const modelState = modelManager.getModelState();
    
    return NextResponse.json({
      success: true,
      message: 'Models trained successfully',
      data: {
        currentPredictor: modelState.currentPredictor,
        lastTrainingDate: modelState.lastTrainingDate,
        performance: modelManager.getPerformance()
      }
    });
  } catch (error) {
    console.error('Error training models:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to train models',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const modelState = modelManager.getModelState();
    
    return NextResponse.json({
      success: true,
      data: {
        currentPredictor: modelState.currentPredictor,
        isInitialized: modelState.isInitialized,
        lastTrainingDate: modelState.lastTrainingDate,
        performance: modelManager.getPerformance(),
        isTensorFlowAvailable: modelManager.isTensorFlowAvailable()
      }
    });
  } catch (error) {
    console.error('Error getting model state:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get model state',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
