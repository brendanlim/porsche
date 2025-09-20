'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface PriceRange {
  range: string;
  count: number;
  avgPrice: number;
  percentage?: number;
}

interface PriceDistributionChartProps {
  data: PriceRange[];
  title?: string;
  type?: 'bar' | 'pie';
  className?: string;
  loading?: boolean;
  error?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export function PriceDistributionChart({ 
  data, 
  title = "Price Distribution", 
  type = 'bar',
  className = "",
  loading = false,
  error
}: PriceDistributionChartProps) {
  
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
          <p>No distribution data available</p>
        </div>
      </div>
    );
  }

  // Calculate percentages
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const dataWithPercentages = data.map(item => ({
    ...item,
    percentage: total > 0 ? (item.count / total) * 100 : 0
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm text-blue-600">
            Count: {data.count} ({data.percentage?.toFixed(1)}%)
          </p>
          <p className="text-sm text-green-600">
            Avg Price: ${data.avgPrice?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-sm">{data.range}</p>
          <p className="text-sm text-blue-600">
            {data.count} listings ({data.percentage?.toFixed(1)}%)
          </p>
          <p className="text-sm text-green-600">
            Avg: ${data.avgPrice?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={dataWithPercentages} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]}
                name="Listings"
              />
            </BarChart>
          ) : (
            <PieChart>
              <Pie
                data={dataWithPercentages}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ payload }: any) => {
                  if (!payload || !payload.percentage || payload.percentage <= 5) return '';
                  return `${payload.range} (${payload.percentage.toFixed(1)}%)`;
                }}
                outerRadius={120}
                fill="#8884d8"
                dataKey="count"
              >
                {dataWithPercentages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-500">Total Listings</p>
          <p className="text-lg font-semibold text-gray-900">{total}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Avg Price</p>
          <p className="text-lg font-semibold text-gray-900">
            ${Math.round(dataWithPercentages.reduce((sum, item) => sum + item.avgPrice * item.count, 0) / total).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Most Common</p>
          <p className="text-lg font-semibold text-gray-900">
            {dataWithPercentages.reduce((max, item) => item.count > max.count ? item : max, dataWithPercentages[0])?.range}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Price Ranges</p>
          <p className="text-lg font-semibold text-gray-900">{dataWithPercentages.length}</p>
        </div>
      </div>
    </div>
  );
}