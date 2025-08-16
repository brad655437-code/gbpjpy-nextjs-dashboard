'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, DollarSign, AlertTriangle, BarChart3 } from 'lucide-react';

interface PerformanceData {
  overall: {
    accuracy: number;
    totalPredictions: number;
    correctPredictions: number;
    avgConfidence: number;
    profitLoss: number;
    maxDrawdown: number;
    winRate: number;
    lastUpdated: string;
  };
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
}

export function PerformanceMetrics() {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  useEffect(() => {
    fetchPerformanceData();
  }, [selectedPeriod]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/performance?period=${selectedPeriod}`);
      const data = await response.json();
      
      if (data.success) {
        setPerformance(data.data);
      } else {
        setError(data.error || 'Failed to fetch performance data');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-red-600 font-semibold mb-2">Error Loading Performance</div>
            <div className="text-red-500 text-sm mb-4">{error}</div>
            <button 
              onClick={fetchPerformanceData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!performance) return null;

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 75) return 'text-green-600';
    if (accuracy >= 65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className={`text-2xl font-bold ${getAccuracyColor(performance.period.accuracy)}`}>
              {performance.period.accuracy}%
            </div>
            <div className="text-sm text-gray-600">Accuracy</div>
            <div className="text-xs text-gray-500 mt-1">
              {performance.period.correctPredictions}/{performance.period.totalPredictions} correct
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className={`text-2xl font-bold ${getPnLColor(performance.period.profitLoss)}`}>
              {performance.period.profitLoss >= 0 ? '+' : ''}${performance.period.profitLoss}
            </div>
            <div className="text-sm text-gray-600">P&L</div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedPeriod} days
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">
              {performance.streaks.current}
            </div>
            <div className="text-sm text-gray-600">Current Streak</div>
            <div className="text-xs text-gray-500 mt-1">
              consecutive wins
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">
              {performance.overall.maxDrawdown.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Max Drawdown</div>
            <div className="text-xs text-gray-500 mt-1">
              worst decline
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Overall Statistics</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Predictions:</span>
                <span className="font-medium">{performance.overall.totalPredictions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Win Rate:</span>
                <span className={`font-medium ${getAccuracyColor(performance.overall.winRate)}`}>
                  {performance.overall.winRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Confidence:</span>
                <span className="font-medium">{(performance.overall.avgConfidence * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total P&L:</span>
                <span className={`font-medium ${getPnLColor(performance.overall.profitLoss)}`}>
                  ${performance.overall.profitLoss}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Streak Records</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Longest Win Streak:</span>
                <span className="font-medium text-green-600">{performance.streaks.longestWin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Longest Loss Streak:</span>
                <span className="font-medium text-red-600">{performance.streaks.longestLoss}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Streak:</span>
                <span className="font-medium">{performance.streaks.current} wins</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Last updated: {new Date(performance.overall.lastUpdated).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
