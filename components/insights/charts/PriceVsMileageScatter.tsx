'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ScatterData {
  mileage: number;
  price: number;
  trim?: string;
  year?: number;
  model?: string;
}

interface PriceVsMileageScatterProps {
  data: ScatterData[];
  className?: string;
  height?: number;
}

export function PriceVsMileageScatter({ data, className = '', height = 400 }: PriceVsMileageScatterProps) {
  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const formatMileage = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">
            {data.year} {data.model} {data.trim}
          </p>
          <p className="text-sm text-blue-600">
            Price: {formatPrice(data.price)}
          </p>
          <p className="text-sm text-gray-600">
            Mileage: {data.mileage.toLocaleString()} miles
          </p>
        </div>
      );
    }
    return null;
  };

  // Group data by trim for different colors
  const trimGroups = new Map<string, ScatterData[]>();
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  data.forEach(item => {
    const trim = item.trim || 'Base';
    if (!trimGroups.has(trim)) {
      trimGroups.set(trim, []);
    }
    trimGroups.get(trim)!.push(item);
  });

  // Take top 7 trims by count
  const topTrims = Array.from(trimGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 7);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="mileage"
            type="number"
            name="Mileage"
            tick={{ fontSize: 12 }}
            tickFormatter={formatMileage}
            label={{ value: 'Mileage', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            dataKey="price"
            type="number"
            name="Price"
            tick={{ fontSize: 12 }}
            tickFormatter={formatPrice}
            label={{ value: 'Price', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          {topTrims.map(([trim, trimData], index) => (
            <Scatter
              key={trim}
              name={trim}
              data={trimData}
              fill={colors[index % colors.length]}
              fillOpacity={0.6}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}