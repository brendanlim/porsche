'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendingModel {
  model: string;
  trim?: string;
  trend_direction: 'up' | 'down' | 'stable';
  volume_change: number;
  price_change: number;
  interest_score: number;
  time_on_market_change: number;
  reasoning: string;
}

interface ModelPerformanceChartProps {
  data: TrendingModel[];
  title?: string;
  className?: string;
}

export function ModelPerformanceChart({ 
  data, 
  title = "Model Performance Analysis", 
  className = "" 
}: ModelPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No model performance data available</p>
        </div>
      </div>
    );
  }

  // Prepare data for chart
  const chartData = data.map(model => ({
    name: `${model.model} ${model.trim || ''}`.trim(),
    priceChange: model.price_change,
    volumeChange: model.volume_change,
    interestScore: model.interest_score,
    timeOnMarketChange: model.time_on_market_change,
    trend: model.trend_direction,
    reasoning: model.reasoning
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              Price Change: {data.priceChange > 0 ? '+' : ''}{data.priceChange.toFixed(1)}%
            </p>
            <p className="text-green-600">
              Volume Change: {data.volumeChange > 0 ? '+' : ''}{data.volumeChange.toFixed(1)}%
            </p>
            <p className="text-purple-600">
              Interest Score: {data.interestScore.toFixed(1)}
            </p>
            <p className="text-orange-600">
              Time on Market: {data.timeOnMarketChange > 0 ? '+' : ''}{data.timeOnMarketChange.toFixed(1)}%
            </p>
          </div>
          {data.reasoning && (
            <p className="text-xs text-gray-600 mt-2 border-t pt-2">
              {data.reasoning}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 5, right: 20, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              yAxisId="percentage"
              orientation="left"
              tick={{ fontSize: 12 }}
              label={{ value: 'Change (%)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="score"
              orientation="right"
              tick={{ fontSize: 12 }}
              label={{ value: 'Interest Score', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Bar 
              yAxisId="percentage"
              dataKey="priceChange" 
              fill="#3B82F6" 
              name="Price Change (%)"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              yAxisId="percentage"
              dataKey="volumeChange" 
              fill="#10B981" 
              name="Volume Change (%)"
              radius={[2, 2, 0, 0]}
            />
            <Line 
              yAxisId="score"
              type="monotone" 
              dataKey="interestScore" 
              stroke="#8B5CF6" 
              strokeWidth={3}
              dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
              name="Interest Score"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Model summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.slice(0, 6).map((model, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{model.model} {model.trim}</h4>
              {getTrendIcon(model.trend_direction)}
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Price:</span>
                <span className={model.price_change > 0 ? 'text-green-600' : model.price_change < 0 ? 'text-red-600' : 'text-gray-600'}>
                  {model.price_change > 0 ? '+' : ''}{model.price_change.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Volume:</span>
                <span className={model.volume_change > 0 ? 'text-green-600' : model.volume_change < 0 ? 'text-red-600' : 'text-gray-600'}>
                  {model.volume_change > 0 ? '+' : ''}{model.volume_change.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Interest:</span>
                <span className="text-purple-600">{model.interest_score.toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}