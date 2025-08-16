'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine
} from 'recharts';
import { getMarketData } from '@/lib/data/market-data';
import { 
  calculateIchimokuSeries, 
  calculateRSISeries, 
  calculateMACDSeries, 
  calculateBollingerSeries, 
  calculateFibonacciSeries, 
  calculateVolumeSeries 
} from '@/lib/indicators';
import { CandlestickShape } from './CandlestickShape';
import type { MarketDataPoint, PredictionData } from '@/lib/data/dummy-data';

interface ChartDataPoint extends MarketDataPoint {
  ichimokuTenkan?: number;
  ichimokuKijun?: number;
  ichimokuSpanA?: number;
  ichimokuSpanB?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
  fibonacci236?: number;
  fibonacci382?: number;
  fibonacci500?: number;
  fibonacci618?: number;
  fibonacci786?: number;
  volumeMA?: number;
  timestamp: number;
}

interface InteractiveChartProps {
  height?: number;
}

export function InteractiveChart({ height = 600 }: InteractiveChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [showIndicators, setShowIndicators] = useState({
    ichimoku: true,
    rsi: true,
    macd: true,
    bollinger: true,
    fibonacci: true,
    volume: true,
    predictions: true
  });

  const fetchPredictions = useCallback(async () => {
    try {
      const response = await fetch(`/api/predictions?forChart=true&limit=100`);
      const data = await response.json();
      if (data.success) {
        setPredictions(data.data.predictions);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  }, []);

  const fetchChartData = useCallback(async () => {
    try {
      setLoading(true);
      const days = parseInt(timeRange);
      const marketData = await getMarketData(days);
      
      const priceData = marketData.map(d => ({ high: d.high, low: d.low, close: d.close, volume: d.volume }));
      const closePrices = marketData.map(d => d.close);
      const volumes = marketData.map(d => d.volume || 0);
      
      const ichimokuSeries = calculateIchimokuSeries(priceData);
      const rsiSeries = calculateRSISeries(closePrices);
      const macdSeries = calculateMACDSeries(closePrices);
      const bollingerSeries = calculateBollingerSeries(closePrices);
      const fibonacciSeries = calculateFibonacciSeries(priceData);
      const volumeSeries = calculateVolumeSeries(volumes, closePrices);
      
      const combinedData: ChartDataPoint[] = marketData.map((point, index) => {
        const ichimokuIndex = Math.max(0, index - 51);
        const rsiIndex = Math.max(0, index - 13);
        const macdIndex = Math.max(0, index - 34);
        const bollingerIndex = Math.max(0, index - 19);
        const fibonacciIndex = Math.max(0, index - 19);
        const volumeIndex = Math.max(0, index - 19);
        
        return {
          ...point,
          timestamp: point.date.getTime(),
          ichimokuTenkan: ichimokuSeries[ichimokuIndex]?.tenkanSen,
          ichimokuKijun: ichimokuSeries[ichimokuIndex]?.kijunSen,
          ichimokuSpanA: ichimokuSeries[ichimokuIndex]?.senkouSpanA,
          ichimokuSpanB: ichimokuSeries[ichimokuIndex]?.senkouSpanB,
          rsi: rsiSeries[rsiIndex]?.value,
          macd: macdSeries[macdIndex]?.macd,
          macdSignal: macdSeries[macdIndex]?.signal,
          macdHistogram: macdSeries[macdIndex]?.histogram,
          bollingerUpper: bollingerSeries[bollingerIndex]?.upperBand,
          bollingerMiddle: bollingerSeries[bollingerIndex]?.middleBand,
          bollingerLower: bollingerSeries[bollingerIndex]?.lowerBand,
          fibonacci236: fibonacciSeries[fibonacciIndex]?.levels.level236,
          fibonacci382: fibonacciSeries[fibonacciIndex]?.levels.level382,
          fibonacci500: fibonacciSeries[fibonacciIndex]?.levels.level500,
          fibonacci618: fibonacciSeries[fibonacciIndex]?.levels.level618,
          fibonacci786: fibonacciSeries[fibonacciIndex]?.levels.level786,
          volumeMA: volumeSeries[volumeIndex]?.volumeMA
        };
      });
      
      setChartData(combinedData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchChartData();
    fetchPredictions();
  }, [fetchChartData, fetchPredictions]);

  const formatXAxisTick = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };


  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-lg border">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">1 Week</option>
            <option value="30">1 Month</option>
            <option value="90">3 Months</option>
            <option value="180">6 Months</option>
            <option value="365">1 Year</option>
          </select>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showIndicators.ichimoku}
              onChange={(e) => setShowIndicators(prev => ({ ...prev, ichimoku: e.target.checked }))}
              className="rounded"
            />
            Ichimoku Cloud
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showIndicators.rsi}
              onChange={(e) => setShowIndicators(prev => ({ ...prev, rsi: e.target.checked }))}
              className="rounded"
            />
            RSI
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showIndicators.macd}
              onChange={(e) => setShowIndicators(prev => ({ ...prev, macd: e.target.checked }))}
              className="rounded"
            />
            MACD
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showIndicators.bollinger}
              onChange={(e) => setShowIndicators(prev => ({ ...prev, bollinger: e.target.checked }))}
              className="rounded"
            />
            Bollinger Bands
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showIndicators.fibonacci}
              onChange={(e) => setShowIndicators(prev => ({ ...prev, fibonacci: e.target.checked }))}
              className="rounded"
            />
            Fibonacci
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showIndicators.volume}
              onChange={(e) => setShowIndicators(prev => ({ ...prev, volume: e.target.checked }))}
              className="rounded"
            />
            Volume
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showIndicators.predictions}
              onChange={(e) => setShowIndicators(prev => ({ ...prev, predictions: e.target.checked }))}
              className="rounded"
            />
            Predictions
          </label>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={formatXAxisTick}
              stroke="#666"
            />
            <YAxis 
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              stroke="#666"
            />
            <Tooltip 
              labelFormatter={(timestamp) => new Date(Number(timestamp)).toLocaleDateString()}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc',
                borderRadius: '8px'
              }}
            />
            <Legend />
            
            <Bar 
              dataKey="close" 
              name="candlestick"
              shape={<CandlestickShape />}
              fill="transparent"
            />
            
            {showIndicators.ichimoku && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="ichimokuTenkan" 
                  stroke="#3b82f6" 
                  strokeWidth={1}
                  name="Tenkan-sen"
                  dot={false}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="ichimokuKijun" 
                  stroke="#ef4444" 
                  strokeWidth={1}
                  name="Kijun-sen"
                  dot={false}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="ichimokuSpanA"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.1}
                  name="Senkou Span A"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="ichimokuSpanB"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.1}
                  name="Senkou Span B"
                  connectNulls={false}
                />
              </>
            )}
            
            {showIndicators.bollinger && (
              <>
                <Line 
                  type="monotone" 
                  dataKey="bollingerUpper" 
                  stroke="#8b5cf6" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  name="Bollinger Upper"
                  dot={false}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="bollingerMiddle" 
                  stroke="#6b7280" 
                  strokeWidth={1}
                  name="Bollinger Middle"
                  dot={false}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="bollingerLower" 
                  stroke="#8b5cf6" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  name="Bollinger Lower"
                  dot={false}
                  connectNulls={false}
                />
              </>
            )}
            
            {showIndicators.fibonacci && (
              <>
                <ReferenceLine y={chartData[chartData.length - 1]?.fibonacci236} stroke="#f59e0b" strokeDasharray="2 2" label="23.6%" />
                <ReferenceLine y={chartData[chartData.length - 1]?.fibonacci382} stroke="#f59e0b" strokeDasharray="2 2" label="38.2%" />
                <ReferenceLine y={chartData[chartData.length - 1]?.fibonacci500} stroke="#ef4444" strokeDasharray="2 2" label="50%" />
                <ReferenceLine y={chartData[chartData.length - 1]?.fibonacci618} stroke="#f59e0b" strokeDasharray="2 2" label="61.8%" />
                <ReferenceLine y={chartData[chartData.length - 1]?.fibonacci786} stroke="#f59e0b" strokeDasharray="2 2" label="78.6%" />
              </>
            )}
            
            {showIndicators.predictions && predictions.map((prediction, index) => (
              <ReferenceLine
                key={`prediction-${index}`}
                x={new Date(prediction.date).getTime()}
                stroke={prediction.direction === 'UP' ? '#10b981' : '#ef4444'}
                strokeDasharray="5 5"
                label={{
                  value: `${prediction.direction} (${(prediction.confidence * 100).toFixed(0)}%)`,
                  position: 'top'
                }}
              />
            ))}
            
            <Brush 
              dataKey="timestamp"
              height={30}
              stroke="#8884d8"
              tickFormatter={formatXAxisTick}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {showIndicators.rsi && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">RSI (14)</h3>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatXAxisTick}
                stroke="#666"
              />
              <YAxis domain={[0, 100]} stroke="#666" />
              <Tooltip 
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #ccc',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="rsi" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="RSI"
                dot={false}
                connectNulls={false}
              />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label="Overbought" />
              <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label="Oversold" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {showIndicators.macd && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">MACD (12,26,9)</h3>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatXAxisTick}
                stroke="#666"
              />
              <YAxis stroke="#666" />
              <Tooltip 
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #ccc',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="macd" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="MACD"
                dot={false}
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey="macdSignal" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Signal"
                dot={false}
                connectNulls={false}
              />
              <Bar 
                dataKey="macdHistogram" 
                fill="#10b981"
                name="Histogram"
              />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {showIndicators.volume && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Volume Analysis</h3>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatXAxisTick}
                stroke="#666"
              />
              <YAxis stroke="#666" />
              <Tooltip 
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #ccc',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="volume" 
                fill="#6b7280"
                name="Volume"
                fillOpacity={0.6}
              />
              <Line 
                type="monotone" 
                dataKey="volumeMA" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Volume MA"
                dot={false}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
