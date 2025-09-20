'use client';

import { useState, useEffect } from 'react';
import { MarketChart } from '@/components/MarketChart';
import { ChartDataPoint } from '@/lib/types/database';
import { formatPrice } from '@/lib/utils';
import { TrendingUp, Users, Shield, BarChart3, Bell, Zap, Search, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function HomePage() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [stats, setStats] = useState<{
    count: number;
    medianPrice: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
  } | null>(null);
  const [homeStats, setHomeStats] = useState<{
    totalListings: number;
    uniqueTrims: number;
    avgPrice: number;
    dataSources: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedModel, setSelectedModel] = useState('911');

  useEffect(() => {
    fetchMarketData();
    fetchHomeStats();
  }, [selectedModel]);

  const fetchHomeStats = async () => {
    try {
      const response = await fetch('/api/homepage-stats');
      const data = await response.json();
      if (data.success) {
        setHomeStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch homepage stats:', error);
    }
  };

  const fetchMarketData = async () => {
    try {
      const response = await fetch(`/api/market-data?model=${selectedModel}&limit=100`);
      const data = await response.json();
      if (data.success) {
        setChartData(data.data);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const popularModels = [
    { name: '911', trims: ['GT3', 'GT3 RS', 'Turbo S'] },
    { name: '718 Cayman', trims: ['GT4', 'GT4 RS', 'GTS 4.0'] },
    { name: '718 Boxster', trims: ['Spyder', 'Spyder RS', 'GTS 4.0'] },
  ];

  // Sample trend data for preview charts
  const trendData = [
    { month: 'Jan', gt3: 285000, gt4: 145000, turbo: 195000 },
    { month: 'Feb', gt3: 289000, gt4: 148000, turbo: 198000 },
    { month: 'Mar', gt3: 295000, gt4: 151000, turbo: 201000 },
    { month: 'Apr', gt3: 298000, gt4: 155000, turbo: 203000 },
    { month: 'May', gt3: 305000, gt4: 159000, turbo: 205000 },
    { month: 'Jun', gt3: 312000, gt4: 162000, turbo: 208000 },
  ];

  const volumeData = [
    { trim: 'GT3 RS', listings: 45, avgDays: 12 },
    { trim: 'GT3', listings: 78, avgDays: 18 },
    { trim: 'GT4 RS', listings: 32, avgDays: 8 },
    { trim: 'Turbo S', listings: 65, avgDays: 22 },
    { trim: 'GT4', listings: 89, avgDays: 15 },
  ];

  const hotModels = [
    { model: '911 GT3 RS', change: 12.5, trend: 'up', volume: 45 },
    { model: '718 GT4 RS', change: 15.2, trend: 'up', volume: 32 },
    { model: '911 Turbo S', change: -2.1, trend: 'down', volume: 65 },
    { model: '718 Spyder RS', change: 8.7, trend: 'up', volume: 28 },
  ];

  return (
    <div className="bg-gray-50">
      {/* Hero Section - Refined */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Smaller, more professional tagline */}
            <p className="text-sm uppercase tracking-wider text-gray-400 mb-4">
              Market Intelligence for Buyers, Sellers & Collectors
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              The Pulse of the Porsche Market
            </h1>
            <p className="text-lg mb-8 text-gray-300 max-w-2xl mx-auto">
              Track pricing trends, discover market opportunities, and make data-driven decisions 
              with comprehensive analytics updated throughout the day.
            </p>
            <div className="flex gap-4 justify-center mb-12">
              <Link
                href="/models"
                className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Explore Models
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Set Price Alerts
              </Link>
            </div>

            {/* Preview Charts Section */}
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              {/* Mini trend chart */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-2">6-Month Price Trends</h3>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={trendData}>
                    <Line type="monotone" dataKey="gt3" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="gt4" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 mt-2">GT3 & GT4 appreciation</p>
              </div>

              {/* Volume indicator */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Market Activity</h3>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={volumeData.slice(0, 3)}>
                    <Bar dataKey="listings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-400 mt-2">Active listings by trim</p>
              </div>

              {/* Hot models */}
              <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Trending Now</h3>
                <div className="space-y-2">
                  {hotModels.slice(0, 3).map((model, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">{model.model}</span>
                      <span className={`flex items-center gap-1 ${
                        model.trend === 'up' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {model.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(model.change)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Refined */}
      {homeStats && (
        <section className="py-8 bg-white border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {homeStats.totalListings.toLocaleString()}+
                </div>
                <div className="text-sm text-gray-600">Tracked Listings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {homeStats.uniqueTrims}+
                </div>
                <div className="text-sm text-gray-600">Trims Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  50+
                </div>
                <div className="text-sm text-gray-600">Daily Updates</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {homeStats.dataSources}
                </div>
                <div className="text-sm text-gray-600">Data Sources</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Market Chart Section */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Market Intelligence Dashboard
            </h2>
            <p className="text-lg text-gray-600">
              Analyze price patterns and market dynamics across different models
            </p>
          </div>

          {/* Model Selector */}
          <div className="flex justify-center gap-3 mb-8">
            {popularModels.map(model => (
              <button
                key={model.name}
                onClick={() => setSelectedModel(model.name)}
                className={`px-5 py-2 rounded-lg font-medium transition text-sm ${
                  selectedModel === model.name
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            {loading ? (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-gray-500">Loading market data...</div>
              </div>
            ) : (
              <MarketChart
                data={chartData}
                isBlurred={!isAuthenticated}
                onPointClick={(point) => {
                  if (point.url) {
                    window.open(point.url, '_blank');
                  }
                }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Features Section - Updated */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your Competitive Edge
            </h2>
            <p className="text-lg text-gray-600">
              Professional-grade tools for serious Porsche enthusiasts
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Fresh Analytics</h3>
              <p className="text-gray-600 text-sm">
                Market data refreshed throughout the day from 7+ trusted sources
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Alerts</h3>
              <p className="text-gray-600 text-sm">
                Get notified when your dream spec hits your target price
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Deep Insights</h3>
              <p className="text-gray-600 text-sm">
                Historical trends, depreciation curves, and market forecasts
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Fast Movers</h3>
              <p className="text-gray-600 text-sm">
                Spot undervalued listings before they&apos;re gone
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Models Section - With Market Heat */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Track Every Model
            </h2>
            <p className="text-lg text-gray-600">
              From allocation specs to modern classics
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {popularModels.map(model => (
              <div key={model.name} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{model.name}</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    Active Market
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  {model.trims.map(trim => (
                    <Link
                      key={trim}
                      href={`/models/${model.name.toLowerCase().replace(' ', '-')}/${trim.toLowerCase().replace(' ', '-')}/analytics`}
                      className="flex justify-between items-center text-sm group"
                    >
                      <span className="text-gray-700 group-hover:text-blue-600">{trim}</span>
                      <span className="text-gray-400 group-hover:text-blue-600">→</span>
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/models`}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all {model.name} data →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Refined */}
      <section className="py-16 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join the Informed Buyers
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Make confident decisions with data trusted by collectors worldwide
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Start Free Trial
            </Link>
            <Link
              href="/models"
              className="inline-block bg-white/10 backdrop-blur text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition"
            >
              Browse Analytics
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}