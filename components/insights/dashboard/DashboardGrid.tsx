'use client';

import { ReactNode } from 'react';

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export function DashboardGrid({ children, className = '' }: DashboardGridProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {children}
    </div>
  );
}

interface GridSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  fullWidth?: boolean;
}

export function GridSection({
  title,
  description,
  children,
  className = '',
  columns = 2,
  fullWidth = false
}: GridSectionProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  };

  return (
    <div className={`${fullWidth ? '' : 'max-w-7xl mx-auto'} ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-xl font-semibold text-gray-900">{title}</h2>}
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
      )}
      <div className={`grid ${gridCols[columns]} gap-6`}>
        {children}
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
  noPadding?: boolean;
}

export function ChartCard({
  title,
  description,
  children,
  className = '',
  fullHeight = false,
  noPadding = false
}: ChartCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow ${fullHeight ? 'h-full' : ''} ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
}