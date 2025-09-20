'use client';

import React from 'react';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

interface ChartLoadingStateProps {
  type?: 'bar' | 'line' | 'pie' | 'radial';
  title?: string;
  className?: string;
}

export function ChartLoadingState({ 
  type = 'bar', 
  title = "Loading Chart...", 
  className = "" 
}: ChartLoadingStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'line':
        return <TrendingUp className="h-8 w-8 text-gray-400" />;
      case 'pie':
        return <PieChart className="h-8 w-8 text-gray-400" />;
      case 'radial':
        return <Activity className="h-8 w-8 text-gray-400" />;
      default:
        return <BarChart3 className="h-8 w-8 text-gray-400" />;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
      </div>
      
      <div className="h-80 flex flex-col items-center justify-center">
        <div className="animate-pulse mb-4">
          {getIcon()}
        </div>
        <div className="text-center">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
      </div>

      {/* Mock chart skeleton */}
      <div className="mt-4 space-y-2">
        {type === 'bar' && (
          <div className="flex items-end space-x-2 h-20">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="bg-gray-200 animate-pulse rounded-t" 
                style={{ 
                  height: `${Math.random() * 60 + 20}%`, 
                  width: '16.66%' 
                }}
              ></div>
            ))}
          </div>
        )}

        {type === 'line' && (
          <div className="relative h-20">
            <svg className="w-full h-full" viewBox="0 0 300 80">
              <path
                d="M 0 60 Q 75 20 150 40 T 300 30"
                stroke="#D1D5DB"
                strokeWidth="2"
                fill="none"
                className="animate-pulse"
              />
              {[0, 75, 150, 225, 300].map((x, i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={[60, 20, 40, 25, 30][i]}
                  r="3"
                  fill="#D1D5DB"
                  className="animate-pulse"
                />
              ))}
            </svg>
          </div>
        )}

        {(type === 'pie' || type === 'radial') && (
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full border-8 border-gray-200 border-t-gray-400 animate-spin"></div>
          </div>
        )}
      </div>

      {/* Loading stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse mx-auto"></div>
            <div className="h-6 bg-gray-200 rounded w-12 animate-pulse mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChartErrorStateProps {
  title?: string;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export function ChartErrorState({ 
  title = "Chart Error", 
  error = "Failed to load chart data", 
  onRetry,
  className = "" 
}: ChartErrorStateProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="h-80 flex flex-col items-center justify-center">
        <div className="text-red-500 mb-4">
          <BarChart3 className="h-12 w-12" />
        </div>
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}