'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, InfoIcon } from 'lucide-react';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface OptionPremium {
  name: string;
  avgPremium: number;
  frequency: number;
  confidence: number;
  examples: number;
}

interface OptionsPremiumAnalysisProps {
  model?: string;
  trim?: string;
}

export function OptionsPremiumAnalysis({ model, trim }: OptionsPremiumAnalysisProps) {
  const [optionsData, setOptionsData] = useState<OptionPremium[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('90d');

  useEffect(() => {
    fetchOptionsData();
  }, [model, trim, timeRange]);

  const fetchOptionsData = async () => {
    try {
      let url = `/api/analytics/options-premium?range=${timeRange}`;
      if (model) url += `&model=${model}`;
      if (trim) url += `&trim=${trim}`;

      const response = await fetch(url);
      const data = await response.json();
      setOptionsData(data.options || []);
    } catch (error) {
      console.error('Failed to fetch options data:', error);
      setOptionsData([]);
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

  // Prepare data for ApexCharts
  const chartOptions: any = {
    chart: {
      type: 'bar',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 400,
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: {
          position: 'bottom',
        },
        barHeight: '75%',
      }
    },
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      formatter: (val: number, opt: any) => {
        const option = optionsData[opt.dataPointIndex];
        return `${formatCurrency(val)} (${formatPercent(option.frequency)})`;
      },
      offsetX: 5,
      style: {
        fontSize: '12px',
        colors: ['#6B7280']
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'horizontal',
        shadeIntensity: 0.3,
        gradientToColors: ['#10B981'],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.8,
      }
    },
    colors: ['#059669'],
    xaxis: {
      categories: optionsData.slice(0, 15).map(opt => opt.name),
      title: {
        text: 'Average Premium Value',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        }
      },
      labels: {
        formatter: (val: any) => formatCurrency(val),
        style: {
          fontSize: '12px',
        }
      }
    },
    yaxis: {
      title: {
        text: 'Option Name',
        style: {
          fontSize: '14px',
          fontWeight: 600,
        }
      },
      labels: {
        style: {
          fontSize: '12px',
        }
      }
    },
    grid: {
      borderColor: '#E5E7EB',
      strokeDashArray: 4,
      xaxis: {
        lines: {
          show: true
        }
      },
      yaxis: {
        lines: {
          show: false
        }
      }
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => formatCurrency(val)
      },
      custom: function({ series, seriesIndex, dataPointIndex }: any) {
        const option = optionsData[dataPointIndex];
        return `
          <div class="p-3 bg-white border rounded-lg shadow-lg">
            <div class="font-semibold text-gray-900">${option.name}</div>
            <div class="mt-2 space-y-1">
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Premium:</span>
                <span class="font-medium">${formatCurrency(option.avgPremium)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Frequency:</span>
                <span class="font-medium">${formatPercent(option.frequency)}</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Sample Size:</span>
                <span class="font-medium">${option.examples} cars</span>
              </div>
              <div class="flex justify-between gap-4">
                <span class="text-gray-600">Confidence:</span>
                <span class="font-medium">${formatPercent(option.confidence)}</span>
              </div>
            </div>
          </div>
        `;
      }
    },
    responsive: [{
      breakpoint: 768,
      options: {
        plotOptions: {
          bar: {
            horizontal: true
          }
        },
        dataLabels: {
          enabled: false
        },
        yaxis: {
          labels: {
            style: {
              fontSize: '10px',
            }
          }
        }
      }
    }]
  };

  const series = [{
    name: 'Premium Value',
    data: optionsData.slice(0, 15).map(opt => opt.avgPremium)
  }];

  // Calculate summary statistics
  const topValueAdder = optionsData[0];
  const mostCommon = [...optionsData].sort((a, b) => b.frequency - a.frequency)[0];
  const bestROI = [...optionsData].sort((a, b) => (b.avgPremium / b.frequency) - (a.avgPremium / a.frequency))[0];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Options Premium Analysis</CardTitle>
          <CardDescription>Loading options data...</CardDescription>
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
            <CardTitle>Options Premium Analysis</CardTitle>
            <CardDescription>
              Value impact of popular options based on {optionsData.reduce((sum, opt) => sum + opt.examples, 0).toLocaleString()} analyzed vehicles
            </CardDescription>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 text-sm border rounded-lg"
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="180d">Last 6 months</option>
            <option value="1y">Last year</option>
            <option value="all">All time</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topValueAdder && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <ArrowUpIcon className="h-4 w-4" />
                Highest Value Option
              </div>
              <div className="mt-2">
                <div className="font-semibold text-gray-900">{topValueAdder.name}</div>
                <div className="text-2xl font-bold text-green-600">
                  +{formatCurrency(topValueAdder.avgPremium)}
                </div>
                <div className="text-sm text-gray-600">
                  Found in {formatPercent(topValueAdder.frequency)} of cars
                </div>
              </div>
            </div>
          )}

          {mostCommon && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <InfoIcon className="h-4 w-4" />
                Most Common Option
              </div>
              <div className="mt-2">
                <div className="font-semibold text-gray-900">{mostCommon.name}</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPercent(mostCommon.frequency)}
                </div>
                <div className="text-sm text-gray-600">
                  Adds {formatCurrency(mostCommon.avgPremium)} value
                </div>
              </div>
            </div>
          )}

          {bestROI && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                <ArrowUpIcon className="h-4 w-4" />
                Best ROI Option
              </div>
              <div className="mt-2">
                <div className="font-semibold text-gray-900">{bestROI.name}</div>
                <div className="text-2xl font-bold text-purple-600">
                  {((bestROI.avgPremium / 5000) * 100).toFixed(0)}% ROI
                </div>
                <div className="text-sm text-gray-600">
                  Rare but valuable ({formatPercent(bestROI.frequency)} frequency)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Chart */}
        <div className="w-full h-[500px]">
          <ApexChart
            options={chartOptions}
            series={series}
            type="bar"
            height={500}
          />
        </div>

        {/* Option Details Table */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Detailed Analysis</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Option
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Premium
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sample Size
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {optionsData.slice(0, 10).map((option, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {option.name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      <span className="font-medium text-green-600">
                        +{formatCurrency(option.avgPremium)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {formatPercent(option.frequency)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {option.examples} cars
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${option.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs">{formatPercent(option.confidence)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}