'use client';

import React, { useState, useEffect } from 'react';
import { BacktestResults, EquityCurveChart, MonteCarloSimulation, StrategyComparison } from '@/components/backtesting';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, Calculator, ArrowLeft, GitCompare } from 'lucide-react';
import Link from 'next/link';

interface BacktestData {
  startDate: Date;
  endDate: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  avgWinAmount: number;
  avgLossAmount: number;
  profitFactor: number;
}

interface EquityPoint {
  date: Date;
  equity: number;
  drawdown: number;
  trade?: {
    type: 'win' | 'loss';
    amount: number;
    confidence: number;
  };
}

export default function BacktestingPage() {
  const [backtestData, setBacktestData] = useState<BacktestData | null>(null);
  const [equityData, setEquityData] = useState<EquityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('60');

  const fetchBacktestData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/performance?includeBacktest=true&period=${selectedPeriod}`);
      const data = await response.json();
      
      if (data.success && data.data.backtest) {
        const backtest = data.data.backtest;
        setBacktestData({
          startDate: new Date(backtest.startDate),
          endDate: new Date(backtest.endDate),
          totalTrades: backtest.totalTrades,
          winningTrades: backtest.winningTrades,
          losingTrades: backtest.losingTrades,
          totalReturn: backtest.totalReturn,
          maxDrawdown: backtest.maxDrawdown,
          sharpeRatio: backtest.sharpeRatio,
          winRate: backtest.winRate,
          avgWinAmount: backtest.avgWinAmount,
          avgLossAmount: backtest.avgLossAmount,
          profitFactor: backtest.profitFactor
        });

        const predictions = await fetch(`/api/predictions?limit=100&startDate=${backtest.startDate}&endDate=${backtest.endDate}`);
        const predData = await predictions.json();
        
        if (predData.success) {
          const equity = generateEquityCurve(predData.data.predictions);
          setEquityData(equity);
        }
      }
    } catch (error) {
      console.error('Error fetching backtest data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEquityCurve = (predictions: Array<{
    date: string;
    isCorrect: boolean;
    confidence: number;
  }>): EquityPoint[] => {
    let currentEquity = 10000;
    let peak = 10000;
    const equityPoints: EquityPoint[] = [];

    predictions.forEach((pred) => {
      const tradeResult = pred.isCorrect ? pred.confidence * 100 : -pred.confidence * 100;
      currentEquity += tradeResult;
      
      if (currentEquity > peak) peak = currentEquity;
      const drawdown = ((peak - currentEquity) / peak) * 100;

      equityPoints.push({
        date: new Date(pred.date),
        equity: currentEquity,
        drawdown,
        trade: {
          type: pred.isCorrect ? 'win' : 'loss',
          amount: tradeResult,
          confidence: pred.confidence
        }
      });
    });

    return equityPoints;
  };

  useEffect(() => {
    fetchBacktestData();
  }, [selectedPeriod, fetchBacktestData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Backtesting Analysis</h1>
              <p className="text-gray-600 mt-2">
                Comprehensive strategy performance analysis and risk metrics
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Backtest Period:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Backtest Results
            </h2>
            {backtestData ? (
              <BacktestResults data={backtestData} isLoading={loading} />
            ) : (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center text-gray-500">
                    {loading ? 'Loading backtest data...' : 'No backtest data available'}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              Equity Curve Analysis
            </h2>
            {equityData.length > 0 ? (
              <EquityCurveChart data={equityData} />
            ) : (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center text-gray-500">
                    {loading ? 'Generating equity curve...' : 'No equity data available'}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <GitCompare className="h-6 w-6 text-purple-600" />
              Strategy Comparison
            </h2>
            <StrategyComparison />
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calculator className="h-6 w-6 text-orange-600" />
              Monte Carlo Simulation
            </h2>
            {backtestData && (
              <MonteCarloSimulation
                initialCapital={10000}
                tradingDays={parseInt(selectedPeriod)}
                numSimulations={1000}
                winRate={backtestData.winRate / 100}
                avgWin={backtestData.avgWinAmount}
                avgLoss={backtestData.avgLossAmount}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
