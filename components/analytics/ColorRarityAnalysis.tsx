'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, TrendingUp, Star, AlertCircle } from 'lucide-react';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ColorData {
  color: string;
  count: number;
  frequency: number;
  avgPrice: number;
  pricePremium: number;
  isPTS: boolean;
  hexCode?: string;
}

interface ColorRarityAnalysisProps {
  model?: string;
  trim?: string;
}

export function ColorRarityAnalysis({ model, trim }: ColorRarityAnalysisProps) {
  const [colorData, setColorData] = useState<ColorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'bubble' | 'heatmap' | 'treemap'>('bubble');

  useEffect(() => {
    fetchColorData();
  }, [model, trim]);

  const fetchColorData = async () => {
    try {
      let url = '/api/analytics/color-rarity';
      const params = new URLSearchParams();
      if (model) params.append('model', model);
      if (trim) params.append('trim', trim);

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();
      setColorData(data.colors || []);
    } catch (error) {
      console.error('Failed to fetch color data:', error);
      setColorData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Bubble chart configuration
  const bubbleChartOptions: any = {
    chart: {
      type: 'bubble',
      toolbar: {
        show: true,
      },
      animations: {
        enabled: true,
      }
    },
    plotOptions: {
      bubble: {
        zScaling: true,
        minBubbleRadius: 5,
        maxBubbleRadius: 40,
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: any, opts: any) => {
        const point = colorData[opts.dataPointIndex];
        return point.frequency > 5 ? point.color.split(' ')[0] : '';
      },
      style: {
        fontSize: '11px',
        fontWeight: 600,
        colors: ['#FFFFFF']
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.4,
        inverseColors: false,
        opacityFrom: 0.9,
        opacityTo: 0.6,
      }
    },
    xaxis: {
      title: {
        text: 'Rarity (% of Market)',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        }
      },
      labels: {
        formatter: (val: number) => formatPercent(val),
      },
      min: 0,
      max: Math.max(...colorData.map(c => c.frequency)) * 1.1,
      tickAmount: 6,
    },
    yaxis: {
      title: {
        text: 'Price Premium (%)',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        }
      },
      labels: {
        formatter: (val: number) => `+${formatPercent(val)}`,
      },
      min: Math.min(0, ...colorData.map(c => c.pricePremium)) * 1.1,
      max: Math.max(...colorData.map(c => c.pricePremium)) * 1.1,
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
    },
    legend: {
      show: true,
      position: 'top',
    },
    tooltip: {
      theme: 'light',
      custom: function({ series, seriesIndex, dataPointIndex }: any) {
        const color = colorData[dataPointIndex];
        return `
          <div class="p-3 bg-white border rounded-lg shadow-lg">
            <div class="font-semibold text-gray-900 flex items-center gap-2">
              ${color.isPTS ? '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">PTS</span>' : ''}
              ${color.color}
            </div>
            <div class="mt-2 space-y-1 text-sm">
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Frequency:</span>
                <span class="font-medium">${formatPercent(color.frequency)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Avg Price:</span>
                <span class="font-medium">${formatCurrency(color.avgPrice)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Premium:</span>
                <span class="font-medium text-green-600">+${formatPercent(color.pricePremium)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Count:</span>
                <span class="font-medium">${color.count} cars</span>
              </div>
            </div>
          </div>
        `;
      }
    },
  };

  // Prepare bubble chart data
  const bubbleSeries = [
    {
      name: 'Standard Colors',
      data: colorData.filter(c => !c.isPTS).map(c => ({
        x: c.frequency,
        y: c.pricePremium,
        z: c.count * 2, // Scale for visibility
      }))
    },
    {
      name: 'PTS Colors',
      data: colorData.filter(c => c.isPTS).map(c => ({
        x: c.frequency,
        y: c.pricePremium,
        z: c.count * 2, // Scale for visibility
      }))
    }
  ];

  // Heat map configuration for color frequency
  const heatmapOptions: any = {
    chart: {
      type: 'heatmap',
      toolbar: {
        show: true,
      }
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 2,
        useFillColorAsStroke: true,
        colorScale: {
          ranges: [
            { from: 0, to: 1, name: 'Ultra Rare (<1%)', color: '#7C3AED' },
            { from: 1, to: 3, name: 'Very Rare (1-3%)', color: '#DC2626' },
            { from: 3, to: 10, name: 'Rare (3-10%)', color: '#F59E0B' },
            { from: 10, to: 20, name: 'Uncommon (10-20%)', color: '#3B82F6' },
            { from: 20, to: 100, name: 'Common (>20%)', color: '#10B981' },
          ]
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        colors: ['#FFFFFF']
      }
    },
    xaxis: {
      type: 'category',
      categories: ['Color Distribution'],
    },
    yaxis: {
      categories: colorData.slice(0, 20).map(c => c.color),
    },
    grid: {
      padding: {
        right: 20
      }
    },
    tooltip: {
      custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
        const color = colorData[dataPointIndex];
        return `
          <div class="p-3 bg-white border rounded-lg shadow-lg">
            <div class="font-semibold">${color.color}</div>
            <div class="text-sm mt-1">
              <div>Frequency: ${formatPercent(color.frequency)}</div>
              <div>Count: ${color.count} cars</div>
            </div>
          </div>
        `;
      }
    }
  };

  const heatmapSeries = [{
    name: 'Frequency',
    data: colorData.slice(0, 20).map((c, idx) => ({
      x: 'Color Distribution',
      y: c.frequency,
    }))
  }];

  // Treemap configuration
  const treemapOptions: any = {
    chart: {
      type: 'treemap',
      toolbar: {
        show: false,
      }
    },
    plotOptions: {
      treemap: {
        distributed: true,
        enableShades: true,
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            { from: -10, to: 0, color: '#EF4444' },
            { from: 0, to: 5, color: '#F59E0B' },
            { from: 5, to: 10, color: '#10B981' },
            { from: 10, to: 20, color: '#3B82F6' },
            { from: 20, to: 100, color: '#7C3AED' },
          ]
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
      },
      formatter: (text: string, op: any) => {
        const color = colorData[op.dataPointIndex];
        return [color.color, `${formatPercent(color.frequency)}`];
      },
      offsetY: -4
    },
    tooltip: {
      custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
        const color = colorData[dataPointIndex];
        return `
          <div class="p-3 bg-white border rounded-lg shadow-lg">
            <div class="font-semibold">${color.color}</div>
            <div class="text-sm mt-1 space-y-1">
              <div>Frequency: ${formatPercent(color.frequency)}</div>
              <div>Premium: +${formatPercent(color.pricePremium)}</div>
              <div>Avg Price: ${formatCurrency(color.avgPrice)}</div>
            </div>
          </div>
        `;
      }
    }
  };

  const treemapSeries = [{
    data: colorData.slice(0, 15).map(c => ({
      x: c.color,
      y: c.count
    }))
  }];

  // Find interesting color insights
  const rareColors = colorData.filter(c => c.frequency < 3);
  const ptsColors = colorData.filter(c => c.isPTS);
  const highPremiumColors = colorData.filter(c => c.pricePremium > 10);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Color Rarity & Premium Analysis</CardTitle>
          <CardDescription>Loading color data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Color Rarity & Premium Analysis
            </CardTitle>
            <CardDescription>
              Color distribution and price impact across {colorData.reduce((sum, c) => sum + c.count, 0).toLocaleString()} vehicles
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('bubble')}
              className={`px-3 py-1 text-sm border rounded-lg ${viewMode === 'bubble' ? 'bg-blue-50 border-blue-300' : ''}`}
            >
              Bubble
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1 text-sm border rounded-lg ${viewMode === 'heatmap' ? 'bg-blue-50 border-blue-300' : ''}`}
            >
              Heatmap
            </button>
            <button
              onClick={() => setViewMode('treemap')}
              className={`px-3 py-1 text-sm border rounded-lg ${viewMode === 'treemap' ? 'bg-blue-50 border-blue-300' : ''}`}
            >
              Treemap
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
              <Star className="h-4 w-4" />
              Ultra Rare Colors
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-purple-600">{rareColors.length}</div>
              <div className="text-sm text-gray-600">Less than 3% frequency</div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-700">
              <Palette className="h-4 w-4" />
              PTS Colors
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-yellow-600">{ptsColors.length}</div>
              <div className="text-sm text-gray-600">Paint to Sample options</div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <TrendingUp className="h-4 w-4" />
              High Premium Colors
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-green-600">{highPremiumColors.length}</div>
              <div className="text-sm text-gray-600">&gt;10% price premium</div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <AlertCircle className="h-4 w-4" />
              Most Common
            </div>
            <div className="mt-2">
              <div className="text-lg font-bold text-blue-600">{colorData[0]?.color}</div>
              <div className="text-sm text-gray-600">{formatPercent(colorData[0]?.frequency || 0)} of market</div>
            </div>
          </div>
        </div>

        {/* Main Chart */}
        <div className="w-full h-[500px]">
          {viewMode === 'bubble' && (
            <ApexChart
              options={bubbleChartOptions}
              series={bubbleSeries}
              type="bubble"
              height={500}
            />
          )}
          {viewMode === 'heatmap' && (
            <ApexChart
              options={heatmapOptions}
              series={heatmapSeries}
              type="heatmap"
              height={500}
            />
          )}
          {viewMode === 'treemap' && (
            <ApexChart
              options={treemapOptions}
              series={treemapSeries}
              type="treemap"
              height={500}
            />
          )}
        </div>

        {/* Color Details Table */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Color Distribution Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {colorData.slice(0, 20).map((color, idx) => (
              <div
                key={idx}
                className="p-3 border rounded-lg hover:shadow-md transition-shadow"
                style={{
                  borderColor: color.hexCode || '#E5E7EB',
                  backgroundColor: color.frequency < 5 ? '#FAF5FF' : '#FFFFFF'
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      {color.color}
                    </div>
                    {color.isPTS && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded mt-1 inline-block">
                        PTS
                      </span>
                    )}
                  </div>
                  {color.hexCode && (
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: color.hexCode }}
                    />
                  )}
                </div>
                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <div>Frequency: {formatPercent(color.frequency)}</div>
                  <div>Premium: <span className="text-green-600 font-medium">+{formatPercent(color.pricePremium)}</span></div>
                  <div>Count: {color.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}