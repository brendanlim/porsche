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
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TrendDataPoint {
  date: string;
  averagePrice: number;
  listingCount: number;
  period?: string;
}

interface MarketTrendsChartProps {
  data: TrendDataPoint[];
  title?: string;
  className?: string;
  loading?: boolean;
  error?: string;
}

export function MarketTrendsChart({ 
  data, 
  title = "Market Price Trends", 
  className = "",
  loading = false,
  error 
}: MarketTrendsChartProps) {
  
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-80 flex items-center justify-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No trend data available</p>
        </div>
      </div>
    );
  }

  // Calculate trend percentage
  const firstPrice = data[0]?.averagePrice || 0;
  const lastPrice = data[data.length - 1]?.averagePrice || 0;
  const trendPercent = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const isPositiveTrend = trendPercent > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm text-blue-600">
            Avg Price: ${data.averagePrice?.toLocaleString()}
          </p>
          <p className="text-sm text-green-600">
            Sales: {data.listingCount}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          {isPositiveTrend ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600" />
          )}
          <span className={`text-sm font-medium ${
            isPositiveTrend ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositiveTrend ? '+' : ''}{trendPercent.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis 
              yAxisId="price"
              orientation="left"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              yAxisId="count"
              orientation="right"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="averagePrice"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
              name="Average Price"
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="listingCount"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', strokeWidth: 1, r: 3 }}
              name="Sales Volume"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}