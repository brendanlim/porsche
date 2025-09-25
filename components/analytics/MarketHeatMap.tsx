'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, TrendingUp, TrendingDown, AlertCircle, Activity } from 'lucide-react';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface MarketSegment {
  model: string;
  trim: string;
  temperature: number; // 0-100 scale
  momentum: number; // -100 to +100
  volume: number;
  avgPrice: number;
  priceChange: number;
  daysOnMarket: number;
  inventoryChange: number;
}

interface MarketHeatMapProps {
  timeRange?: string;
}

export function MarketHeatMap({ timeRange = '30d' }: MarketHeatMapProps) {
  const [marketData, setMarketData] = useState<MarketSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'temperature' | 'momentum' | 'volume'>('temperature');

  useEffect(() => {
    fetchMarketData();
  }, [timeRange, selectedMetric]);

  const fetchMarketData = async () => {
    try {
      const response = await fetch(`/api/analytics/market-heatmap?range=${timeRange}`);
      const data = await response.json();
      setMarketData(data.segments || []);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      setMarketData([]);
    } finally {
      setLoading(false);
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp >= 80) return '#DC2626'; // Red - Very Hot
    if (temp >= 60) return '#F59E0B'; // Orange - Hot
    if (temp >= 40) return '#10B981'; // Green - Warm
    if (temp >= 20) return '#3B82F6'; // Blue - Cool
    return '#6B7280'; // Gray - Cold
  };

  const getTemperatureLabel = (temp: number) => {
    if (temp >= 80) return 'Very Hot';
    if (temp >= 60) return 'Hot';
    if (temp >= 40) return 'Warm';
    if (temp >= 20) return 'Cool';
    return 'Cold';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare heatmap data
  const models = [...new Set(marketData.map(s => s.model))];
  const trims = [...new Set(marketData.map(s => s.trim))];

  // Main heatmap configuration
  const heatmapOptions: any = {
    chart: {
      type: 'heatmap',
      toolbar: {
        show: true,
      },
      animations: {
        enabled: true,
        speed: 400,
      }
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 4,
        useFillColorAsStroke: false,
        colorScale: {
          ranges: [
            { from: 0, to: 20, name: 'Cold', color: '#6B7280' },
            { from: 20, to: 40, name: 'Cool', color: '#3B82F6' },
            { from: 40, to: 60, name: 'Warm', color: '#10B981' },
            { from: 60, to: 80, name: 'Hot', color: '#F59E0B' },
            { from: 80, to: 100, name: 'Very Hot', color: '#DC2626' },
          ]
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontWeight: 600,
        colors: ['#FFFFFF']
      },
      formatter: (val: number) => {
        if (selectedMetric === 'temperature') return val.toFixed(0);
        if (selectedMetric === 'momentum') return `${val > 0 ? '+' : ''}${val.toFixed(0)}%`;
        return val.toFixed(0);
      }
    },
    xaxis: {
      type: 'category',
      categories: trims,
      title: {
        text: 'Trim Level',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        }
      }
    },
    yaxis: {
      categories: models,
      title: {
        text: 'Model',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        }
      }
    },
    grid: {
      padding: {
        right: 20
      }
    },
    tooltip: {
      theme: 'light',
      custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
        const segment = marketData.find(s =>
          s.model === models[seriesIndex] && s.trim === trims[dataPointIndex]
        );
        if (!segment) return '';

        return `
          <div class="p-3 bg-white border rounded-lg shadow-lg">
            <div class="font-semibold text-gray-900">${segment.model} ${segment.trim}</div>
            <div class="mt-2 space-y-1 text-sm">
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Temperature:</span>
                <span class="font-medium">${segment.temperature.toFixed(0)}/100</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Momentum:</span>
                <span class="font-medium ${segment.momentum > 0 ? 'text-green-600' : 'text-red-600'}">
                  ${segment.momentum > 0 ? '+' : ''}${segment.momentum.toFixed(1)}%
                </span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Volume:</span>
                <span class="font-medium">${segment.volume} listings</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Avg Price:</span>
                <span class="font-medium">${formatCurrency(segment.avgPrice)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Days on Market:</span>
                <span class="font-medium">${segment.daysOnMarket} days</span>
              </div>
            </div>
          </div>
        `;
      }
    }
  };

  const heatmapSeries = models.map(model => ({
    name: model,
    data: trims.map(trim => {
      const segment = marketData.find(s => s.model === model && s.trim === trim);
      if (!segment) return 0;

      if (selectedMetric === 'temperature') return segment.temperature;
      if (selectedMetric === 'momentum') return Math.abs(segment.momentum);
      return segment.volume;
    })
  }));

  // Radar chart for market momentum
  const radarOptions: any = {
    chart: {
      type: 'radar',
      toolbar: {
        show: false,
      }
    },
    xaxis: {
      categories: marketData.slice(0, 8).map(s => `${s.model} ${s.trim}`),
    },
    yaxis: {
      show: false,
    },
    plotOptions: {
      radar: {
        polygons: {
          strokeColor: '#E5E7EB',
          fill: {
            colors: ['#F3F4F6', '#FFFFFF']
          }
        }
      }
    },
    fill: {
      opacity: 0.4,
    },
    stroke: {
      width: 2,
    },
    markers: {
      size: 4,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val.toFixed(0)}/100`
      }
    }
  };

  const radarSeries = [
    {
      name: 'Market Temperature',
      data: marketData.slice(0, 8).map(s => s.temperature)
    },
    {
      name: 'Momentum',
      data: marketData.slice(0, 8).map(s => Math.abs(s.momentum))
    }
  ];

  // Find market insights
  const hottestSegment = marketData.reduce((max, s) => s.temperature > max.temperature ? s : max, marketData[0] || {});
  const coldestSegment = marketData.reduce((min, s) => s.temperature < min.temperature ? s : min, marketData[0] || {});
  const highestMomentum = marketData.reduce((max, s) => s.momentum > max.momentum ? s : max, marketData[0] || {});
  const fastestSelling = marketData.reduce((min, s) => s.daysOnMarket < min.daysOnMarket ? s : min, marketData[0] || {});

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Heat Map</CardTitle>
          <CardDescription>Loading market data...</CardDescription>
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5" />
                Market Heat Map
              </CardTitle>
              <CardDescription>
                Real-time market temperature and momentum by model and trim
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMetric('temperature')}
                className={`px-3 py-1 text-sm border rounded-lg ${selectedMetric === 'temperature' ? 'bg-red-50 border-red-300' : ''}`}
              >
                Temperature
              </button>
              <button
                onClick={() => setSelectedMetric('momentum')}
                className={`px-3 py-1 text-sm border rounded-lg ${selectedMetric === 'momentum' ? 'bg-blue-50 border-blue-300' : ''}`}
              >
                Momentum
              </button>
              <button
                onClick={() => setSelectedMetric('volume')}
                className={`px-3 py-1 text-sm border rounded-lg ${selectedMetric === 'volume' ? 'bg-green-50 border-green-300' : ''}`}
              >
                Volume
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                <Flame className="h-4 w-4" />
                Hottest Market
              </div>
              <div className="mt-2">
                <div className="font-semibold text-gray-900">
                  {hottestSegment.model} {hottestSegment.trim}
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {hottestSegment.temperature?.toFixed(0)}/100
                </div>
                <div className="text-sm text-gray-600">
                  {hottestSegment.daysOnMarket} days avg
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <AlertCircle className="h-4 w-4" />
                Coldest Market
              </div>
              <div className="mt-2">
                <div className="font-semibold text-gray-900">
                  {coldestSegment.model} {coldestSegment.trim}
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {coldestSegment.temperature?.toFixed(0)}/100
                </div>
                <div className="text-sm text-gray-600">
                  {coldestSegment.daysOnMarket} days avg
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <TrendingUp className="h-4 w-4" />
                Highest Momentum
              </div>
              <div className="mt-2">
                <div className="font-semibold text-gray-900">
                  {highestMomentum.model} {highestMomentum.trim}
                </div>
                <div className="text-2xl font-bold text-green-600">
                  +{highestMomentum.momentum?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  Price momentum
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                <Activity className="h-4 w-4" />
                Fastest Selling
              </div>
              <div className="mt-2">
                <div className="font-semibold text-gray-900">
                  {fastestSelling.model} {fastestSelling.trim}
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {fastestSelling.daysOnMarket} days
                </div>
                <div className="text-sm text-gray-600">
                  Average time to sell
                </div>
              </div>
            </div>
          </div>

          {/* Main Heat Map */}
          <div className="w-full h-[500px]">
            <ApexChart
              options={heatmapOptions}
              series={heatmapSeries}
              type="heatmap"
              height={500}
            />
          </div>

          {/* Temperature Legend */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Market Temperature Scale</h3>
            <div className="flex items-center justify-between gap-2">
              {[
                { temp: 10, label: 'Cold', desc: 'Slow market, high inventory' },
                { temp: 30, label: 'Cool', desc: 'Buyer\'s market' },
                { temp: 50, label: 'Warm', desc: 'Balanced market' },
                { temp: 70, label: 'Hot', desc: 'Seller\'s market' },
                { temp: 90, label: 'Very Hot', desc: 'High demand, low inventory' },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 text-center">
                  <div
                    className="h-8 rounded"
                    style={{ backgroundColor: getTemperatureColor(item.temp) }}
                  />
                  <div className="mt-2">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-gray-600">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart Card */}
      <Card>
        <CardHeader>
          <CardTitle>Market Momentum Radar</CardTitle>
          <CardDescription>
            Temperature and momentum visualization for top market segments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[400px]">
            <ApexChart
              options={radarOptions}
              series={radarSeries}
              type="radar"
              height={400}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}