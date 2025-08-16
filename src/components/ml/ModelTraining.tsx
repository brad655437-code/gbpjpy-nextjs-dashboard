'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Play, RefreshCw, Settings, TrendingUp, Brain, Zap } from 'lucide-react';

interface ModelState {
  currentPredictor: 'mock' | 'tensorflow';
  isInitialized: boolean;
  lastTrainingDate: string | null;
  performance: {
    accuracy: number;
    totalPredictions: number;
    correctPredictions: number;
    avgConfidence: number;
    profitLoss: number;
  };
  isTensorFlowAvailable: boolean;
}

export function ModelTraining() {
  const [modelState, setModelState] = useState<ModelState | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTensorFlowAvailable, setIsTensorFlowAvailable] = useState(false);

  const checkTensorFlowAvailability = async () => {
    try {
      const tf = await import('@tensorflow/tfjs');
      setIsTensorFlowAvailable(tf && typeof tf.tensor === 'function');
    } catch {
      setIsTensorFlowAvailable(false);
    }
  };

  const fetchModelState = async () => {
    try {
      const response = await fetch('/api/models/train');
      const data = await response.json();
      
      if (data.success) {
        setModelState({
          ...data.data,
          isTensorFlowAvailable // Use client-side detection
        });
      } else {
        setError(data.error || 'Failed to fetch model state');
      }
    } catch {
      setError('Network error fetching model state');
    } finally {
      setLoading(false);
    }
  };

  const trainModels = async (forceRetrain: boolean = false) => {
    setIsTraining(true);
    setError(null);
    
    try {
      const response = await fetch('/api/models/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceRetrain }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchModelState(); // Refresh state after training
      } else {
        setError(data.error || 'Training failed');
      }
    } catch {
      setError('Network error during training');
    } finally {
      setIsTraining(false);
    }
  };

  useEffect(() => {
    checkTensorFlowAvailability();
    fetchModelState();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600 text-center">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchModelState();
              }}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!modelState) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Model Training and Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Model Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Current Model</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  modelState.currentPredictor === 'tensorflow' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {modelState.currentPredictor === 'tensorflow' ? 'TensorFlow.js' : 'Mock Predictor'}
                </span>
                {modelState.currentPredictor === 'tensorflow' && (
                  <Zap className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Accuracy</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {modelState.performance.accuracy.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {modelState.performance.correctPredictions}/{modelState.performance.totalPredictions} predictions
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Last Training</span>
              </div>
              <div className="text-sm text-gray-900">
                {modelState.lastTrainingDate 
                  ? new Date(modelState.lastTrainingDate).toLocaleDateString()
                  : 'Never'
                }
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500">Avg Confidence</div>
                <div className="text-lg font-semibold text-gray-900">
                  {(modelState.performance.avgConfidence * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">P&L</div>
                <div className={`text-lg font-semibold ${
                  modelState.performance.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${modelState.performance.profitLoss.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Predictions</div>
                <div className="text-lg font-semibold text-gray-900">
                  {modelState.performance.totalPredictions}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">TensorFlow.js</div>
                <div className={`text-sm font-medium ${
                  isTensorFlowAvailable ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isTensorFlowAvailable ? 'Available' : 'Not Available'}
                </div>
              </div>
            </div>
          </div>

          {/* Training Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => trainModels(false)}
              disabled={isTraining || !isTensorFlowAvailable}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isTraining ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isTraining ? 'Training...' : 'Train Models'}
            </button>

            <button
              onClick={() => trainModels(true)}
              disabled={isTraining || !isTensorFlowAvailable}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Force Retrain
            </button>

            <button
              onClick={fetchModelState}
              disabled={isTraining}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </button>
          </div>

          {/* Training Information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Training Information</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• Models are trained on 1 year of historical GBP/JPY data</p>
              <p>• Features include price patterns, technical indicators, and volume analysis</p>
              <p>• Ensemble combines LSTM (time series) and feedforward (technical) models</p>
              <p>• Training typically takes 2-5 minutes depending on data size</p>
              <p>• Models automatically switch when TensorFlow.js accuracy exceeds mock predictor</p>
            </div>
          </div>

          {!isTensorFlowAvailable && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">TensorFlow.js Not Available</h3>
              <p className="text-xs text-yellow-700">
                TensorFlow.js is not available in this environment. ML training is disabled.
                This may be due to browser compatibility or missing dependencies.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
