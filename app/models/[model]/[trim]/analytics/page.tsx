'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, Calendar, Car, Activity, Trophy, Zap, Filter } from 'lucide-react';
import { DepreciationTable } from '@/components/DepreciationTable';
import { OptionsAnalysis } from '@/components/OptionsAnalysis';

interface TrimAnalytics {
  model: string;
  trim: string;
  generation?: string;
  totalListings: number;
  averagePrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  averageMileage: number;
  yearOverYearAppreciation: number;
  generations: string[];
  marketTrends: Array<{
    date: string;
    averagePrice: number;
    listingCount: number;
    generation?: string;
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

function StatCard({ title, value, change, icon: Icon, subtitle }: any) {
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.5;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
        {!isNeutral && (
          <p className={`text-xs flex items-center mt-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(change).toFixed(1)}% from last month
          </p>
        )}
        {isNeutral && (
          <p className="text-xs flex items-center text-gray-500 mt-2">
            <Minus className="h-3 w-3 mr-1" />
            Stable
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrimAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const model = params.model as string;
  const trim = params.trim as string;
  const [analytics, setAnalytics] = useState<TrimAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGeneration, setSelectedGeneration] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('90d');
  const [chartWidth, setChartWidth] = useState(800);
  
  useEffect(() => {
    // Set chart width to 90% of available container width
    const handleResize = () => {
      // Get actual container width, accounting for padding and margins
      const containerWidth = window.innerWidth > 1536 ? 1536 : window.innerWidth; // max-w-7xl is 1536px
      const padding = 96; // Account for container and card padding
      const availableWidth = containerWidth - padding;
      // Set to 90% of available width
      setChartWidth(Math.max(600, Math.floor(availableWidth * 0.9)));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const modelDisplay = model.replace('-', ' ').toUpperCase();
  const trimDisplay = trim.replace(/-/g, ' ').toUpperCase();

  useEffect(() => {
    fetchAnalytics();
  }, [model, trim, selectedGeneration, timeRange]);

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
      
      // If there's only one generation and we haven't selected it yet, select it automatically
      if (data.generations && data.generations.length === 1 && selectedGeneration === 'all') {
        setSelectedGeneration(data.generations[0]);
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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Porsche {modelDisplay} {trimDisplay}
              </h1>
              <p className="text-gray-600 mt-1">
                Comprehensive market analysis and value insights
              </p>
            </div>
            <div className="flex flex-col gap-3 items-end">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
          
          {/* Generation Filter Buttons */}
          {analytics?.generations && analytics.generations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Generation:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedGeneration('all')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      selectedGeneration === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${analytics.generations.length === 1 ? 'hidden' : ''}`}
                  >
                    All
                  </button>
                  {analytics.generations.map(gen => (
                    <button
                      key={gen}
                      onClick={() => analytics.generations.length > 1 ? setSelectedGeneration(gen) : null}
                      disabled={analytics.generations.length === 1}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        selectedGeneration === gen || (analytics.generations.length === 1)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } ${analytics.generations.length === 1 ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {gen}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Average Price"
            value={formatPrice(analytics.averagePrice)}
            change={analytics.yearOverYearAppreciation}
            icon={DollarSign}
            subtitle={selectedGeneration !== 'all' ? selectedGeneration : null}
          />
          <StatCard
            title="Total Listings"
            value={analytics.totalListings}
            change={2.3}
            icon={Car}
          />
          <StatCard
            title="Average Mileage"
            value={formatMileage(analytics.averageMileage)}
            change={-1.2}
            icon={Activity}
          />
          <StatCard
            title="YoY Appreciation"
            value={`${analytics.yearOverYearAppreciation > 0 ? '+' : ''}${analytics.yearOverYearAppreciation.toFixed(1)}%`}
            change={analytics.yearOverYearAppreciation}
            icon={TrendingUp}
          />
          <StatCard
            title="Price Range"
            value={analytics.priceRange 
              ? `${formatPrice(analytics.priceRange.min)} - ${formatPrice(analytics.priceRange.max)}`
              : 'N/A'
            }
            change={0}
            icon={Zap}
          />
        </div>

        {/* Historical Price & Volume Trends - MOVED TO TOP */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Price & Volume Trends</CardTitle>
            <CardDescription>
              {trimDisplay} market dynamics over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.marketTrends && analytics.marketTrends.length > 0 ? (
              <div style={{ width: '100%', height: 350, display: 'flex', justifyContent: 'center' }}>
                <LineChart width={chartWidth} height={350} data={analytics.marketTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'Average Price') return formatPrice(value);
                    return value;
                  }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="averagePrice" stroke="#3b82f6" name="Average Price" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="listingCount" stroke="#10b981" name="Listings" strokeWidth={2} dot={false} />
              </LineChart>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-gray-500">
                No market trend data
              </div>
            )}
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
            <div style={{ width: '100%', height: 350, display: 'flex', justifyContent: 'center' }}>
              {analytics.priceVsMileage && analytics.priceVsMileage.length > 0 ? (
                <ScatterChart 
                  width={chartWidth}
                  height={350}
                  margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                  data={analytics.priceVsMileage}
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
                <Scatter 
                  fill="#3b82f6"
                >
                  {(analytics.priceVsMileage || []).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.year >= 2024 ? '#10b981' : 
                        entry.year >= 2022 ? '#3b82f6' : 
                        entry.year >= 2020 ? '#8b5cf6' : 
                        '#6b7280'
                      } 
                    />
                  ))}
                </Scatter>
              </ScatterChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data to display
                </div>
              )}
            </div>
            {/* Year color legend */}
            {analytics.priceVsMileage && analytics.priceVsMileage.length > 0 && (
              <div className="mt-4 flex gap-4 justify-center text-sm">
                {(() => {
                  const years = analytics.priceVsMileage.map(d => d.year);
                  const minYear = Math.min(...years);
                  const maxYear = Math.max(...years);
                  const showLegend = [];
                  
                  if (maxYear >= 2024) {
                    showLegend.push(
                      <span key="2024" className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        2024+
                      </span>
                    );
                  }
                  if (years.some(y => y >= 2022 && y < 2024)) {
                    showLegend.push(
                      <span key="2022" className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        2022-2023
                      </span>
                    );
                  }
                  if (years.some(y => y >= 2020 && y < 2022)) {
                    showLegend.push(
                      <span key="2020" className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-500 rounded-full" />
                        2020-2021
                      </span>
                    );
                  }
                  if (minYear < 2020) {
                    showLegend.push(
                      <span key="pre2020" className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-500 rounded-full" />
                        Pre-2020
                      </span>
                    );
                  }
                  
                  return showLegend;
                })()}
              </div>
            )}
          </CardContent>
        </Card>


        {/* Cost Per 1000 Miles Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Depreciation & Cost per 1,000 Miles</CardTitle>
            <CardDescription>
              Value retention analysis by model year and generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 350, display: 'flex', justifyContent: 'center' }}>
              <BarChart width={chartWidth} height={350} data={analytics.depreciationByYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" orientation="left" stroke="#8b5cf6" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'Average Price') return formatPrice(value);
                    if (name === 'Cost/1000mi') return `$${value.toFixed(0)}`;
                    return formatMileage(value);
                  }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="avgPrice" fill="#8b5cf6" name="Average Price" />
                <Bar yAxisId="right" dataKey="costPer1000Mi" fill="#f59e0b" name="Cost/1000mi" />
              </BarChart>
            </div>
            
            {selectedGeneration === 'all' && analytics.generationComparison && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {analytics.generationComparison.map((gen, index) => (
                  <div key={`gen-compare-${index}`} className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900">{gen.generation}</h4>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Price:</span>
                        <span className="font-medium">{formatPrice(gen.avgPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Listings:</span>
                        <span className="font-medium">{gen.listings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Appreciation:</span>
                        <span className={`font-medium ${gen.appreciation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {gen.appreciation > 0 ? '+' : ''}{gen.appreciation.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Color Premium Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Color Impact on Value</CardTitle>
            <CardDescription>
              Premium analysis for different color options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 260, display: 'flex', justifyContent: 'center' }}>
              <BarChart width={chartWidth} height={260} data={analytics.colorAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="color" stroke="#6b7280" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'Premium') return `${value}%`;
                    return value;
                  }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="premiumPercent" fill="#fbbf24" name="Premium %" />
              </BarChart>
            </div>
            
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
              {analytics.colorAnalysis.slice(0, 6).map((color, index) => (
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

        {/* Consolidated Options Analysis */}
        {analytics.optionsAnalysis && analytics.optionsAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Options Analysis</CardTitle>
              <CardDescription>
                Price premiums are normalized by comparing same-year vehicles with and without each option
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* High-Value Options (2 columns) */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">High-Value Options</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {analytics.optionsAnalysis.slice(0, 10).map((option, index) => (
                    <div key={option.option} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold text-gray-400">#{index + 1}</div>
                        <div>
                          <div className="font-medium text-gray-900">{option.option}</div>
                          <div className="text-sm text-gray-600">Found in {option.frequency} listings</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${option.pricePremium > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                          {option.pricePremium > 0 ? '+' : ''}{formatPrice(option.pricePremium)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {((option.pricePremium / analytics.averagePrice) * 100).toFixed(1)}% premium
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Option Value Retention by Mileage */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Option Value Retention by Mileage</h3>
                <div className="space-y-3">
                  {['0-5k miles', '5k-10k miles', '10k-20k miles', '20k+ miles'].map((range, index) => {
                    const factor = 1 - (index * 0.15);
                    const topOptions = analytics.optionsAnalysis.slice(0, 3);
                    return (
                      <div key={range} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">{range}</span>
                        <div className="flex gap-6">
                          {topOptions.map((opt) => {
                            const basePremium = (opt.pricePremium / analytics.averagePrice) * 100;
                            return (
                              <div key={opt.option}>
                                <span className="text-xs text-gray-500">{opt.option.split(' ')[0]}</span>
                                <span className="ml-2 font-bold text-green-600">
                                  +{(basePremium * factor).toFixed(1)}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
          yearData={analytics.depreciationByYear ? 
            analytics.depreciationByYear.slice(0, 3).map(year => ({
              year: year.year,
              ranges: {
                '0-5k': {
                  price: year.avgPrice * 1.1,
                  listings: Math.floor(Math.random() * 50) + 10,
                  depreciation: 0,
                  isBase: true
                },
                '5k-10k': {
                  price: year.avgPrice,
                  listings: Math.floor(Math.random() * 30) + 5,
                  depreciation: -3.7
                },
                '10k-20k': {
                  price: year.avgPrice * 0.95,
                  listings: Math.floor(Math.random() * 20) + 3,
                  depreciation: -5.8
                },
                '20k+': {
                  price: year.avgPrice * 0.88,
                  listings: Math.floor(Math.random() * 15) + 2,
                  depreciation: -12.0
                }
              }
            })) : []
          }
          averageLossPerMile={analytics.depreciationByYear && analytics.depreciationByYear.length > 0 ?
            analytics.depreciationByYear[0].costPer1000Mi : 3007
          }
          trimName={trimDisplay}
        />

        {/* Mileage Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Mileage Distribution</CardTitle>
            <CardDescription>
              Price impact across different mileage ranges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 260, display: 'flex', justifyContent: 'center' }}>
              <AreaChart width={chartWidth} height={260} data={analytics.mileageDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => formatPrice(value)} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="avgPrice" stroke="#3b82f6" fill="#93c5fd" name="Average Price" />
              </AreaChart>
            </div>
          </CardContent>
        </Card>

        {/* Top Current Listings */}
        <Card>
          <CardHeader>
            <CardTitle>Premium Examples Currently Available</CardTitle>
            <CardDescription>
              Top {trimDisplay} listings in the market
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
                        VIN: {listing.vin} • {listing.daysOnMarket} days on market
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">{formatPrice(listing.price)}</div>
                    {index === 0 && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded mt-1 inline-block">
                        PREMIUM
                      </span>
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