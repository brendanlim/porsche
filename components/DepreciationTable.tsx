'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DepreciationData {
  mileageRange: string;
  listings: number;
  avgPrice: number;
  depreciationPercent: number;
  isBaseline?: boolean;
}

interface DepreciationByYear {
  year: number;
  ranges: {
    '0-5k': { price: number; listings: number; depreciation: number; isBase?: boolean };
    '5k-10k': { price: number; listings: number; depreciation: number; isBase?: boolean };
    '10k-20k': { price: number; listings: number; depreciation: number; isBase?: boolean };
    '20k+': { price: number; listings: number; depreciation: number; isBase?: boolean };
  };
}

interface DepreciationTableProps {
  data: DepreciationData[];
  yearData?: DepreciationByYear[];
  averageLossPerMile: number;
  trimName: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function getDepreciationColor(percent: number): string {
  const absPercent = Math.abs(percent);
  if (absPercent === 0) return 'text-gray-500';
  if (absPercent < 5) return 'text-green-600';
  if (absPercent < 10) return 'text-yellow-600';
  if (absPercent < 15) return 'text-orange-600';
  return 'text-red-600';
}

function getDepreciationBg(percent: number): string {
  const absPercent = Math.abs(percent);
  if (absPercent === 0) return 'bg-gray-50';
  if (absPercent < 5) return 'bg-green-50';
  if (absPercent < 10) return 'bg-yellow-50';
  if (absPercent < 15) return 'bg-orange-50';
  return 'bg-red-50';
}

export function DepreciationTable({ data, yearData, averageLossPerMile, trimName }: DepreciationTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Depreciation by Mileage</CardTitle>
        <CardDescription>
          Depreciation is calculated using regression analysis to isolate the impact of mileage from other factors like options and year
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Average Loss Highlight */}
        <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-lg">
          <p className="text-sm font-medium text-gray-700">
            Average Loss: <span className="text-xl font-bold text-red-600">{formatPrice(averageLossPerMile)}</span> per 1,000 miles
          </p>
        </div>

        {/* Main Depreciation Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Mileage Range</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Listings</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Avg Price</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Depreciation %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.filter(row => row.listings > 0).map((row) => (
                <tr key={row.mileageRange} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{row.mileageRange}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{row.listings}</td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900">
                    {formatPrice(row.avgPrice)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {row.isBaseline ? (
                      <span className="text-sm text-gray-500 italic">baseline</span>
                    ) : (
                      <span className={`font-bold ${getDepreciationColor(row.depreciationPercent)}`}>
                        {row.depreciationPercent > 0 ? '+' : ''}{row.depreciationPercent.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Year and Mileage Grid */}
        {yearData && yearData.length > 0 && (
          <>
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Depreciation by Year and Mileage</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Year</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">0-5k</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">5k-10k</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">10k-20k</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">20k+</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {yearData.map((year) => (
                      <tr key={year.year} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-900">{year.year}</td>
                        {['0-5k', '5k-10k', '10k-20k', '20k+'].map((range) => {
                          const data = year.ranges[range as keyof typeof year.ranges];
                          if (!data || data.listings === 0) {
                            return (
                              <td key={range} className="py-3 px-4 text-center text-gray-400">
                                -
                              </td>
                            );
                          }
                          return (
                            <td key={range} className="py-3 px-4">
                              <div className={`rounded-lg p-2 ${getDepreciationBg(data.depreciation)}`}>
                                {data.isBase ? (
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">base</div>
                                    <div className="font-semibold text-gray-900">{formatPrice(data.price)}</div>
                                    <div className="text-xs text-gray-500">n={data.listings}</div>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <div className={`font-bold ${getDepreciationColor(data.depreciation)}`}>
                                      {data.depreciation > 0 ? '+' : ''}{data.depreciation.toFixed(1)}%
                                    </div>
                                    <div className="font-semibold text-gray-900 text-sm">{formatPrice(data.price)}</div>
                                    <div className="text-xs text-gray-500">n={data.listings}</div>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">How to read:</p>
              <p className="text-xs text-gray-600 mb-2">
                Each cell shows depreciation for a specific model year. Colors indicate depreciation severity:
              </p>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-100 rounded border border-green-300"></div>
                  <span className="text-green-600 font-medium">0-5%</span>
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-100 rounded border border-yellow-300"></div>
                  <span className="text-yellow-600 font-medium">5-10%</span>
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-100 rounded border border-orange-300"></div>
                  <span className="text-orange-600 font-medium">10-15%</span>
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-100 rounded border border-red-300"></div>
                  <span className="text-red-600 font-medium">&gt;15%</span>
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}