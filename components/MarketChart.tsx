'use client';

import React, { useState, useEffect } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatPrice, formatMileage } from '@/lib/utils';
import { ChartDataPoint } from '@/lib/types/database';

interface MarketChartProps {
  data: ChartDataPoint[];
  isBlurred?: boolean;
  onPointClick?: (point: ChartDataPoint) => void;
}

export function MarketChart({ data, isBlurred = false, onPointClick }: MarketChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{data.title}</p>
          <p className="text-sm">Price: {formatPrice(data.y)}</p>
          <p className="text-sm">Mileage: {formatMileage(data.x)}</p>
          {data.color && <p className="text-sm">Color: {data.color}</p>}
          {data.vin && <p className="text-xs text-gray-500">VIN: {data.vin}</p>}
          {data.source && <p className="text-xs text-gray-500">Source: {data.source}</p>}
        </div>
      );
    }
    return null;
  };

  const handlePointClick = (data: any) => {
    if (onPointClick && data && data.payload) {
      onPointClick(data.payload);
    }
  };

  return (
    <div className={`relative w-full h-[600px] ${isBlurred ? 'select-none' : ''}`}>
      {isBlurred && (
        <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-white/5 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md">
            <h3 className="text-2xl font-bold mb-4">Unlock Market Data</h3>
            <p className="text-gray-600 mb-6">
              Subscribe to access comprehensive market analysis, price trends, and detailed vehicle history.
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              Start Free Trial
            </button>
          </div>
        </div>
      )}
      
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            type="number"
            dataKey="x"
            name="Mileage"
            unit=" mi"
            domain={['dataMin - 1000', 'dataMax + 1000']}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            label={{ value: 'Mileage', position: 'insideBottom', offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Price"
            domain={['dataMin - 5000', 'dataMax + 5000']}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            label={{ value: 'Price', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Scatter
            name="Listings"
            data={data}
            fill="#3B82F6"
            fillOpacity={0.6}
            onClick={handlePointClick}
            onMouseEnter={(data: any) => setHoveredPoint(data)}
            onMouseLeave={() => setHoveredPoint(null)}
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              const isHovered = hoveredPoint === payload;
              const isPTS = payload.isPTS;
              
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 8 : isPTS ? 6 : 4}
                  fill={isPTS ? '#F59E0B' : '#3B82F6'}
                  fillOpacity={isHovered ? 0.9 : 0.6}
                  stroke={isHovered ? '#1F2937' : 'none'}
                  strokeWidth={isHovered ? 2 : 0}
                  style={{ cursor: 'pointer' }}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}