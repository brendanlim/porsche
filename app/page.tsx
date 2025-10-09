'use client';

import { useState, useEffect } from 'react';
import { MarketChart } from '@/components/MarketChart';
import { ChartDataPoint } from '@/lib/types/database';
import { formatPrice } from '@/lib/utils';
import { TrendingUp, Users, Shield, BarChart3, Bell, Zap, Search, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Cell } from 'recharts';

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
  const [trendingModels, setTrendingModels] = useState<any[]>([]);
  const [featuredNarrative, setFeaturedNarrative] = useState<any>(null);
  const [narrativeExamples, setNarrativeExamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedModel, setSelectedModel] = useState('911');

  useEffect(() => {
    fetchMarketData();
    fetchHomeStats();
    fetchTrendingModels();
    fetchFeaturedNarrative();
    fetchNarrativeExamples();
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

  const fetchTrendingModels = async () => {
    try {
      const response = await fetch('/api/market-insights');
      const data = await response.json();
      if (data.trending) {
        setTrendingModels(data.trending.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to fetch trending models:', error);
    }
  };

  const fetchFeaturedNarrative = async () => {
    try {
      // Fetch 991.2 GT3 narrative as featured (high confidence, lots of data)
      const response = await fetch('/api/analytics/narrative?model=911&trim=GT3&generation=991.2');
      const data = await response.json();
      if (data.narrative) {
        setFeaturedNarrative(data.narrative);
      }
    } catch (error) {
      console.error('Failed to fetch narrative:', error);
    }
  };

  const fetchNarrativeExamples = async () => {
    try {
      const narratives = await Promise.all([
        fetch('/api/analytics/narrative?model=911&trim=GT3 RS&generation=992.1').then(r => r.json()),
        fetch('/api/analytics/narrative?model=718 Cayman&trim=GT4 RS&generation=982.2').then(r => r.json()),
        fetch('/api/analytics/narrative?model=911&trim=Turbo S&generation=992.1').then(r => r.json()),
      ]);
      setNarrativeExamples(narratives.map(n => n.narrative).filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch narrative examples:', error);
    }
  };

  const popularModels = [
    { name: '911', trims: ['GT3', 'GT3 RS', 'Turbo S'] },
    { name: '718 Cayman', trims: ['GT4', 'GT4 RS', 'GTS 4.0'] },
    { name: '718 Boxster', trims: ['Spyder', 'Spyder RS', 'GTS 4.0'] },
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
                href="/waitlist"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
              >
                <ArrowUp className="w-4 h-4 rotate-45" />
                Get Early Access
              </Link>
            </div>

            {/* Preview - Trending Models */}
            {trendingModels.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4 mt-8">
                {trendingModels.map((model, idx) => (
                  <div key={idx} className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-300">{model.model} {model.trim}</h3>
                      <span className={`flex items-center gap-1 text-sm font-semibold ${
                        model.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {model.priceChange >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                        {Math.abs(model.priceChange).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {model.volume} active listings
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Market Analysis - Unique Feature Showcase */}
      {featuredNarrative && (
        <section className="py-12 bg-gradient-to-br from-blue-50 via-blue-100/30 to-indigo-50 relative overflow-hidden">
          {/* Subtle accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
            {/* Feature Highlight Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-full mb-4">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-semibold">AI MARKET INTELLIGENCE</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Automated Market Analysis
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-2">
                AI-generated intelligence for every Porsche model
              </p>
              <p className="text-gray-500 text-sm">
                Free sample below — subscribers get this for 50+ models
              </p>
            </div>

            <div className="bg-white text-gray-900 rounded-2xl shadow-2xl p-8">
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{featuredNarrative.model} {featuredNarrative.trim}</h3>
                    <p className="text-sm text-gray-500">
                      {featuredNarrative.generation && `${featuredNarrative.generation} • `}
                      Auto-updated {new Date(featuredNarrative.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {featuredNarrative.confidence && (
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    featuredNarrative.confidence === 'high' ? 'bg-green-100 text-green-700' :
                    featuredNarrative.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {featuredNarrative.confidence} confidence
                  </span>
                )}
              </div>

              {/* Two Column Layout */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Summary */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Executive Summary</h4>
                    <p className="text-gray-700 leading-relaxed">
                      {featuredNarrative.summary}
                    </p>
                  </div>

                  {/* Key Insights */}
                  {featuredNarrative.key_insights && featuredNarrative.key_insights.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Key Insights</h4>
                      <div className="space-y-3">
                        {featuredNarrative.key_insights.map((insight: string, i: number) => (
                          <div key={i} className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                              {i + 1}
                            </div>
                            <p className="text-gray-700 text-sm">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Full Analysis */}
                  {featuredNarrative.analysis && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Detailed Analysis</h4>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <p className="whitespace-pre-line leading-relaxed">{featuredNarrative.analysis}</p>
                      </div>
                    </div>
                  )}

                  {/* Market Outlook */}
                  {featuredNarrative.market_outlook && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        Market Outlook
                      </h4>
                      <p className="text-gray-700 leading-relaxed">{featuredNarrative.market_outlook}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                      <h3 className="text-2xl font-bold mb-2">Available for 50+ Porsche Models</h3>
                      <p className="text-blue-100">
                        Get comprehensive analysis for every model you&apos;re tracking
                      </p>
                    </div>
                    <Link
                      href="/waitlist"
                      className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition flex items-center gap-2 whitespace-nowrap shadow-lg"
                    >
                      Get Early Access
                      <ArrowUp className="w-5 h-5 rotate-45" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}


      {/* Section 2: Real-Time Market Data */}
      <section className="py-16 bg-white border-t">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full mb-4">
              <Activity className="w-4 h-4 text-gray-700" />
              <span className="text-xs font-semibold text-gray-700">LIVE DATA</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Real-Time Market Tracking
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Pricing trends and market activity updated throughout the day from 7+ sources
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Price Trend Chart Example */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">911 GT3 (991.2)</h3>
                  <p className="text-sm text-gray-500">90-Day Price Trend</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">$168k</div>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                    <ArrowUp className="w-4 h-4" />
                    6.5%
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[
                  { date: 'Aug', price: 158000 },
                  { date: 'Sep', price: 163000 },
                  { date: 'Oct', price: 168000 },
                ]}>
                  <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 5 }} />
                  <XAxis dataKey="date" />
                  <YAxis hide />
                  <Tooltip formatter={(value: any) => formatPrice(value)} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Volume Chart Example */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">718 GT4 RS</h3>
                  <p className="text-sm text-gray-500">Recently Sold</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">47</div>
                  <div className="text-sm text-gray-500">This Quarter</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { month: 'Aug', count: 32 },
                  { month: 'Sep', count: 41 },
                  { month: 'Oct', count: 47 },
                ]}>
                  <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  <XAxis dataKey="month" />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features Upsell Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 via-blue-100/30 to-indigo-50 border-y border-blue-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-full mb-4">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-semibold">PREMIUM INTELLIGENCE</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Unlock Advanced Market Intelligence
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get deeper insights to time your purchase or sale perfectly
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-4 rounded-xl shrink-0">
                  <Activity className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Seasonality Analysis</h3>
                  <p className="text-gray-600 mb-4">
                    Discover the best months to buy & sell based on historical pricing patterns and market cycles.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      Seasonal price impact by month
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      Sales volume trends
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      Optimal timing recommendations
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 p-4 rounded-xl shrink-0">
                  <TrendingUp className="w-7 h-7 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Depreciation Curves</h3>
                  <p className="text-gray-600 mb-4">
                    Year-over-year value retention analysis to understand long-term investment potential.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                      Historical depreciation rates
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                      Age vs. value correlation
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                      Future value projections
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-4 rounded-xl shrink-0">
                  <BarChart3 className="w-7 h-7 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Option Impact Analysis</h3>
                  <p className="text-gray-600 mb-4">
                    Understand how PTS colors, carbon packages, and factory options affect market value.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                      PTS premium valuations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                      Carbon ceramic brake impact
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                      Popular package pricing
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 p-4 rounded-xl shrink-0">
                  <Zap className="w-7 h-7 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Buy Signals</h3>
                  <p className="text-gray-600 mb-4">
                    AI-powered timing recommendations based on current market conditions and historical cycles.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div>
                      Optimal purchase timing
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div>
                      Market sentiment indicators
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div>
                      Price trend predictions
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2">Available for 50+ Porsche Models</h3>
                <p className="text-blue-100">
                  Get comprehensive analysis for every model you&apos;re tracking
                </p>
              </div>
              <Link
                href="/waitlist"
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition flex items-center gap-2 whitespace-nowrap shadow-lg"
              >
                Get Early Access
                <ArrowUp className="w-5 h-5 rotate-45" />
              </Link>
            </div>
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
              href="/waitlist"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Join Waitlist
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