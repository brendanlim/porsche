'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area, Cell, PieChart, Pie, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, Calendar, Car, Activity, Trophy, Zap, Filter, ExternalLink } from 'lucide-react';
import { DepreciationTable } from '@/components/DepreciationTable';
import { OptionsAnalysis } from '@/components/OptionsAnalysis';
import dynamic from 'next/dynamic';

const ApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <div className="h-32 flex items-center justify-center">Loading chart...</div>
});

interface TrimAnalytics {
  model: string;
  trim: string;
  generation?: string;
  totalListings: number;
  averagePrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  averageMileage: number;
  wowAppreciation: number;
  momAppreciation: number;
  yoyAppreciation: number;
  yearOverYearAppreciation: number;
  priceChangePercent: number | null;
  listingsChangePercent: number | null;
  mileageChangePercent: number | null;
  generations: string[];
  marketTrends: Array<{
    date: string;
    averagePrice: number;
    listingCount: number;
    generation?: string;
  }>;
  salesData?: Array<{
    date: string;
    price: number;
    generation: string;
    mileage?: number;
    year?: number;
  }>;
  generationTrends?: Record<string, Array<{
    date: string;
    avgPrice: number;
  }>>;
  seasonalityAnalysis?: Array<{
    season: string;
    salesVolume: number;
    avgPrice: number;
    medianPrice: number;
    priceImpact: number;
    volumePercent: number;
    priceRange: {
      min: number;
      max: number;
    };
  }>;
  colorAnalysis: Array<{
    color: string;
    count: number;
    avgPrice: number;
    premiumPercent: number;
  }>;
  mileageDistribution: Array<{
    range: string;
    count: number;
    avgPrice: number;
  }>;
  depreciationByYear: Array<{
    year: number;
    avgPrice: number;
    avgMileage: number;
    costPer1000Mi: number;
    generation: string;
  }>;
  multiAxisDepreciation?: {
    useGeneration: boolean;
    mileageRanges: string[];
    data: Array<{
      key: string | number;
      [key: string]: any;
    }>;
    baselinePrice: number;
  };
  generationComparison: Array<{
    generation: string;
    avgPrice: number;
    listings: number;
    avgMileage: number;
    appreciation: number;
  }>;
  optionsAnalysis: Array<{
    option: string;
    frequency: number;
    pricePremium: number;
    avgPrice: number;
    premiumPercent?: number;
    marketAvailability?: 'high' | 'medium' | 'low' | 'rare';
    priceImpact?: 'rising' | 'falling' | 'stable';
    avgDaysOnMarket?: number | null;
    avgDaysWithoutOption?: number | null;
    daysOnMarketDiff?: number | null;
  }>;
  premiumExamples?: Array<{
    vin: string;
    year: number;
    price: number;
    mileage: number;
    color: string;
    dealer: string;
    source: string;
    sourceUrl?: string;
    highValueOptions: string[];
    daysOnMarket: number;
    generation: string;
    premiumPercent: number;
  }>;
  topListings: Array<{
    vin: string;
    year: number;
    price: number;
    mileage: number;
    color: string;
    dealer: string;
    daysOnMarket: number;
    generation: string;
    source?: string;
    sourceUrl?: string;
  }>;
  priceVsMileage: Array<{
    mileage: number;
    price: number;
    year: number;
    color: string;
    generation: string;
  }>;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatMileage(mileage: number): string {
  return new Intl.NumberFormat('en-US').format(mileage) + ' mi';
}

function StatCard({ title, value, change, icon: Icon, subtitle, hideChange = false }: any) {
  const hasChange = change !== null && change !== undefined && !hideChange;
  const isPositive = hasChange && change > 0;
  const isNeutral = hasChange && Math.abs(change) < 0.5;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
        {hasChange && !isNeutral && (
          <p className={`text-xs flex items-center mt-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(change).toFixed(1)}% from last month
          </p>
        )}
        {hasChange && isNeutral && (
          <p className="text-xs flex items-center text-gray-500 mt-2">
            <Minus className="h-3 w-3 mr-1" />
            Stable
          </p>
        )}
        {!hasChange && !hideChange && change !== null && (
          <p className="text-xs text-gray-400 mt-2">
            Insufficient data
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrimAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const model = params.model as string;
  const trim = params.trim as string;
  const [analytics, setAnalytics] = useState<TrimAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize from URL params or defaults
  const [selectedGeneration, setSelectedGeneration] = useState<string>(
    searchParams.get('generation') || 'all'
  );
  const [timeRange, setTimeRange] = useState(
    searchParams.get('range') || '2y'
  );
  const [chartWidth, setChartWidth] = useState(800);
  const [allGenerations, setAllGenerations] = useState<string[]>([]);

  useEffect(() => {
    // Set chart width to fit container on mobile
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // On mobile, use full width minus padding
        const padding = 32; // Mobile padding
        setChartWidth(window.innerWidth - padding);
      } else {
        // Desktop behavior
        const containerWidth = window.innerWidth > 1536 ? 1536 : window.innerWidth;
        const padding = 96;
        const availableWidth = containerWidth - padding;
        setChartWidth(Math.max(600, Math.floor(availableWidth * 0.9)));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const modelDisplay = model.replace('-', ' ').toUpperCase();
  const trimDisplay = trim.replace(/-/g, ' ').toUpperCase();
  
  // Update URL when filters change
  const updateUrlParams = (newGeneration?: string, newRange?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update generation param
    const generation = newGeneration !== undefined ? newGeneration : selectedGeneration;
    if (generation === 'all') {
      params.delete('generation');
    } else {
      params.set('generation', generation);
    }
    
    // Update range param
    const range = newRange !== undefined ? newRange : timeRange;
    if (range === '2y') {
      params.delete('range');
    } else {
      params.set('range', range);
    }
    
    const search = params.toString();
    const query = search ? `?${search}` : '';
    router.push(`${pathname}${query}`, { scroll: false });
  };

  // Fetch all generations on initial load
  useEffect(() => {
    fetchAllGenerations();
  }, [model, trim]);

  useEffect(() => {
    fetchAnalytics();
  }, [model, trim, selectedGeneration, timeRange]);

  const fetchAllGenerations = async () => {
    try {
      // Always fetch with 'all' to get all available generations
      const response = await fetch(`/api/analytics/${model}/${trim}?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        if (data.generations && data.generations.length > 0) {
          setAllGenerations(data.generations);
        }
      }
    } catch (error) {
      console.error('Failed to fetch all generations:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const genParam = selectedGeneration !== 'all' ? `&generation=${selectedGeneration}` : '';
      const response = await fetch(`/api/analytics/${model}/${trim}?range=${timeRange}${genParam}`);
      if (!response.ok) {
        console.error('API error:', response.status);
        setAnalytics(null);
        return;
      }
      const data = await response.json();
      setAnalytics(data);
      
      // Always update all generations if we're fetching with 'all'
      if (selectedGeneration === 'all' && data.generations && data.generations.length > 0) {
        setAllGenerations(data.generations);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="min-h-screen bg-gray-50 p-6">No data available</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Generation Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Porsche {modelDisplay} {trimDisplay}
              </h1>
              <p className="text-gray-600 mt-1">
                Comprehensive market analysis and value insights
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end w-full sm:w-auto">
              <select
                value={timeRange}
                onChange={(e) => {
                  const newRange = e.target.value;
                  setTimeRange(newRange);
                  updateUrlParams(undefined, newRange);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm"
              >
                <option value="3m">3 months</option>
                <option value="6m">6 months</option>
                <option value="1y">1 year</option>
                <option value="2y">2 years</option>
                <option value="3y">3 years</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
          
          {/* Generation Filter Buttons */}
          {allGenerations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Generation:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedGeneration('all');
                      updateUrlParams('all');
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      selectedGeneration === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${allGenerations.length === 1 ? 'hidden' : ''}`}
                  >
                    All
                  </button>
                  {allGenerations.map(gen => (
                    <button
                      key={gen}
                      onClick={() => {
                        if (allGenerations.length > 1) {
                          setSelectedGeneration(gen);
                          updateUrlParams(gen);
                        }
                      }}
                      disabled={allGenerations.length === 1}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        selectedGeneration === gen || (allGenerations.length === 1)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } ${allGenerations.length === 1 ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {gen}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Price Trend Metrics Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">1 Year Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics.yoyAppreciation > 0 ? 'text-green-600' : analytics.yoyAppreciation < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {analytics.yoyAppreciation > 0 ? '+' : ''}{analytics.yoyAppreciation?.toFixed(2) || '0.00'}%
              </div>
              <p className="text-xs text-gray-500 mt-1">12 month price change</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">6 Month Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics.momAppreciation > 0 ? 'text-green-600' : analytics.momAppreciation < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {analytics.momAppreciation > 0 ? '+' : ''}{analytics.momAppreciation?.toFixed(2) || '0.00'}%
              </div>
              <p className="text-xs text-gray-500 mt-1">6 month price change</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">3 Month Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics.wowAppreciation > 0 ? 'text-green-600' : analytics.wowAppreciation < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {analytics.wowAppreciation > 0 ? '+' : ''}{analytics.wowAppreciation?.toFixed(2) || '0.00'}%
              </div>
              <p className="text-xs text-gray-500 mt-1">3 month price change</p>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Average Price"
            value={formatPrice(analytics.averagePrice)}
            change={analytics.priceChangePercent}
            icon={DollarSign}
            subtitle={selectedGeneration !== 'all' ? selectedGeneration : null}
          />
          <StatCard
            title="Total Sales"
            value={analytics.totalListings}
            change={analytics.listingsChangePercent}
            icon={Car}
          />
          <StatCard
            title="Average Mileage"
            value={formatMileage(Math.round(analytics.averageMileage))}
            change={analytics.mileageChangePercent}
            icon={Activity}
          />
          <StatCard
            title="Price Range"
            value={analytics.priceRange
              ? `${formatPrice(analytics.priceRange.min)} - ${formatPrice(analytics.priceRange.max)}`
              : 'N/A'
            }
            hideChange={true}
            icon={Zap}
          />
        </div>

        {/* Historical Price Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Price Trends</CardTitle>
            <CardDescription>
              {trimDisplay} price trends showing 30-day moving median with interquartile range
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.salesData && analytics.salesData.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <div style={{ width: '100%', minWidth: '300px', height: 400 }}>
                  <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart 
                    margin={{ top: 20, right: 20, bottom: 60, left: 5 }}
                    data={(() => {
                      // Sort sales by date
                      const sortedSales = [...analytics.salesData].sort((a, b) => 
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                      );
                      
                      // Create data with both individual sales and moving statistics
                      const dataWithStats = sortedSales.map((sale, index) => {
                        const windowSize = 30;
                        const saleTime = new Date(sale.date).getTime();
                        const windowStart = saleTime - (windowSize * 24 * 60 * 60 * 1000);
                        
                        // Find sales within window
                        const windowSales = sortedSales.filter(s => {
                          const time = new Date(s.date).getTime();
                          return time >= windowStart && time <= saleTime;
                        });
                        
                        // Calculate statistics for window
                        let movingAvg = sale.price;
                        let lowerBound = sale.price;
                        let upperBound = sale.price;
                        
                        if (windowSales.length >= 3) {
                          const prices = windowSales.map(s => s.price).sort((a, b) => a - b);
                          
                          // Calculate average
                          movingAvg = windowSales.reduce((sum, s) => sum + s.price, 0) / windowSales.length;
                          
                          // Calculate percentiles for bounds (25th and 75th)
                          const p25Index = Math.floor(prices.length * 0.25);
                          const p75Index = Math.floor(prices.length * 0.75);
                          lowerBound = prices[p25Index];
                          upperBound = prices[p75Index];
                        }
                        
                        return {
                          ...sale,
                          date: saleTime,
                          price: sale.price,
                          movingAvg: Math.round(movingAvg),
                          lowerBound: Math.round(lowerBound),
                          upperBound: Math.round(upperBound),
                          generation: sale.generation
                        };
                      });
                      
                      return dataWithStats;
                    })()}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      stroke="#6b7280" 
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
                      }}
                    />
                    <YAxis 
                      type="number"
                      stroke="#6b7280" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length > 0) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                              <p className="font-semibold text-gray-900">
                                {new Date(data.date).toLocaleDateString()}
                              </p>
                              {data.median && (
                                <p className="text-sm text-blue-600">
                                  Median: {formatPrice(data.median)}
                                </p>
                              )}
                              {data.lowerBound && data.upperBound && (
                                <p className="text-sm text-gray-600">
                                  Range: {formatPrice(data.lowerBound)} - {formatPrice(data.upperBound)}
                                </p>
                              )}
                              {data.sampleSize && (
                                <p className="text-sm text-gray-500">
                                  Based on {data.sampleSize} sales
                                </p>
                              )}
                              {data.price && (
                                <p className="text-sm text-gray-700">
                                  Sale Price: {formatPrice(data.price)}
                                </p>
                              )}
                              {data.generation && (
                                <p className="text-sm text-gray-600">Generation: {data.generation}</p>
                              )}
                              {data.mileage && (
                                <p className="text-sm text-gray-600">Mileage: {formatMileage(data.mileage)}</p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    {/* Range bands - area between upper and lower bounds */}
                    <Area
                      type="monotone"
                      dataKey="upperBound"
                      fill="#3b82f6"
                      fillOpacity={0.15}
                      stroke="#3b82f6"
                      strokeWidth={1}
                      strokeOpacity={0.2}
                      strokeDasharray="3 3"
                      dot={false}
                      legendType="none"
                    />
                    
                    <Area
                      type="monotone"
                      dataKey="lowerBound"
                      fill="#ffffff"
                      fillOpacity={1}
                      stroke="#3b82f6"
                      strokeWidth={1}
                      strokeOpacity={0.2}
                      strokeDasharray="3 3"
                      dot={false}
                      legendType="none"
                    />
                    
                    {/* Moving average line */}
                    <Line
                      type="monotone"
                      dataKey="movingAvg"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                      legendType="none"
                    />
                    
                    {/* Individual sales scatter points */}
                    <Scatter
                      dataKey="price"
                      fill="#6b7280"
                      legendType="none"
                    >
                        {(() => {
                          // Check if we have multiple generations
                          const generations = [...new Set(analytics.salesData.map(s => s.generation).filter(g => g))];
                          const hasMultipleGenerations = generations.length > 1;
                          
                          if (hasMultipleGenerations) {
                            const generationColors: Record<string, string> = {
                              '992.2': '#10b981',
                              '992.1': '#3b82f6',
                              '991.2': '#8b5cf6',
                              '991.1': '#f59e0b',
                              '997.2': '#ef4444',
                              '997.1': '#ec4899',
                              '996': '#06b6d4',
                              '982': '#06b6d4',
                              '981': '#14b8a6',
                              'default': '#6b7280'
                            };
                            
                            return analytics.salesData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={generationColors[entry.generation] || generationColors.default}
                              />
                            ));
                          }
                          return null;
                        })()}
                      </Scatter>
                  </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-gray-500">No sales data available</p>
              </div>
            )}
            
            {/* Generation color legend */}
            {analytics.salesData && analytics.salesData.length > 0 && (() => {
              const generations = [...new Set(analytics.salesData.map(s => s.generation).filter(g => g))];
              if (generations.length > 1) {
                const generationColors: Record<string, string> = {
                  '992.2': '#10b981',
                  '992.1': '#3b82f6',
                  '991.2': '#8b5cf6',
                  '991.1': '#f59e0b',
                  '997.2': '#ef4444',
                  '997.1': '#ec4899',
                  '996': '#06b6d4',
                  '982': '#06b6d4',
                  '981': '#14b8a6',
                  'default': '#6b7280'
                };
                
                return (
                  <div className="mt-4 flex gap-4 justify-center text-sm flex-wrap">
                    <span className="text-gray-500 mr-2">Generations:</span>
                    {generations.sort().map(gen => (
                      <span key={gen} className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: generationColors[gen] || generationColors.default }}
                        />
                        <span className="text-gray-600">{gen}</span>
                      </span>
                    ))}
                  </div>
                );
              }
              return null;
            })()}
          </CardContent>
        </Card>

        {/* Price vs Mileage Scatter Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Price vs Mileage Analysis</CardTitle>
            <CardDescription>
              {trimDisplay} value correlation with mileage
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Chart container centered within card */}
            <div className="w-full overflow-x-auto">
              <div style={{ width: '100%', minWidth: '300px', height: 350 }}>
                {analytics.priceVsMileage && analytics.priceVsMileage.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart 
                    margin={{ top: 20, right: 20, bottom: 60, left: 5 }}
                    data={(() => {
                      // Sort data by mileage for smooth range bands
                      const sortedData = [...analytics.priceVsMileage].sort((a, b) => a.mileage - b.mileage);
                      
                      // Calculate moving statistics for price at different mileage points
                      const dataWithStats = sortedData.map((point, index) => {
                        const windowSize = 5000; // 5000 mile window
                        const mileageMin = point.mileage - windowSize;
                        const mileageMax = point.mileage + windowSize;
                        
                        // Find points within mileage window
                        const windowPoints = sortedData.filter(p => 
                          p.mileage >= mileageMin && p.mileage <= mileageMax
                        );
                        
                        // Calculate statistics
                        let avgPrice = point.price;
                        let lowerBound = point.price;
                        let upperBound = point.price;
                        
                        if (windowPoints.length >= 3) {
                          const prices = windowPoints.map(p => p.price).sort((a, b) => a - b);
                          avgPrice = windowPoints.reduce((sum, p) => sum + p.price, 0) / windowPoints.length;
                          
                          // Calculate percentiles
                          const p25Index = Math.floor(prices.length * 0.25);
                          const p75Index = Math.floor(prices.length * 0.75);
                          lowerBound = prices[p25Index];
                          upperBound = prices[p75Index];
                        }
                        
                        return {
                          ...point,
                          avgPrice: Math.round(avgPrice),
                          lowerBound: Math.round(lowerBound),
                          upperBound: Math.round(upperBound)
                        };
                      });
                      
                      return dataWithStats;
                    })()}
                  >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="mileage" 
                  stroke="#6b7280"
                  name="Mileage"
                  unit=" mi"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  dataKey="price" 
                  stroke="#6b7280"
                  name="Price"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                          <p className="font-semibold text-gray-900">{data.year} {data.generation}</p>
                          <p className="text-sm text-gray-600">Price: {formatPrice(data.price)}</p>
                          <p className="text-sm text-gray-600">Mileage: {formatMileage(data.mileage)}</p>
                          <p className="text-sm text-gray-600">Color: {data.color}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                    {/* Range bands for price confidence interval */}
                    <Area
                      type="monotone"
                      dataKey="upperBound"
                      fill="#3b82f6"
                      fillOpacity={0.1}
                      stroke="#3b82f6"
                      strokeWidth={1}
                      strokeOpacity={0.2}
                      strokeDasharray="3 3"
                      dot={false}
                      legendType="none"
                    />
                    
                    <Area
                      type="monotone"
                      dataKey="lowerBound"
                      fill="#ffffff"
                      fillOpacity={1}
                      stroke="#3b82f6"
                      strokeWidth={1}
                      strokeOpacity={0.2}
                      strokeDasharray="3 3"
                      dot={false}
                      legendType="none"
                    />
                    
                    {/* Average price trend line */}
                    <Line
                      type="monotone"
                      dataKey="avgPrice"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      legendType="none"
                    />
                    
                    {/* Individual data points as scatter */}
                    <Scatter 
                      dataKey="price"
                      fill="#3b82f6"
                      legendType="none"
                    >
                      {(() => {
                        const sortedData = [...analytics.priceVsMileage].sort((a, b) => a.mileage - b.mileage);
                        // Determine if we should color by generation or year
                        const uniqueGenerations = [...new Set(analytics.priceVsMileage.map(d => d.generation))];
                        const useGenerations = uniqueGenerations.length > 1;
                        
                        // Color palette for up to 10 different values
                        const colors = [
                          '#3b82f6', // blue
                          '#10b981', // green
                          '#f59e0b', // amber
                          '#8b5cf6', // purple
                          '#ef4444', // red
                          '#06b6d4', // cyan
                          '#f97316', // orange
                          '#ec4899', // pink
                          '#14b8a6', // teal
                          '#6b7280'  // gray
                        ];
                        
                        return sortedData.map((entry, index) => {
                          let fillColor = '#3b82f6';
                          if (useGenerations) {
                            // Color by generation
                            const genIndex = uniqueGenerations.sort().indexOf(entry.generation);
                            fillColor = colors[genIndex % colors.length];
                          } else {
                            // Color by year
                            const uniqueYears = [...new Set(analytics.priceVsMileage.map(d => d.year))].sort();
                            const yearIndex = uniqueYears.indexOf(entry.year);
                            fillColor = colors[yearIndex % colors.length];
                          }
                          
                          return <Cell key={`cell-${index}`} fill={fillColor} />;
                        });
                      })()}
                    </Scatter>
                  </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data to display
                  </div>
                )}
              </div>
            </div>
            {/* Dynamic legend based on actual data */}
            {analytics.priceVsMileage && analytics.priceVsMileage.length > 0 && (
              <div className="mt-4 flex gap-4 justify-center text-sm flex-wrap">
                {(() => {
                  const uniqueGenerations = [...new Set(analytics.priceVsMileage.map(d => d.generation))];
                  const useGenerations = uniqueGenerations.length > 1;
                  
                  const colors = [
                    '#3b82f6', // blue
                    '#10b981', // green
                    '#f59e0b', // amber
                    '#8b5cf6', // purple
                    '#ef4444', // red
                    '#06b6d4', // cyan
                    '#f97316', // orange
                    '#ec4899', // pink
                    '#14b8a6', // teal
                    '#6b7280'  // gray
                  ];
                  
                  if (useGenerations) {
                    // Show generation legend
                    return uniqueGenerations.sort().map((gen, index) => (
                      <span key={gen} className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        {gen}
                      </span>
                    ));
                  } else {
                    // Show year legend
                    const uniqueYears = [...new Set(analytics.priceVsMileage.map(d => d.year))].sort();
                    return uniqueYears.map((year, index) => (
                      <span key={year} className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        {year}
                      </span>
                    ));
                  }
                })()}
              </div>
            )}
          </CardContent>
        </Card>

                {/* Seasonality Analysis */}
        {analytics.seasonalityAnalysis && analytics.seasonalityAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Seasonal Price Impact</CardTitle>
              <CardDescription>
                Analysis of how median sales prices and volume vary by season
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart - Price Impact by Season */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Median Price Variation by Season</h4>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={analytics.seasonalityAnalysis} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="season" stroke="#6b7280" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tick={{ fontSize: 11 }} 
                          tickFormatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value: any, name: string) => {
                            if (name === 'Price Impact') return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
                            if (name === 'Sales Volume') return `${value} sales`;
                            return value;
                          }}
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="left" dataKey="priceImpact" fill="#3b82f6" name="Price Impact">
                          {analytics.seasonalityAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.priceImpact > 0 ? '#10b981' : entry.priceImpact < 0 ? '#ef4444' : '#6b7280'} />
                          ))}
                        </Bar>
                        <Line yAxisId="right" type="monotone" dataKey="salesVolume" stroke="#f59e0b" strokeWidth={2} name="Sales Volume" dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Season Statistics Cards */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Seasonal Statistics</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {analytics.seasonalityAnalysis.map((season, index) => {
                      const seasonColors = {
                        'Winter': 'bg-blue-50 border-blue-200',
                        'Spring': 'bg-green-50 border-green-200',
                        'Summer': 'bg-yellow-50 border-yellow-200',
                        'Fall': 'bg-orange-50 border-orange-200'
                      };
                      const bgColor = seasonColors[season.season as keyof typeof seasonColors] || 'bg-gray-50 border-gray-200';
                      
                      return (
                        <div key={`season-${index}`} className={`p-3 rounded-lg border ${bgColor}`}>
                          <div className="font-medium text-gray-900 mb-2">{season.season}</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Median:</span>
                              <span className="font-semibold">{formatPrice(season.medianPrice)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Impact:</span>
                              <span className={`font-bold ${
                                season.priceImpact > 0 ? 'text-green-600' : 
                                season.priceImpact < 0 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {season.priceImpact > 0 ? '+' : ''}{season.priceImpact.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sales:</span>
                              <span>{season.salesVolume} ({season.volumePercent.toFixed(0)}%)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Best/Worst Season Summary */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm space-y-2">
                      {(() => {
                        const sorted = [...analytics.seasonalityAnalysis].sort((a, b) => b.priceImpact - a.priceImpact);
                        const best = sorted[0];
                        const worst = sorted[sorted.length - 1];
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="text-gray-700">
                                <strong>{best.season}</strong> shows highest prices ({best.priceImpact > 0 ? '+' : ''}{best.priceImpact.toFixed(1)}% premium)
                              </span>
                            </div>
                            {worst.priceImpact < 0 && (
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <span className="text-gray-700">
                                  <strong>{worst.season}</strong> shows lowest prices ({worst.priceImpact.toFixed(1)}% discount)
                                </span>
                              </div>
                            )}
                            <div className="mt-2 text-xs text-gray-500">
                              Based on {analytics.totalListings} sales in the selected time period
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Seasonal Heatmap */}
        {analytics.seasonalityAnalysis && analytics.seasonalityAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Monthly Market Patterns</CardTitle>
              <CardDescription>
                Price and volume trends across all months of the year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Generate monthly data from historical sales */}
                {(() => {
                  // Create monthly aggregation from salesData (has sold_date)
                  const monthlyData = Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const monthName = new Date(2024, i, 1).toLocaleString('default', { month: 'short' });

                    // Filter sales for this month across all years using salesData
                    const monthSales = analytics.salesData?.filter((sale: any) => {
                      if (!sale.date) return false;
                      return new Date(sale.date).getMonth() === i;
                    }) || [];

                    const avgPrice = monthSales.length > 0
                      ? monthSales.reduce((sum: number, s: any) => sum + s.price, 0) / monthSales.length
                      : 0;

                    const baselinePrice = analytics.averagePrice || 0;
                    const priceIndex = baselinePrice > 0 ? (avgPrice / baselinePrice) * 100 : 100;

                    return {
                      month: monthName,
                      priceIndex: priceIndex,
                      volume: monthSales.length,
                      avgPrice: avgPrice
                    };
                  });

                  // ApexCharts heatmap configuration
                  const heatmapOptions: any = {
                    chart: {
                      type: 'heatmap',
                      toolbar: {
                        show: false,
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
                            { from: 0, to: 95, name: 'Below Average', color: '#DC2626' },
                            { from: 95, to: 98, name: 'Slightly Below', color: '#F59E0B' },
                            { from: 98, to: 102, name: 'Average', color: '#6B7280' },
                            { from: 102, to: 105, name: 'Slightly Above', color: '#3B82F6' },
                            { from: 105, to: 200, name: 'Above Average', color: '#10B981' },
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
                      formatter: (val: number) => {
                        if (val === 0 || val === 100) return '';
                        return `${val.toFixed(0)}`;
                      }
                    },
                    xaxis: {
                      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                      title: {
                        text: '',
                      },
                      labels: {
                        style: {
                          fontSize: '12px',
                        }
                      }
                    },
                    yaxis: {
                      categories: [`${modelDisplay} ${trimDisplay}`],
                      title: {
                        text: '',
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
                        const data = monthlyData[dataPointIndex];
                        return `
                          <div class="p-3 bg-white border rounded-lg shadow-lg">
                            <div class="font-semibold text-gray-900">${data.month}</div>
                            <div class="mt-2 space-y-1 text-sm">
                              <div class="flex justify-between gap-4">
                                <span class="text-gray-600">Price Index:</span>
                                <span class="font-medium ${data.priceIndex > 102 ? 'text-green-600' : data.priceIndex < 98 ? 'text-red-600' : 'text-gray-900'}">
                                  ${data.priceIndex.toFixed(1)}
                                </span>
                              </div>
                              <div class="flex justify-between gap-4">
                                <span class="text-gray-600">Avg Price:</span>
                                <span class="font-medium">${formatPrice(data.avgPrice)}</span>
                              </div>
                              <div class="flex justify-between gap-4">
                                <span class="text-gray-600">Sales Volume:</span>
                                <span class="font-medium">${data.volume} cars</span>
                              </div>
                            </div>
                          </div>
                        `;
                      }
                    }
                  };

                  const heatmapSeries = [{
                    name: 'Price Index',
                    data: monthlyData.map(d => d.priceIndex)
                  }];

                  // Volume trend chart
                  const volumeChartOptions: any = {
                    chart: {
                      type: 'area',
                      toolbar: {
                        show: false,
                      },
                      sparkline: {
                        enabled: true,
                      }
                    },
                    stroke: {
                      curve: 'smooth',
                      width: 2,
                    },
                    fill: {
                      type: 'gradient',
                      gradient: {
                        shadeIntensity: 0.5,
                        opacityFrom: 0.4,
                        opacityTo: 0.1,
                      }
                    },
                    colors: ['#3B82F6'],
                    tooltip: {
                      theme: 'light',
                      y: {
                        formatter: (val: number) => `${val} sales`
                      }
                    }
                  };

                  const volumeSeries = [{
                    name: 'Volume',
                    data: monthlyData.map(d => d.volume)
                  }];

                  return (
                    <>
                      {/* Monthly Heatmap */}
                      <div className="w-full h-32">
                        <ApexChart
                          options={heatmapOptions}
                          series={heatmapSeries}
                          type="heatmap"
                          height={120}
                        />
                      </div>

                      {/* Volume Trend */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Sales Volume by Month</h4>
                        <div className="w-full h-20">
                          <ApexChart
                            options={volumeChartOptions}
                            series={volumeSeries}
                            type="area"
                            height={80}
                          />
                        </div>
                      </div>

                      {/* Monthly Statistics Grid */}
                      <div className="mt-4 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                        {monthlyData.map((month, idx) => {
                          const isCurrentMonth = new Date().getMonth() === idx;
                          return (
                            <div
                              key={idx}
                              className={`p-2 text-center rounded-lg border ${
                                isCurrentMonth ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                              }`}
                            >
                              <div className="text-xs font-medium text-gray-600">{month.month}</div>
                              <div className={`text-sm font-bold mt-1 ${
                                month.priceIndex > 102 ? 'text-green-600' :
                                month.priceIndex < 98 ? 'text-red-600' :
                                'text-gray-900'
                              }`}>
                                {month.priceIndex.toFixed(0)}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {month.volume}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Best/Worst Month Insights */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm space-y-1">
                          {(() => {
                            const sorted = [...monthlyData].sort((a, b) => b.priceIndex - a.priceIndex);
                            const best = sorted[0];
                            const worst = sorted[sorted.length - 1];
                            const highVolume = [...monthlyData].sort((a, b) => b.volume - a.volume)[0];

                            return (
                              <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                  <span className="text-gray-700">
                                    Best: <strong>{best.month}</strong> ({best.priceIndex.toFixed(0)} index)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                  <span className="text-gray-700">
                                    Worst: <strong>{worst.month}</strong> ({worst.priceIndex.toFixed(0)} index)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Activity className="h-4 w-4 text-blue-600" />
                                  <span className="text-gray-700">
                                    Most Active: <strong>{highVolume.month}</strong> ({highVolume.volume} sales)
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Color Premium Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Color Distribution & Value</CardTitle>
            <CardDescription>
              Premium analysis and distribution of color options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart - Color Premium */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Price Premium by Color</h4>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.colorAnalysis} margin={{ top: 5, right: 5, bottom: 50, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="color" stroke="#6b7280" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                      <Tooltip 
                        formatter={(value: any, name: string) => {
                          if (name === 'Premium') return `${value}%`;
                          return value;
                        }}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="premiumPercent" fill="#fbbf24" name="Premium %">
                        {analytics.colorAnalysis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.premiumPercent > 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Pie Chart - Color Distribution */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Color Distribution</h4>
                <div style={{ width: '100%', height: 260, fontSize: '10px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.colorAnalysis}
                        dataKey="count"
                        nameKey="color"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ color, count }: any) => {
                          const total = analytics.colorAnalysis.reduce((sum: number, c: any) => sum + c.count, 0);
                          const percent = ((count / total) * 100).toFixed(0);
                          return `${color} ${percent}%`;
                        }}
                        labelLine={false}
                      >
                        {analytics.colorAnalysis.map((entry, index) => {
                          // Define colors for common Porsche colors
                          const colorMap: Record<string, string> = {
                            'Black': '#1f2937',
                            'White': '#e5e7eb',
                            'Silver': '#9ca3af',
                            'Gray': '#6b7280',
                            'Grey': '#6b7280',
                            'Red': '#dc2626',
                            'Guards Red': '#dc2626',
                            'Blue': '#2563eb',
                            'Yellow': '#fbbf24',
                            'Speed Yellow': '#fbbf24',
                            'Racing Yellow': '#fbbf24',
                            'Green': '#16a34a',
                            'Orange': '#ea580c',
                            'Brown': '#92400e',
                            'Gold': '#facc15',
                            'Purple': '#9333ea'
                          };
                          
                          // Find matching color or use default
                          let fillColor = '#94a3b8'; // Default gray
                          Object.keys(colorMap).forEach(key => {
                            if (entry.color.toLowerCase().includes(key.toLowerCase())) {
                              fillColor = colorMap[key];
                            }
                          });
                          
                          return <Cell key={`cell-${index}`} fill={fillColor} stroke="#fff" strokeWidth={2} />;
                        })}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: string) => {
                          if (typeof value === 'number') {
                            const total = analytics.colorAnalysis.reduce((sum: number, c: any) => sum + c.count, 0);
                            const percent = ((value / total) * 100).toFixed(2);
                            return [`${value} listings (${percent}%)`, name];
                          }
                          return [value, name];
                        }}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <h4 className="text-sm font-medium text-gray-700 mt-6 mb-3">Most Common Colors</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...analytics.colorAnalysis]
                .sort((a, b) => b.count - a.count) // Sort by frequency (most common first)
                .slice(0, 9)
                .map((color, index) => (
                <div key={`color-${index}`} className={`p-3 rounded-lg border ${
                  color.premiumPercent > 5 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{color.color}</span>
                    <span className={`text-sm font-bold ${
                      color.premiumPercent > 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {color.premiumPercent > 0 ? '+' : ''}{color.premiumPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>{color.count} listings</span>
                    <span>{formatPrice(color.avgPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Options Analysis - Only show for single generation or models with one generation */}
        {analytics.optionsAnalysis && 
         analytics.optionsAnalysis.length > 0 && 
         (selectedGeneration !== 'all' || allGenerations.length === 1) && (
          <Card>
            <CardHeader>
              <CardTitle>Options Analysis</CardTitle>
              <CardDescription>
                Price premiums are normalized by comparing same-year vehicles with and without each option
                {selectedGeneration !== 'all' && ` (${selectedGeneration} only)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* High-Value Options vs Less Impact (2 columns) */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Options That Add Value */}
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-4">High-Value Options</h3>
                  <div className="space-y-3">
                    {analytics.optionsAnalysis
                      .sort((a, b) => (b.premiumPercent || 0) - (a.premiumPercent || 0))
                      .slice(0, Math.ceil(analytics.optionsAnalysis.length / 2))
                      .slice(0, 5)
                      .map((option) => (
                        <div key={option.option} className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{option.option}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-600">{option.frequency} listings</span>
                                {option.marketAvailability && (
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                    option.marketAvailability === 'high' ? 'bg-green-100 text-green-800' :
                                    option.marketAvailability === 'medium' ? 'bg-blue-100 text-blue-800' :
                                    option.marketAvailability === 'low' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {option.marketAvailability}
                                  </span>
                                )}
                                {option.priceImpact === 'rising' && (
                                  <TrendingUp className="h-3 w-3 text-green-600" />
                                )}
                                {option.priceImpact === 'falling' && (
                                  <TrendingDown className="h-3 w-3 text-red-600" />
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${
                                (option.premiumPercent || 0) > 0 ? 'text-green-600' : 
                                (option.premiumPercent || 0) < 0 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {(option.premiumPercent || 0) > 0 ? '+' : ''}{(option.premiumPercent || 0).toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-600">
                                {(option.premiumPercent || 0) > 0 ? 'premium' : 
                                 (option.premiumPercent || 0) < 0 ? 'discount' : 'neutral'}
                              </div>
                              {option.daysOnMarketDiff !== null && option.daysOnMarketDiff !== undefined && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {option.daysOnMarketDiff < 0 ? (
                                    <span className="text-green-600">
                                      {Math.abs(option.daysOnMarketDiff).toFixed(0)} days faster
                                    </span>
                                  ) : option.daysOnMarketDiff > 0 ? (
                                    <span className="text-red-600">
                                      {option.daysOnMarketDiff.toFixed(0)} days slower
                                    </span>
                                  ) : (
                                    <span>Same time to sell</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Options With Less Impact */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Other Common Options</h3>
                  <div className="space-y-3">
                    {analytics.optionsAnalysis
                      .sort((a, b) => (b.premiumPercent || 0) - (a.premiumPercent || 0))
                      .slice(Math.ceil(analytics.optionsAnalysis.length / 2))
                      .slice(0, 5)
                      .map((option) => (
                        <div key={option.option} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{option.option}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-600">{option.frequency} listings</span>
                                {option.marketAvailability && (
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                    option.marketAvailability === 'high' ? 'bg-green-100 text-green-800' :
                                    option.marketAvailability === 'medium' ? 'bg-blue-100 text-blue-800' :
                                    option.marketAvailability === 'low' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {option.marketAvailability}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${
                                (option.premiumPercent || 0) > 5 ? 'text-green-600' : 
                                (option.premiumPercent || 0) < -5 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {(option.premiumPercent || 0) > 0 ? '+' : ''}{(option.premiumPercent || 0).toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-500">
                                {Math.abs(option.premiumPercent || 0) < 5 ? 'neutral' : 
                                 (option.premiumPercent || 0) > 0 ? 'premium' : 'discount'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>


              {/* Fastest Selling Options */}
              {analytics.optionsAnalysis.some(opt => opt.daysOnMarketDiff !== null && opt.daysOnMarketDiff < 0) && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Options That Sell Faster</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.optionsAnalysis
                      .filter(opt => opt.daysOnMarketDiff !== null && opt.daysOnMarketDiff < 0 && opt.frequency >= 3)
                      .sort((a, b) => (a.daysOnMarketDiff || 0) - (b.daysOnMarketDiff || 0))
                      .slice(0, 6)
                      .map((option) => (
                        <div key={option.option} className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">{option.option}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                Avg {option.avgDaysOnMarket?.toFixed(0) || 'N/A'} days vs {option.avgDaysWithoutOption?.toFixed(0) || 'N/A'} days without
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                {Math.abs(option.daysOnMarketDiff || 0).toFixed(0)} days
                              </div>
                              <div className="text-xs text-gray-600">faster</div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Most Common Options */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Common Options</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[...analytics.optionsAnalysis]
                    .sort((a, b) => b.frequency - a.frequency)
                    .slice(0, 9)
                    .map((option) => (
                      <div key={option.option} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="font-medium text-gray-900 text-sm">{option.option}</div>
                        <div className="text-xs text-gray-600">{option.frequency} listings</div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Depreciation Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Depreciation Analysis</CardTitle>
            <CardDescription>
              Average price and cost efficiency by model year
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.depreciationByYear && analytics.depreciationByYear.length > 0 ? (
              <>
                {/* Line Chart for Depreciation Curve */}
                <div className="w-full overflow-x-auto">
                  <div style={{ width: '100%', minWidth: '300px', height: 300 }}>
                    <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart 
                      data={analytics.depreciationByYear}
                      margin={{ top: 20, right: 20, bottom: 60, left: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="year" 
                        stroke="#6b7280" 
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Model Year', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="#3b82f6" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        label={{ value: 'Average Price', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#10b981" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k mi`}
                        label={{ value: 'Average Mileage', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const data = payload[0].payload;
                            // const oldestYear = Math.min(...analytics.depreciationByYear.map(d => d.year));
                            const newestYear = Math.max(...analytics.depreciationByYear.map(d => d.year));
                            const newestPrice = analytics.depreciationByYear.find(d => d.year === newestYear)?.avgPrice || 0;
                            const depreciationPercent = newestPrice > 0 ?
                              ((newestPrice - data.avgPrice) / newestPrice * 100) : 0;
                            
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
                                <p className="font-semibold text-gray-900">{data.year} Model Year</p>
                                <p className="text-sm text-blue-600">Avg Price: {formatPrice(data.avgPrice)}</p>
                                <p className="text-sm text-green-600">Avg Mileage: {formatMileage(data.avgMileage)}</p>
                                <p className="text-sm text-purple-600">Cost/1000mi: ${data.costPer1000Mi.toFixed(2)}</p>
                                {data.generation && (
                                  <p className="text-sm text-gray-600">Generation: {data.generation}</p>
                                )}
                                {depreciationPercent !== 0 && (
                                  <p className="text-sm font-medium mt-1 text-gray-700">
                                    {depreciationPercent > 0 ? '+' : ''}{depreciationPercent.toFixed(1)}% vs newest
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      
                      {/* Price line with area fill */}
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="avgPrice"
                        fill="#3b82f6"
                        fillOpacity={0.1}
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#3b82f6' }}
                        name="Average Price"
                      />
                      
                      {/* Mileage line */}
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="avgMileage"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#10b981' }}
                        strokeDasharray="5 5"
                        name="Average Mileage"
                      />
                    </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                  {(() => {
                    const sorted = [...analytics.depreciationByYear].sort((a, b) => b.year - a.year);
                    const newest = sorted[0];
                    const oldest = sorted[sorted.length - 1];
                    
                    // Find median year for price comparison
                    const medianYear = sorted[Math.floor(sorted.length / 2)];
                    
                    // Calculate average depreciation per year (using mileage-adjusted values)
                    // const avgDepreciationPerYear = sorted.length > 1 ?
                      // ((oldest.avgPrice - newest.avgPrice) / (newest.year - oldest.year)) : 0;
                    
                    const bestValue = [...analytics.depreciationByYear]
                      .filter(d => d.costPer1000Mi > 0)
                      .sort((a, b) => a.costPer1000Mi - b.costPer1000Mi)[0];

                    const worstValue = [...analytics.depreciationByYear]
                      .filter(d => d.costPer1000Mi > 0)
                      .sort((a, b) => b.costPer1000Mi - a.costPer1000Mi)[0];

                    // Calculate price spread
                    const priceSpread = newest && oldest ?
                      ((newest.avgPrice - oldest.avgPrice) / oldest.avgPrice * 100) : 0;
                    
                    return (
                      <>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-sm font-medium text-blue-900 mb-1">Current Market (Newest)</div>
                          <div className="text-2xl font-bold text-blue-600">{newest?.year}</div>
                          <div className="text-sm text-blue-700 mt-1">{formatPrice(newest?.avgPrice || 0)}</div>
                          <div className="text-xs text-blue-600 mt-1">Avg: {formatMileage(newest?.avgMileage || 0)}</div>
                        </div>
                        
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="text-sm font-medium text-green-900 mb-1">Sweet Spot Year</div>
                          <div className="text-2xl font-bold text-green-600">{bestValue?.year || medianYear?.year}</div>
                          <div className="text-sm text-green-700 mt-1">
                            {bestValue ? `$${bestValue.costPer1000Mi.toFixed(2)}/1000mi` : formatPrice(medianYear?.avgPrice || 0)}
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            {bestValue ? 'Lowest cost per mile' : 'Median price point'}
                          </div>
                        </div>

                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <div className="text-sm font-medium text-red-900 mb-1">Premium Year</div>
                          <div className="text-2xl font-bold text-red-600">{worstValue?.year || newest?.year}</div>
                          <div className="text-sm text-red-700 mt-1">
                            {worstValue ? `$${worstValue.costPer1000Mi.toFixed(2)}/1000mi` : formatPrice(newest?.avgPrice || 0)}
                          </div>
                          <div className="text-xs text-red-600 mt-1">
                            {worstValue ? 'Highest cost per mile' : 'Newest model year'}
                          </div>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="text-sm font-medium text-purple-900 mb-1">Market Spread</div>
                          <div className="text-2xl font-bold text-purple-600">
                            {priceSpread > 0 ? '+' : ''}{priceSpread.toFixed(1)}%
                          </div>
                          <div className="text-sm text-purple-700 mt-1">
                            {sorted.length} model years
                          </div>
                          <div className="text-xs text-purple-600 mt-1">
                            {oldest?.year} - {newest?.year}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-gray-500">No depreciation data available</p>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Depreciation Analysis Table */}
        <DepreciationTable
          data={analytics.mileageDistribution.map((range, index) => ({
            mileageRange: range.range,
            listings: range.count,
            avgPrice: range.avgPrice,
            depreciationPercent: index === 0 ? 0 : 
              ((analytics.mileageDistribution[0].avgPrice - range.avgPrice) / analytics.mileageDistribution[0].avgPrice) * -100,
            isBaseline: index === 0
          }))}
          yearData={analytics.multiAxisDepreciation && !analytics.multiAxisDepreciation.useGeneration ? 
            analytics.multiAxisDepreciation.data.map((row: any) => {
              // Combine 20k-30k and 30k+ into 20k+ for the component
              const twentyKPlus = row['20k-30k'] || row['30k+'];
              
              return {
                year: row.key,
                ranges: {
                  '0-5k': row['0-5k'] ? {
                    price: row['0-5k'].avgPrice,
                    listings: row['0-5k'].count,
                    depreciation: parseFloat(row['0-5k'].depreciation || '0'),
                    isBase: true
                  } : { price: 0, listings: 0, depreciation: 0, isBase: true },
                  '5k-10k': row['5k-10k'] ? {
                    price: row['5k-10k'].avgPrice,
                    listings: row['5k-10k'].count,
                    depreciation: parseFloat(row['5k-10k'].depreciation || '0')
                  } : { price: 0, listings: 0, depreciation: 0 },
                  '10k-20k': row['10k-20k'] ? {
                    price: row['10k-20k'].avgPrice,
                    listings: row['10k-20k'].count,
                    depreciation: parseFloat(row['10k-20k'].depreciation || '0')
                  } : { price: 0, listings: 0, depreciation: 0 },
                  '20k+': twentyKPlus ? {
                    price: twentyKPlus.avgPrice,
                    listings: twentyKPlus.count,
                    depreciation: parseFloat(twentyKPlus.depreciation || '0')
                  } : { price: 0, listings: 0, depreciation: 0 }
                }
              };
            }).slice(0, 3) : []
          }
          averageLossPerMile={analytics.depreciationByYear && analytics.depreciationByYear.length > 0 ?
            analytics.depreciationByYear[0].costPer1000Mi : 3007
          }
          trimName={trimDisplay}
        />



        {/* Top Sales Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Recent High-Value Sales</CardTitle>
            <CardDescription>
              Top {trimDisplay} sales from the past 90 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topListings.slice(0, 5).map((listing, index) => (
                <div key={`top-listing-${index}`} className={`flex items-center justify-between p-4 rounded-lg border ${
                  index === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center space-x-4">
                    <div className={`text-2xl font-bold ${
                      index === 0 ? 'text-yellow-600' : 'text-gray-400'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {listing.year} {modelDisplay} {trimDisplay} {listing.generation && `(${listing.generation})`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {listing.color} • {formatMileage(listing.mileage)} • {listing.dealer}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        VIN: {listing.vin} • Sold
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">{formatPrice(listing.price)}</div>
                      {index === 0 && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded mt-1 inline-block">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    {listing.sourceUrl && (
                      <a
                        href={listing.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}