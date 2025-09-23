'use client';

import { TrendingUp, TrendingDown, DollarSign, Package, Activity } from 'lucide-react';

interface KPIData {
  totalSales: number;
  averagePrice: number;
  medianPrice: number;
  totalVolume: number;
  averageDaysToSell: number;
  topModel: string | null;
  topTrim: string | null;
  priceChange30d: number;
  volumeChange30d: number;
}

interface MetricsDashboardProps {
  data: KPIData;
  loading?: boolean;
}

export function MetricsDashboard({ data, loading = false }: MetricsDashboardProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatChange = (value: number) => {
    const absValue = Math.abs(value);
    const formatted = absValue < 1 ? absValue.toFixed(2) : absValue.toFixed(1);
    return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  const metrics = [
    {
      label: 'Total Sales',
      value: data.totalSales.toLocaleString(),
      icon: Package,
      color: 'blue',
      change: data.volumeChange30d,
      changeLabel: '30d change'
    },
    {
      label: 'Average Price',
      value: formatCurrency(data.averagePrice),
      icon: DollarSign,
      color: 'green',
      change: data.priceChange30d,
      changeLabel: '30d change'
    },
    {
      label: 'Median Price',
      value: formatCurrency(data.medianPrice),
      icon: Activity,
      color: 'purple',
      change: null
    },
    {
      label: 'Total Volume',
      value: formatCurrency(data.totalVolume),
      icon: TrendingUp,
      color: 'orange',
      change: null
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    pink: 'bg-pink-100 text-pink-600'
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const colorClass = colorClasses[metric.color as keyof typeof colorClasses];

        return (
          <div key={metric.label} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">{metric.label}</span>
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">
              {metric.value}
            </div>
            {metric.change !== null && (
              <div className="flex items-center">
                {metric.change >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatChange(metric.change)}
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  {metric.changeLabel}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}