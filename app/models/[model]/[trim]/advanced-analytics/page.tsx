'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart,
  ReferenceLine, Brush, RadialBarChart, RadialBar
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, Activity, 
  BarChart3, PieChartIcon, Clock, Package, Gauge, AlertCircle 
} from 'lucide-react';

interface AdvancedAnalytics {
  model: string;
  trim: string;
  
  // Depreciation Analysis
  depreciationCurve: Array<{
    mileage: number;
    value: number;
    percentOfMSRP: number;
    samples: number;
  }>;
  
  // Options Analysis
  optionsImpact: Array<{
    option: string;
    frequency: number;
    avgPremium: number;
    demandScore: number;
  }>;
  
  // Market Events Timeline
  marketEvents: Array<{
    date: string;
    listed: number;
    sold: number;
    avgDaysToSell: number;
    avgSalePrice: number;
  }>;
  
  // Seasonal Trends
  seasonalTrends: Array<{
    month: string;
    avgPrice: number;
    volume: number;
    sellThrough: number;
  }>;
  
  // Geographic Distribution
  geographicData: Array<{
    region: string;
    listings: number;
    avgPrice: number;
    marketShare: number;
  }>;
  
  // Price Distribution
  priceDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  
  // Dealer vs Private
  sellerAnalysis: {
    dealer: { count: number; avgPrice: number; avgDays: number };
    private: { count: number; avgPrice: number; avgDays: number };
  };
  
  // Color Popularity
  colorPopularity: Array<{
    color: string;
    count: number;
    avgPrice: number;
    daysToSell: number;
  }>;
  
