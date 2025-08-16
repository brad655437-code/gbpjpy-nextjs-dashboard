'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

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

interface EquityCurveChartProps {
  data: EquityPoint[];
  height?: number;
}

export function EquityCurveChart({ data, height = 400 }: EquityCurveChartProps) {
  const formatXAxisTick = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTooltip = (value: number, name: string) => {
    if (name === 'equity') {
      return [`$${value.toFixed(2)}`, 'Portfolio Value'];
    }
    if (name === 'drawdown') {
      return [`${value.toFixed(2)}%`, 'Drawdown'];
    }
    return [value, name];
  };

  const chartData = data.map(point => ({
    timestamp: point.date.getTime(),
    equity: point.equity,
    drawdown: point.drawdown,
    trade: point.trade
  }));

  const maxEquity = Math.max(...data.map(d => d.equity));
  const minEquity = Math.min(...data.map(d => d.equity));
  const maxDrawdown = Math.max(...data.map(d => d.drawdown));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Equity Curve</h3>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              domain={[minEquity * 0.95, maxEquity * 1.05]}
              stroke="#666"
            />
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(timestamp) => new Date(Number(timestamp)).toLocaleDateString()}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc',
                borderRadius: '8px'
              }}
            />
            
            <Line 
              type="monotone" 
              dataKey="equity" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="equity"
              dot={false}
              connectNulls={false}
            />
            
            <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Drawdown Chart</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              domain={[0, maxDrawdown * 1.1]}
              stroke="#666"
            />
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(timestamp) => new Date(Number(timestamp)).toLocaleDateString()}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc',
                borderRadius: '8px'
              }}
            />
            
            <Line 
              type="monotone" 
              dataKey="drawdown" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="drawdown"
              dot={false}
              connectNulls={false}
              fill="#ef4444"
              fillOpacity={0.1}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
