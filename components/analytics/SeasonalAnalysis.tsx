'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, TrendingUp, TrendingDown, Sun, Snowflake, Leaf, Flower } from 'lucide-react';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface SeasonalData {
  month: string;
  avgPrice: number;
  volume: number;
  daysOnMarket: number;
  priceIndex: number; // 100 = baseline
  volumeIndex: number; // 100 = baseline
  bestSeller: string; // Model/trim that sells best this month
  worstSeller: string; // Model/trim that sells worst this month
}

interface ModelSeasonalData {
  model: string;
  trim?: string;
  seasonalPattern: SeasonalData[];
  bestMonth: string;
  worstMonth: string;
  seasonalVolatility: number; // 0-100
}

interface SeasonalAnalysisProps {
  model?: string;
  trim?: string;
}

export function SeasonalAnalysis({ model, trim }: SeasonalAnalysisProps) {
  const [overallData, setOverallData] = useState<SeasonalData[]>([]);
  const [modelData, setModelData] = useState<ModelSeasonalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overall' | 'comparison' | 'heatmap'>('overall');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  useEffect(() => {
    fetchSeasonalData();
  }, [model, trim]);

  const fetchSeasonalData = async () => {
    try {
      let url = '/api/analytics/seasonal';
      const params = new URLSearchParams();
      if (model) params.append('model', model);
      if (trim) params.append('trim', trim);

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();
      setOverallData(data.overall || []);
      setModelData(data.models || []);
      if (data.models?.length > 0) {
        setSelectedModels(data.models.slice(0, 3).map((m: ModelSeasonalData) => `${m.model}${m.trim ? ` ${m.trim}` : ''}`));
      }
    } catch (error) {
      console.error('Failed to fetch seasonal data:', error);
      setOverallData([]);
      setModelData([]);
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

  const getSeasonIcon = (month: string) => {
    const monthNum = new Date(Date.parse(month + ' 1, 2024')).getMonth();
    if (monthNum >= 2 && monthNum <= 4) return <Flower className="h-4 w-4 text-green-500" />;
    if (monthNum >= 5 && monthNum <= 7) return <Sun className="h-4 w-4 text-yellow-500" />;
    if (monthNum >= 8 && monthNum <= 10) return <Leaf className="h-4 w-4 text-orange-500" />;
    return <Snowflake className="h-4 w-4 text-blue-500" />;
  };

  const getSeasonName = (month: string) => {
    const monthNum = new Date(Date.parse(month + ' 1, 2024')).getMonth();
    if (monthNum >= 2 && monthNum <= 4) return 'Spring';
    if (monthNum >= 5 && monthNum <= 7) return 'Summer';
    if (monthNum >= 8 && monthNum <= 10) return 'Fall';
    return 'Winter';
  };

  // Overall seasonal pattern chart
  const overallChartOptions: any = {
    chart: {
      type: 'line',
      toolbar: {
        show: true,
      },
      animations: {
        enabled: true,
      }
    },
    stroke: {
      width: [2, 2, 3],
      curve: 'smooth',
      dashArray: [0, 0, 5]
    },
    markers: {
      size: [4, 4, 0],
    },
    xaxis: {
      categories: overallData.map(d => d.month),
      title: {
        text: 'Month',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        }
      }
    },
    yaxis: [
      {
        title: {
          text: 'Price Index',
          style: {
            fontSize: '14px',
            fontWeight: 600,
            color: '#3B82F6'
          }
        },
        labels: {
          formatter: (val: number) => val.toFixed(0),
          style: {
            colors: '#3B82F6'
          }
        }
      },
      {
        opposite: true,
        title: {
          text: 'Volume Index',
          style: {
            fontSize: '14px',
            fontWeight: 600,
            color: '#10B981'
          }
        },
        labels: {
          formatter: (val: number) => val.toFixed(0),
          style: {
            colors: '#10B981'
          }
        }
      }
    ],
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number, { seriesIndex }: any) => {
          if (seriesIndex === 0) return `${val.toFixed(1)} (Index)`;
          if (seriesIndex === 1) return `${val.toFixed(1)} (Index)`;
          return `${val.toFixed(0)} days`;
        }
      }
    },
    annotations: {
      yaxis: [{
        y: 100,
        borderColor: '#6B7280',
        strokeDashArray: 3,
        label: {
          borderColor: '#6B7280',
          style: {
            color: '#fff',
            background: '#6B7280',
          },
          text: 'Baseline (100)',
        }
      }]
    }
  };

  const overallSeries = [
    {
      name: 'Price Index',
      type: 'line',
      data: overallData.map(d => d.priceIndex)
    },
    {
      name: 'Volume Index',
      type: 'line',
      data: overallData.map(d => d.volumeIndex)
    },
    {
      name: 'Days on Market',
      type: 'line',
      data: overallData.map(d => d.daysOnMarket)
    }
  ];

  // Model comparison chart
  const comparisonChartOptions: any = {
    chart: {
      type: 'line',
      toolbar: {
        show: true,
      },
      animations: {
        enabled: true,
      }
    },
    stroke: {
      width: 2,
      curve: 'smooth',
    },
    markers: {
      size: 4,
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      title: {
        text: 'Month',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        }
      }
    },
    yaxis: {
      title: {
        text: 'Price Index',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        }
      },
      labels: {
        formatter: (val: number) => val.toFixed(0),
      }
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => `${val.toFixed(1)} (Index)`
      }
    }
  };

  const comparisonSeries = selectedModels.map(modelName => {
    const data = modelData.find(m => `${m.model}${m.trim ? ` ${m.trim}` : ''}` === modelName);
    return {
      name: modelName,
      data: data?.seasonalPattern.map(d => d.priceIndex) || []
    };
  });

  // Seasonal heatmap configuration
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
        radius: 4,
        useFillColorAsStroke: false,
        colorScale: {
          ranges: [
            { from: 80, to: 90, name: 'Much Lower', color: '#DC2626' },
            { from: 90, to: 95, name: 'Lower', color: '#F59E0B' },
            { from: 95, to: 105, name: 'Normal', color: '#6B7280' },
            { from: 105, to: 110, name: 'Higher', color: '#3B82F6' },
            { from: 110, to: 120, name: 'Much Higher', color: '#10B981' },
          ]
        }
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '11px',
        fontWeight: 600,
        colors: ['#FFFFFF']
      },
      formatter: (val: number) => val.toFixed(0)
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      title: {
        text: 'Month',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        }
      }
    },
    yaxis: {
      categories: modelData.slice(0, 10).map(m => `${m.model}${m.trim ? ` ${m.trim}` : ''}`),
      title: {
        text: 'Model / Trim',
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
        const modelInfo = modelData[seriesIndex];
        const monthData = modelInfo?.seasonalPattern[dataPointIndex];
        if (!monthData) return '';

        return `
          <div class="p-3 bg-white border rounded-lg shadow-lg">
            <div class="font-semibold text-gray-900">${modelInfo.model}${modelInfo.trim ? ` ${modelInfo.trim}` : ''}</div>
            <div class="text-sm text-gray-600 mb-2">${monthData.month}</div>
            <div class="space-y-1 text-sm">
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Price Index:</span>
                <span class="font-medium">${monthData.priceIndex.toFixed(1)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Volume:</span>
                <span class="font-medium">${monthData.volume} listings</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Days on Market:</span>
                <span class="font-medium">${monthData.daysOnMarket} days</span>
              </div>
            </div>
          </div>
        `;
      }
    }
  };

  const heatmapSeries = modelData.slice(0, 10).map(m => ({
    name: `${m.model}${m.trim ? ` ${m.trim}` : ''}`,
    data: m.seasonalPattern.map(d => d.priceIndex)
  }));

  // Find seasonal insights - provide default object
  const defaultData: SeasonalData = {
    month: '',
    avgPrice: 0,
    volume: 0,
    daysOnMarket: 0,
    priceIndex: 100,
    volumeIndex: 100,
    bestSeller: '',
    worstSeller: ''
  };

  const bestMonth = overallData.length > 0
    ? overallData.reduce((max, d) => d.priceIndex > max.priceIndex ? d : max, overallData[0])
    : defaultData;
  const worstMonth = overallData.length > 0
    ? overallData.reduce((min, d) => d.priceIndex < min.priceIndex ? d : min, overallData[0])
    : defaultData;
  const highestVolume = overallData.length > 0
    ? overallData.reduce((max, d) => d.volume > max.volume ? d : max, overallData[0])
    : defaultData;
  const fastestSelling = overallData.length > 0
    ? overallData.reduce((min, d) => d.daysOnMarket < min.daysOnMarket ? d : min, overallData[0])
    : defaultData;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Pattern Analysis</CardTitle>
          <CardDescription>Loading seasonal data...</CardDescription>
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
                <Calendar className="h-5 w-5" />
                Seasonal Pattern Analysis
              </CardTitle>
              <CardDescription>
                Market patterns and optimal timing insights based on historical data
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('overall')}
                className={`px-3 py-1 text-sm border rounded-lg ${viewMode === 'overall' ? 'bg-blue-50 border-blue-300' : ''}`}
              >
                Overall
              </button>
              <button
                onClick={() => setViewMode('comparison')}
                className={`px-3 py-1 text-sm border rounded-lg ${viewMode === 'comparison' ? 'bg-blue-50 border-blue-300' : ''}`}
              >
                Comparison
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1 text-sm border rounded-lg ${viewMode === 'heatmap' ? 'bg-blue-50 border-blue-300' : ''}`}
              >
                Heatmap
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seasonal Insights Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <TrendingUp className="h-4 w-4" />
                Best Month to Sell
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  {getSeasonIcon(bestMonth.month)}
                  <span className="text-xl font-bold text-green-600">{bestMonth.month}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Index: {bestMonth.priceIndex?.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">
                  {((bestMonth.priceIndex - 100) / 100 * 100).toFixed(1)}% above average
                </div>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                <TrendingDown className="h-4 w-4" />
                Best Month to Buy
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  {getSeasonIcon(worstMonth.month)}
                  <span className="text-xl font-bold text-red-600">{worstMonth.month}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Index: {worstMonth.priceIndex?.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">
                  {((100 - worstMonth.priceIndex) / 100 * 100).toFixed(1)}% below average
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <Calendar className="h-4 w-4" />
                Peak Activity
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  {getSeasonIcon(highestVolume.month)}
                  <span className="text-xl font-bold text-blue-600">{highestVolume.month}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {highestVolume.volume} listings
                </div>
                <div className="text-xs text-gray-500">
                  Most active trading month
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                <TrendingUp className="h-4 w-4" />
                Fastest Sales
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  {getSeasonIcon(fastestSelling.month)}
                  <span className="text-xl font-bold text-purple-600">{fastestSelling.month}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {fastestSelling.daysOnMarket} days avg
                </div>
                <div className="text-xs text-gray-500">
                  Quickest turnover period
                </div>
              </div>
            </div>
          </div>

          {/* Main Visualization */}
          <div className="w-full h-[500px]">
            {viewMode === 'overall' && (
              <ApexChart
                options={overallChartOptions}
                series={overallSeries}
                type="line"
                height={500}
              />
            )}
            {viewMode === 'comparison' && (
              <>
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700">Compare Models/Trims:</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {modelData.map(m => {
                      const label = `${m.model}${m.trim ? ` ${m.trim}` : ''}`;
                      const isSelected = selectedModels.includes(label);
                      return (
                        <button
                          key={label}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedModels(selectedModels.filter(s => s !== label));
                            } else if (selectedModels.length < 5) {
                              setSelectedModels([...selectedModels, label]);
                            }
                          }}
                          className={`px-3 py-1 text-sm border rounded-lg ${
                            isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ApexChart
                  options={comparisonChartOptions}
                  series={comparisonSeries}
                  type="line"
                  height={450}
                />
              </>
            )}
            {viewMode === 'heatmap' && (
              <ApexChart
                options={heatmapOptions}
                series={heatmapSeries}
                type="heatmap"
                height={500}
              />
            )}
          </div>

          {/* Seasonal Calendar Guide */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Seasonal Trading Calendar</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['Spring', 'Summer', 'Fall', 'Winter'].map(season => {
                const months = season === 'Spring' ? ['Mar', 'Apr', 'May'] :
                              season === 'Summer' ? ['Jun', 'Jul', 'Aug'] :
                              season === 'Fall' ? ['Sep', 'Oct', 'Nov'] :
                              ['Dec', 'Jan', 'Feb'];

                const seasonData = overallData.filter(d => months.includes(d.month.substring(0, 3)));
                const avgIndex = seasonData.reduce((sum, d) => sum + d.priceIndex, 0) / (seasonData.length || 1);

                return (
                  <div key={season} className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {season === 'Spring' && <Flower className="h-5 w-5 text-green-500" />}
                      {season === 'Summer' && <Sun className="h-5 w-5 text-yellow-500" />}
                      {season === 'Fall' && <Leaf className="h-5 w-5 text-orange-500" />}
                      {season === 'Winter' && <Snowflake className="h-5 w-5 text-blue-500" />}
                      <span className="font-medium">{season}</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {avgIndex.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Avg Index
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {months.join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model-Specific Insights */}
      {modelData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Model-Specific Seasonal Patterns</CardTitle>
            <CardDescription>
              Each model has unique seasonal characteristics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {modelData.slice(0, 5).map((m, idx) => (
                <div key={idx} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {m.model}{m.trim && ` ${m.trim}`}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Volatility: {m.seasonalVolatility.toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-green-600">
                        Best: {m.bestMonth}
                      </div>
                      <div className="text-sm text-red-600">
                        Worst: {m.worstMonth}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1">
                    {m.seasonalPattern.map((month, i) => (
                      <div
                        key={i}
                        className="flex-1 h-6 rounded"
                        style={{
                          backgroundColor: month.priceIndex >= 105 ? '#10B981' :
                                         month.priceIndex >= 100 ? '#3B82F6' :
                                         month.priceIndex >= 95 ? '#F59E0B' : '#EF4444',
                          opacity: 0.7
                        }}
                        title={`${month.month}: ${month.priceIndex.toFixed(1)}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}