  // Performance Metrics
  performanceMetrics: {
    priceVolatility: number;
    liquidityScore: number;
    appreciationRate: number;
    marketHeat: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, color = "blue" }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-3 flex items-center text-sm">
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(trend).toFixed(1)}% vs last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdvancedAnalyticsPage() {
  const params = useParams();
  const model = params.model as string;
  const trim = params.trim as string;
  const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const modelDisplay = model.replace('-', ' ').toUpperCase();
  const trimDisplay = trim.replace('-', ' ').toUpperCase();

  useEffect(() => {
    // Simulate fetching advanced analytics
    setTimeout(() => {
      setAnalytics({
        model: modelDisplay,
        trim: trimDisplay,
        
        depreciationCurve: [
          { mileage: 0, value: 100, percentOfMSRP: 100, samples: 5 },
          { mileage: 5000, value: 92, percentOfMSRP: 92, samples: 12 },
          { mileage: 10000, value: 85, percentOfMSRP: 85, samples: 18 },
          { mileage: 15000, value: 80, percentOfMSRP: 80, samples: 22 },
          { mileage: 20000, value: 76, percentOfMSRP: 76, samples: 25 },
          { mileage: 30000, value: 70, percentOfMSRP: 70, samples: 20 },
          { mileage: 40000, value: 65, percentOfMSRP: 65, samples: 15 },
          { mileage: 50000, value: 62, percentOfMSRP: 62, samples: 10 },
        ],
        
        optionsImpact: [
          { option: 'Sport Chrono', frequency: 85, avgPremium: 3500, demandScore: 95 },
          { option: 'Carbon Ceramic Brakes', frequency: 60, avgPremium: 8500, demandScore: 88 },
          { option: 'Front Axle Lift', frequency: 45, avgPremium: 2800, demandScore: 72 },
          { option: 'Sport Exhaust', frequency: 70, avgPremium: 2900, demandScore: 85 },
          { option: 'Extended Leather', frequency: 55, avgPremium: 4200, demandScore: 68 },
          { option: 'Carbon Fiber Interior', frequency: 35, avgPremium: 5500, demandScore: 78 },
          { option: 'LED Matrix Headlights', frequency: 90, avgPremium: 1800, demandScore: 82 },
          { option: 'Burmester Audio', frequency: 40, avgPremium: 5800, demandScore: 65 },
        ],
        
        marketEvents: [
          { date: '2024-01', listed: 12, sold: 8, avgDaysToSell: 22, avgSalePrice: 285000 },
          { date: '2024-02', listed: 15, sold: 10, avgDaysToSell: 18, avgSalePrice: 289000 },
          { date: '2024-03', listed: 18, sold: 14, avgDaysToSell: 15, avgSalePrice: 292000 },
          { date: '2024-04', listed: 22, sold: 16, avgDaysToSell: 20, avgSalePrice: 294000 },
          { date: '2024-05', listed: 20, sold: 15, avgDaysToSell: 17, avgSalePrice: 298000 },
          { date: '2024-06', listed: 25, sold: 18, avgDaysToSell: 14, avgSalePrice: 302000 },
        ],
        
        seasonalTrends: [
          { month: 'Jan', avgPrice: 280000, volume: 45, sellThrough: 65 },
          { month: 'Feb', avgPrice: 282000, volume: 48, sellThrough: 68 },
          { month: 'Mar', avgPrice: 288000, volume: 62, sellThrough: 72 },
          { month: 'Apr', avgPrice: 295000, volume: 78, sellThrough: 75 },
          { month: 'May', avgPrice: 298000, volume: 85, sellThrough: 78 },
          { month: 'Jun', avgPrice: 302000, volume: 82, sellThrough: 76 },
          { month: 'Jul', avgPrice: 305000, volume: 88, sellThrough: 80 },
          { month: 'Aug', avgPrice: 303000, volume: 85, sellThrough: 77 },
          { month: 'Sep', avgPrice: 300000, volume: 75, sellThrough: 74 },
          { month: 'Oct', avgPrice: 295000, volume: 68, sellThrough: 70 },
          { month: 'Nov', avgPrice: 290000, volume: 55, sellThrough: 66 },
          { month: 'Dec', avgPrice: 285000, volume: 42, sellThrough: 62 },
        ],
        
        geographicData: [
          { region: 'California', listings: 45, avgPrice: 310000, marketShare: 28 },
          { region: 'Florida', listings: 32, avgPrice: 295000, marketShare: 20 },
          { region: 'Texas', listings: 28, avgPrice: 285000, marketShare: 18 },
          { region: 'New York', listings: 22, avgPrice: 305000, marketShare: 14 },
          { region: 'Illinois', listings: 15, avgPrice: 280000, marketShare: 9 },
          { region: 'Other', listings: 18, avgPrice: 275000, marketShare: 11 },
        ],
        
        priceDistribution: [
          { range: '$200-250k', count: 5, percentage: 10 },
          { range: '$250-275k', count: 8, percentage: 16 },
          { range: '$275-300k', count: 15, percentage: 30 },
          { range: '$300-325k', count: 12, percentage: 24 },
          { range: '$325-350k', count: 7, percentage: 14 },
          { range: '$350k+', count: 3, percentage: 6 },
        ],
        
        sellerAnalysis: {
          dealer: { count: 35, avgPrice: 298000, avgDays: 18 },
          private: { count: 15, avgPrice: 285000, avgDays: 25 },
        },
        
        colorPopularity: [
          { color: 'Guards Red', count: 12, avgPrice: 305000, daysToSell: 14 },
          { color: 'GT Silver', count: 10, avgPrice: 295000, daysToSell: 18 },
          { color: 'Shark Blue', count: 8, avgPrice: 310000, daysToSell: 12 },
          { color: 'Black', count: 7, avgPrice: 290000, daysToSell: 20 },
          { color: 'White', count: 6, avgPrice: 288000, daysToSell: 22 },
          { color: 'Miami Blue', count: 4, avgPrice: 315000, daysToSell: 10 },
          { color: 'Python Green', count: 3, avgPrice: 325000, daysToSell: 8 },
        ],
        
        performanceMetrics: {
          priceVolatility: 12.5,
          liquidityScore: 78,
          appreciationRate: 5.2,
          marketHeat: 85,
        },
      });
      setLoading(false);
    }, 1000);
  }, [model, trim]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {modelDisplay} {trimDisplay} Advanced Analytics
          </h1>
          <p className="text-gray-600 mt-2">
            Comprehensive market intelligence with depreciation curves, options analysis, and market events
          </p>
        </div>

        {/* Performance Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Price Volatility"
            value={`${analytics.performanceMetrics.priceVolatility}%`}
            subtitle="30-day standard deviation"
            icon={Activity}
            color="blue"
          />
          <MetricCard
            title="Liquidity Score"
            value={analytics.performanceMetrics.liquidityScore}
            subtitle="Days to sell vs market"
            icon={Gauge}
            color="green"
          />
          <MetricCard
            title="Appreciation Rate"
            value={`+${analytics.performanceMetrics.appreciationRate}%`}
            subtitle="Year over year"
            icon={TrendingUp}
            color="purple"
          />
          <MetricCard
            title="Market Heat"
            value={`${analytics.performanceMetrics.marketHeat}/100`}
            subtitle="Buyer demand index"
            icon={AlertCircle}
            color={analytics.performanceMetrics.marketHeat > 70 ? 'red' : 'yellow'}
          />
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="depreciation" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="depreciation">Depreciation</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="events">Market Events</TabsTrigger>
            <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
            <TabsTrigger value="geographic">Geographic</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          {/* Depreciation Curve */}
          <TabsContent value="depreciation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Depreciation Curve by Mileage</CardTitle>
                <CardDescription>
                  Value retention analysis based on mileage bands with sample sizes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height="400">
                  <ComposedChart data={analytics.depreciationCurve}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="mileage" 
                      tickFormatter={(value) => `${value/1000}k`}
                    />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'Value') return `${value}% of MSRP`;
                        return value;
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="percentOfMSRP"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Value"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="samples"
                      fill="#10b981"
                      opacity={0.5}
                      name="Sample Size"
                    />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
                
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900">Sweet Spot</h4>
                    <p className="text-2xl font-bold text-blue-600">10-20k miles</p>
                    <p className="text-sm text-blue-700 mt-1">Best value retention</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-900">Break Point</h4>
                    <p className="text-2xl font-bold text-yellow-600">30k miles</p>
                    <p className="text-sm text-yellow-700 mt-1">Major depreciation threshold</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900">Stable Zone</h4>
                    <p className="text-2xl font-bold text-green-600">40k+ miles</p>
                    <p className="text-sm text-green-700 mt-1">Depreciation slows</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Options Analysis */}
          <TabsContent value="options" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Options Impact on Value</CardTitle>
                <CardDescription>
                  Most valuable options and their market demand
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height="400">
                  <RadarChart data={analytics.optionsImpact}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="option" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Demand Score"
                      dataKey="demandScore"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Frequency %"
                      dataKey="frequency"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
                
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Option Premium Analysis</h4>
                  <div className="space-y-2">
                    {analytics.optionsImpact
                      .sort((a, b) => b.avgPremium - a.avgPremium)
                      .map((option) => (
                        <div key={option.option} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <span className="font-medium">{option.option}</span>
                            <span className="text-sm text-gray-500">{option.frequency}% take rate</span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-bold text-green-600">+{formatPrice(option.avgPremium)}</p>
                              <p className="text-xs text-gray-500">avg premium</p>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              option.demandScore > 80 ? 'bg-green-100 text-green-800' :
                              option.demandScore > 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {option.demandScore} demand
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market Events Timeline */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Events Timeline</CardTitle>
                <CardDescription>
                  Listing and sale events with market velocity metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height="400">
                  <ComposedChart data={analytics.marketEvents}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="listed" fill="#3b82f6" name="Listed" />
                    <Bar yAxisId="left" dataKey="sold" fill="#10b981" name="Sold" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgDaysToSell"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Days to Sell"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
                
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Sell-Through Rate</h4>
                    <ResponsiveContainer width="100%" height="200">
                      <AreaChart data={analytics.marketEvents}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey={(data) => (data.sold / data.listed) * 100}
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.3}
                          name="Sell-Through %"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Average Sale Price Trend</h4>
                    <ResponsiveContainer width="100%" height="200">
                      <LineChart data={analytics.marketEvents}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={(value) => `$${value/1000}k`} />
                        <Tooltip formatter={(value: any) => formatPrice(value)} />
                        <Line
                          type="monotone"
                          dataKey="avgSalePrice"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: '#10b981' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seasonal Trends */}
          <TabsContent value="seasonal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Seasonal Market Patterns</CardTitle>
                <CardDescription>
                  Monthly trends in pricing, volume, and sell-through rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height="400">
                  <ComposedChart data={analytics.seasonalTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: any, name: string) => {
                      if (name === 'Avg Price') return formatPrice(value);
                      return value;
                    }} />
                    <Legend />
                    <Bar yAxisId="right" dataKey="volume" fill="#3b82f6" opacity={0.3} name="Volume" />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="avgPrice"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Avg Price"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="sellThrough"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Sell-Through %"
                    />
                    <Brush dataKey="month" height={30} stroke="#8884d8" />
                  </ComposedChart>
                </ResponsiveContainer>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Best Time to Buy</h4>
                  <p className="text-blue-700">November - January typically sees lower prices and more negotiating room</p>
                  <h4 className="font-semibold text-blue-900 mb-2 mt-4">Best Time to Sell</h4>
                  <p className="text-blue-700">April - July shows highest prices and fastest sell-through rates</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geographic Distribution */}
          <TabsContent value="geographic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Geographic Market Analysis</CardTitle>
                <CardDescription>
                  Regional distribution and pricing variations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Market Share by Region</h4>
                    <ResponsiveContainer width="100%" height="300">
                      <PieChart>
                        <Pie
                          data={analytics.geographicData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => `${entry.region}: ${entry.marketShare}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="marketShare"
                        >
                          {analytics.geographicData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Regional Pricing</h4>
                    <ResponsiveContainer width="100%" height="300">
                      <BarChart data={analytics.geographicData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => `$${value/1000}k`} />
                        <YAxis type="category" dataKey="region" />
                        <Tooltip formatter={(value: any) => formatPrice(value)} />
                        <Bar dataKey="avgPrice" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="mt-6 space-y-2">
                  {analytics.geographicData
                    .sort((a, b) => b.listings - a.listings)
                    .map((region) => (
                      <div key={region.region} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <span className="font-medium">{region.region}</span>
                          <span className="text-sm text-gray-500">{region.listings} listings</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-bold">{formatPrice(region.avgPrice)}</span>
                          <span className="text-sm text-gray-500">{region.marketShare}% share</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Analysis */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Price Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Distribution</CardTitle>
                  <CardDescription>Market segmentation by price bands</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height="300">
                    <BarChart data={analytics.priceDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="#3b82f6" name="% of Market" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Seller Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Dealer vs Private Party</CardTitle>
                  <CardDescription>Comparative seller analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-blue-900">Dealers</h4>
                        <span className="text-2xl font-bold text-blue-600">
                          {analytics.sellerAnalysis.dealer.count}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-blue-700">Avg Price:</span>
                          <span className="font-medium ml-1">
                            {formatPrice(analytics.sellerAnalysis.dealer.avgPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-blue-700">Days to Sell:</span>
                          <span className="font-medium ml-1">
                            {analytics.sellerAnalysis.dealer.avgDays}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-green-900">Private Party</h4>
                        <span className="text-2xl font-bold text-green-600">
                          {analytics.sellerAnalysis.private.count}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-green-700">Avg Price:</span>
                          <span className="font-medium ml-1">
                            {formatPrice(analytics.sellerAnalysis.private.avgPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-green-700">Days to Sell:</span>
                          <span className="font-medium ml-1">
                            {analytics.sellerAnalysis.private.avgDays}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Color Popularity */}
            <Card>
              <CardHeader>
                <CardTitle>Color Impact Analysis</CardTitle>
                <CardDescription>How color affects value and marketability</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height="300">
                  <ComposedChart data={analytics.colorPopularity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="color" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: any, name: string) => {
                      if (name === 'Avg Price') return formatPrice(value);
                      return value;
                    }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="avgPrice" fill="#3b82f6" name="Avg Price" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="daysToSell"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Days to Sell"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}