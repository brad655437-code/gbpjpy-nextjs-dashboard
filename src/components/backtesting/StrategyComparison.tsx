'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StrategyMetrics {
  name: string;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
}

export function StrategyComparison() {
  const [strategies] = useState<StrategyMetrics[]>([
    {
      name: 'Ichimoku + RSI',
      winRate: 65.2,
      totalReturn: 1247.50,
      maxDrawdown: -234.80,
      sharpeRatio: 1.34,
      profitFactor: 1.85,
      avgWin: 145.30,
      avgLoss: -78.50
    },
    {
      name: 'RSI Only',
      winRate: 58.7,
      totalReturn: 892.30,
      maxDrawdown: -312.40,
      sharpeRatio: 0.98,
      profitFactor: 1.42,
      avgWin: 132.10,
      avgLoss: -93.20
    },
    {
      name: 'Ichimoku Only',
      winRate: 61.4,
      totalReturn: 1034.70,
      maxDrawdown: -278.90,
      sharpeRatio: 1.12,
      profitFactor: 1.67,
      avgWin: 138.90,
      avgLoss: -83.40
    }
  ]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Strategy Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Strategy</th>
                  <th className="text-right p-2">Win Rate</th>
                  <th className="text-right p-2">Total Return</th>
                  <th className="text-right p-2">Max Drawdown</th>
                  <th className="text-right p-2">Sharpe Ratio</th>
                  <th className="text-right p-2">Profit Factor</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((strategy, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{strategy.name}</td>
                    <td className="p-2 text-right">{formatPercentage(strategy.winRate)}</td>
                    <td className={`p-2 text-right ${strategy.totalReturn > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(strategy.totalReturn)}
                    </td>
                    <td className="p-2 text-right text-red-600">{formatCurrency(strategy.maxDrawdown)}</td>
                    <td className="p-2 text-right">{strategy.sharpeRatio.toFixed(2)}</td>
                    <td className="p-2 text-right">{strategy.profitFactor.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Win Rate Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={strategies}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                <Bar dataKey="winRate" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Return Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={strategies}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="totalReturn" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
