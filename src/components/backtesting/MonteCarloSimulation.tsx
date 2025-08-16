'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

interface MonteCarloResult {
  simulation: number;
  finalValue: number;
  maxDrawdown: number;
  path: Array<{ day: number; value: number }>;
}

interface MonteCarloStats {
  meanFinalValue: number;
  medianFinalValue: number;
  worstCase: number;
  bestCase: number;
  probabilityOfProfit: number;
  valueAtRisk95: number;
  maxDrawdownMean: number;
}

interface MonteCarloSimulationProps {
  initialCapital?: number;
  tradingDays?: number;
  numSimulations?: number;
  winRate?: number;
  avgWin?: number;
  avgLoss?: number;
}

export function MonteCarloSimulation({
  initialCapital = 10000,
  tradingDays = 252,
  numSimulations = 1000,
  winRate = 0.65,
  avgWin = 150,
  avgLoss = 100
}: MonteCarloSimulationProps) {
  const [results, setResults] = useState<MonteCarloResult[]>([]);
  const [stats, setStats] = useState<MonteCarloStats | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showPaths, setShowPaths] = useState(false);

  const runSimulation = async () => {
    setIsRunning(true);
    setResults([]);
    setStats(null);

    const simResults: MonteCarloResult[] = [];

    for (let sim = 0; sim < numSimulations; sim++) {
      let currentValue = initialCapital;
      let peak = initialCapital;
      let maxDrawdown = 0;
      const path: Array<{ day: number; value: number }> = [{ day: 0, value: initialCapital }];

      for (let day = 1; day <= tradingDays; day++) {
        const isWin = Math.random() < winRate;
        const tradeResult = isWin ? avgWin : -avgLoss;
        
        const volatility = 0.8 + Math.random() * 0.4;
        const adjustedResult = tradeResult * volatility;
        
        currentValue += adjustedResult;
        
        if (currentValue > peak) {
          peak = currentValue;
        }
        
        const drawdown = ((peak - currentValue) / peak) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }

        if (day % 10 === 0 || day === tradingDays) {
          path.push({ day, value: currentValue });
        }
      }

      simResults.push({
        simulation: sim,
        finalValue: currentValue,
        maxDrawdown,
        path
      });

      if (sim % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    const finalValues = simResults.map(r => r.finalValue).sort((a, b) => a - b);
    const drawdowns = simResults.map(r => r.maxDrawdown);
    
    const calculatedStats: MonteCarloStats = {
      meanFinalValue: finalValues.reduce((sum, val) => sum + val, 0) / finalValues.length,
      medianFinalValue: finalValues[Math.floor(finalValues.length / 2)],
      worstCase: Math.min(...finalValues),
      bestCase: Math.max(...finalValues),
      probabilityOfProfit: (finalValues.filter(val => val > initialCapital).length / finalValues.length) * 100,
      valueAtRisk95: finalValues[Math.floor(finalValues.length * 0.05)],
      maxDrawdownMean: drawdowns.reduce((sum, val) => sum + val, 0) / drawdowns.length
    };

    setResults(simResults);
    setStats(calculatedStats);
    setIsRunning(false);
  };

  const getDistributionData = () => {
    if (!results.length) return [];

    const finalValues = results.map(r => r.finalValue);
    const min = Math.min(...finalValues);
    const max = Math.max(...finalValues);
    const bucketSize = (max - min) / 20;
    
    const buckets = Array.from({ length: 20 }, (_, i) => ({
      range: min + i * bucketSize,
      count: 0
    }));

    finalValues.forEach(value => {
      const bucketIndex = Math.min(Math.floor((value - min) / bucketSize), 19);
      buckets[bucketIndex].count++;
    });

    return buckets;
  };

  const getPathData = () => {
    if (!results.length || !showPaths) return [];

    const samplePaths = results.slice(0, 50);
    const maxDays = Math.max(...samplePaths.flatMap(r => r.path.map(p => p.day)));
    
    const pathData: Array<Record<string, number>> = [];
    for (let day = 0; day <= maxDays; day += 10) {
      const dayData: Record<string, number> = { day };
      samplePaths.forEach((result, index) => {
        const pathPoint = result.path.find(p => p.day === day);
        if (pathPoint) {
          dayData[`path${index}`] = pathPoint.value;
        }
      });
      pathData.push(dayData);
    }

    return pathData;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Monte Carlo Simulation</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPaths(!showPaths)}
              disabled={!results.length}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {showPaths ? 'Hide Paths' : 'Show Paths'}
            </button>
            <button
              onClick={runSimulation}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Simulation
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
          <div>
            <span className="text-gray-600">Initial Capital:</span>
            <div className="font-medium">{formatCurrency(initialCapital)}</div>
          </div>
          <div>
            <span className="text-gray-600">Trading Days:</span>
            <div className="font-medium">{tradingDays}</div>
          </div>
          <div>
            <span className="text-gray-600">Simulations:</span>
            <div className="font-medium">{numSimulations.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-gray-600">Win Rate:</span>
            <div className="font-medium">{(winRate * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mean Final Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.meanFinalValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average across all simulations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Probability of Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.probabilityOfProfit > 50 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.probabilityOfProfit.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Chance of ending profitable
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Value at Risk (95%)</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.valueAtRisk95)}
              </div>
              <p className="text-xs text-muted-foreground">
                5% chance of worse outcome
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Max Drawdown</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.maxDrawdownMean.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average maximum drawdown
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="bg-white rounded-lg border p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Final Value Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={getDistributionData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="range"
                  tickFormatter={(value) => formatCurrency(value)}
                  stroke="#666"
                />
                <YAxis stroke="#666" />
                <Tooltip 
                  formatter={(value, name) => [value, 'Frequency']}
                  labelFormatter={(value) => `Value: ${formatCurrency(Number(value))}`}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {showPaths && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Sample Simulation Paths</h4>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={getPathData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#666" />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)}
                    stroke="#666"
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(Number(value)), 'Simulation Path']}
                    labelFormatter={(value) => `Day ${value}`}
                  />
                  {Array.from({ length: 50 }, (_, i) => (
                    <Line
                      key={i}
                      type="monotone"
                      dataKey={`path${i}`}
                      stroke={`hsl(${(i * 137.5) % 360}, 70%, 50%)`}
                      strokeWidth={1}
                      dot={false}
                      strokeOpacity={0.6}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
