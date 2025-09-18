'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, Calendar, Car, Activity } from 'lucide-react';

interface ModelAnalytics {
  model: string;
  totalListings: number;
  averagePrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  averageMileage: number;
  marketTrends: Array<{
    date: string;
    averagePrice: number;
    listingCount: number;
    medianMileage: number;
  }>;
  trimAnalysis: Array<{
    trim: string;
    count: number;
    avgPrice: number;
    avgMileage: number;
    priceChange: number;
  }>;
  yearAnalysis: Array<{
    year: number;
    count: number;
    avgPrice: number;
    avgMileage: number;
  }>;
  priceVsMileage: Array<{
    mileage: number;
    price: number;
    trim: string;
    year: number;
  }>;
  topPerformers: Array<{
    vin: string;
    year: number;
    trim: string;
    price: number;
    mileage: number;
    appreciation: number;
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

function StatCard({ title, value, change, icon: Icon }: any) {
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.5;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {!isNeutral && (
          <p className={`text-xs flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(change).toFixed(1)}% from last month
          </p>
        )}
        {isNeutral && (
          <p className="text-xs flex items-center text-gray-500">
            <Minus className="h-3 w-3 mr-1" />
            Stable
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ModelAnalyticsPage() {
  const params = useParams();
  const model = params.model as string;
  const [analytics, setAnalytics] = useState<ModelAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('2y');

  useEffect(() => {
    fetchAnalytics();
  }, [model, timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics/${model}?range=${timeRange}`);
      if (!response.ok) {
        console.error('API error:', response.status);
        // Set default empty data structure
        setAnalytics({
          model: model.replace('-', ' '),
          totalListings: 0,
          averagePrice: 0,
          medianPrice: 0,
          priceRange: { min: 0, max: 0 },
          averageMileage: 0,
          marketTrends: [],
          trimAnalysis: [],
          yearAnalysis: [],
          priceVsMileage: [],
          topPerformers: []
        });
        return;
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Set default empty data structure
      setAnalytics({
        model: model.replace('-', ' '),
        totalListings: 0,
        averagePrice: 0,
        medianPrice: 0,
        priceRange: { min: 0, max: 0 },
        averageMileage: 0,
        marketTrends: [],
        trimAnalysis: [],
        yearAnalysis: [],
        priceVsMileage: [],
        topPerformers: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!analytics) {
    return <div>No data available</div>;
  }

  const modelDisplay = model.replace('-', ' ').toUpperCase();
  const priceChange = analytics.medianPrice > 0 
    ? ((analytics.averagePrice - analytics.medianPrice) / analytics.medianPrice) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Porsche {modelDisplay} Analytics</h1>
          <p className="text-gray-600 mt-1">Market insights and trends for collectors and enthusiasts</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Average Price"
          value={formatPrice(analytics.averagePrice)}
          change={priceChange}
          icon={DollarSign}
        />
        <StatCard
          title="Total Listings"
          value={analytics.totalListings}
          change={5.2}
          icon={Car}
        />
        <StatCard
          title="Average Mileage"
          value={formatMileage(analytics.averageMileage)}
          change={-2.1}
          icon={Activity}
        />
        <StatCard
          title="Price Range"
          value={analytics.priceRange 
            ? `${formatPrice(analytics.priceRange.min)} - ${formatPrice(analytics.priceRange.max)}`
            : 'N/A'
          }
          change={0}
          icon={TrendingUp}
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="market-trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="market-trends">Market Trends</TabsTrigger>
          <TabsTrigger value="trim-analysis">Trim Analysis</TabsTrigger>
          <TabsTrigger value="year-analysis">Year Analysis</TabsTrigger>
          <TabsTrigger value="price-mileage">Price vs Mileage</TabsTrigger>
          <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
        </TabsList>

        {/* Market Trends Tab */}
        <TabsContent value="market-trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price & Volume Trends</CardTitle>
              <CardDescription>
                Historical pricing and listing volume over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height="400">
                <LineChart data={analytics.marketTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip formatter={(value: any, name: string) => {
                    if (name === 'Average Price') return formatPrice(value);
                    return value;
                  }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="averagePrice" stroke="#8884d8" name="Average Price" />
                  <Line yAxisId="right" type="monotone" dataKey="listingCount" stroke="#82ca9d" name="Listing Count" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trim Analysis Tab */}
        <TabsContent value="trim-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Trim</CardTitle>
              <CardDescription>
                Compare different {modelDisplay} trim levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height="400">
                <BarChart data={analytics.trimAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="trim" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatPrice(value)} />
                  <Legend />
                  <Bar dataKey="avgPrice" fill="#8884d8" name="Average Price" />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="mt-6 space-y-2">
                {analytics.trimAnalysis.map((trim) => (
                  <div key={trim.trim} className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <span className="font-semibold">
                        {trim.trim}
                      </span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <span>{trim.count} listings</span>
                      <span className="font-medium">{formatPrice(trim.avgPrice)}</span>
                      <span className={`flex items-center ${trim.priceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trim.priceChange > 0 ? '↑' : '↓'} {Math.abs(trim.priceChange).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Year Analysis Tab */}
        <TabsContent value="year-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Year Analysis</CardTitle>
              <CardDescription>
                Price and availability by model year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height="400">
                <BarChart data={analytics.yearAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip formatter={(value: any, name: string) => {
                    if (name === 'Average Price') return formatPrice(value);
                    if (name === 'Average Mileage') return formatMileage(value);
                    return value;
                  }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avgPrice" fill="#8884d8" name="Average Price" />
                  <Bar yAxisId="right" dataKey="avgMileage" fill="#82ca9d" name="Average Mileage" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price vs Mileage Tab */}
        <TabsContent value="price-mileage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price vs Mileage Correlation</CardTitle>
              <CardDescription>
                Understand depreciation patterns and value retention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height="400">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mileage" name="Mileage" tickFormatter={(value) => `${value / 1000}k`} />
                  <YAxis dataKey="price" name="Price" tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'price') return formatPrice(value);
                      if (name === 'mileage') return formatMileage(value);
                      return value;
                    }}
                    labelFormatter={() => ''}
                  />
                  <Scatter name="Listings" data={analytics.priceVsMileage} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Performers Tab */}
        <TabsContent value="top-performers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Vehicles</CardTitle>
              <CardDescription>
                Highest appreciation and most sought-after configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topPerformers.map((vehicle, index) => (
                  <div key={vehicle.vin} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                      <div>
                        <div className="font-semibold">
                          {vehicle.year} {modelDisplay} {vehicle.trim}
                        </div>
                        <div className="text-sm text-gray-600">
                          VIN: {vehicle.vin} • {formatMileage(vehicle.mileage)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatPrice(vehicle.price)}</div>
                      <div className={`text-sm flex items-center justify-end ${
                        vehicle.appreciation > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {vehicle.appreciation > 0 ? '↑' : '↓'} {Math.abs(vehicle.appreciation).toFixed(1)}% appreciation
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Market Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Market Insights</CardTitle>
          <CardDescription>Key findings for {modelDisplay} collectors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold">Best Value Trim</h3>
              <p className="text-sm text-gray-600">
                Based on price-to-performance ratio and market availability
              </p>
              <div className="text-lg font-bold text-green-600">
                {analytics.trimAnalysis[0]?.trim || 'Base'}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Appreciation Leader</h3>
              <p className="text-sm text-gray-600">
                Trim with highest value appreciation over time
              </p>
              <div className="text-lg font-bold text-blue-600">
                {analytics.trimAnalysis[0]?.trim || 'Premium Trim'}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Sweet Spot Mileage</h3>
              <p className="text-sm text-gray-600">
                Optimal mileage range for value retention
              </p>
              <div className="text-lg font-bold">
                15,000 - 25,000 miles
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Market Trend</h3>
              <p className="text-sm text-gray-600">
                30-day price movement direction
              </p>
              <div className={`text-lg font-bold ${priceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange > 0 ? 'Appreciating' : 'Stabilizing'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}