'use client';

import { Calendar } from 'lucide-react';

interface TimeRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimeRangeSelector({ value, onChange, className = '' }: TimeRangeSelectorProps) {
  const ranges = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
    { value: 'all', label: 'All Time' }
  ];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Calendar className="h-5 w-5 text-gray-500" />
      <div className="flex bg-gray-100 rounded-lg p-1">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => onChange(range.value)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-all
              ${value === range.value
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}