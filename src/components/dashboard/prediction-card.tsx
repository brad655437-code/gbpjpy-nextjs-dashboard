'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';

interface PredictionData {
  date: Date;
  predictedPrice: number;
  direction: 'UP' | 'DOWN';
  confidence: number;
  ichimokuSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  rsiValue: number;
}

export function PredictionCard() {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTodaysPrediction();
  }, []);

  const fetchTodaysPrediction = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/predict');
      const data = await response.json();
      
      if (data.success) {
        setPrediction(data.data.prediction);
      } else {
        setError(data.error || 'Failed to fetch prediction');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100">
        <CardContent className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-12 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="text-red-600 font-semibold mb-2">Error Loading Prediction</div>
            <div className="text-red-500 text-sm">{error}</div>
            <button 
              onClick={fetchTodaysPrediction}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            No prediction available
          </div>
        </CardContent>
      </Card>
    );
  }

  const isUpward = prediction.direction === 'UP';
  const confidencePercentage = Math.round(prediction.confidence * 100);
  
  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BULLISH': return 'text-green-600 bg-green-100';
      case 'BEARISH': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return 'text-red-600 bg-red-100';
    if (rsi <= 30) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  return (
    <Card className={`bg-gradient-to-br ${isUpward ? 'from-green-50 to-emerald-100 border-green-200' : 'from-red-50 to-rose-100 border-red-200'}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            Today's GBP/JPY Prediction
          </CardTitle>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isUpward ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                {isUpward ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                <span className="font-semibold">{prediction.direction}</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ¥{prediction.predictedPrice.toFixed(3)}
              </div>
              <div className="text-sm text-gray-600">Predicted Price</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-800 mb-1">
                {confidencePercentage}%
              </div>
              <div className="text-sm text-gray-600">Confidence</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${isUpward ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${confidencePercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Technical Indicators</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ichimoku Signal:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSignalColor(prediction.ichimokuSignal)}`}>
                    {prediction.ichimokuSignal}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">RSI Value:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRSIColor(prediction.rsiValue)}`}>
                    {prediction.rsiValue.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-50 rounded-lg p-3">
              <div className="text-xs text-gray-600 leading-relaxed">
                <strong>Strategy:</strong> Ichimoku + RSI analysis suggests {prediction.direction.toLowerCase()} movement 
                with {confidencePercentage}% confidence based on current cloud position and momentum indicators.
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200 bg-white bg-opacity-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 text-center">
            <strong>Disclaimer:</strong> This prediction is for educational purposes only and should not be used as financial advice. 
            Currency trading involves substantial risk and may not be suitable for all investors.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
