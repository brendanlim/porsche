'use client';

import { useState, useEffect } from 'react';
import { MarketChart } from '@/components/MarketChart';
import { ChartDataPoint } from '@/lib/types/database';
import { formatPrice } from '@/lib/utils';
import { TrendingUp, Users, Shield, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedModel, setSelectedModel] = useState('911');

  useEffect(() => {
    fetchMarketData();
  }, [selectedModel]);

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

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Never Overpay for Your Dream Porsche
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Real-time market data and price analysis for every Porsche model.
              Make informed decisions with confidence.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/browse"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Browse Listings
              </Link>
              <Link
                href="/signup"
                className="bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-400 transition"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {stats && (
        <section className="py-12 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {stats.count.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Active Listings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {formatPrice(stats.medianPrice)}
                </div>
                <div className="text-sm text-gray-600">Median Price</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  7
                </div>
                <div className="text-sm text-gray-600">Models Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  24/7
                </div>
                <div className="text-sm text-gray-600">Data Updates</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Market Chart Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Live Market Analysis
            </h2>
            <p className="text-lg text-gray-600">
              Price vs. mileage trends for {selectedModel} models
            </p>
          </div>

          {/* Model Selector */}
          <div className="flex justify-center gap-4 mb-8">
            {popularModels.map(model => (
              <button
                key={model.name}
                onClick={() => setSelectedModel(model.name)}
                className={`px-6 py-2 rounded-lg font-medium transition ${
                  selectedModel === model.name
                    ? 'bg-blue-600 text-white'
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
              <div className="h-[600px] flex items-center justify-center">
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

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why PorscheStats?
            </h2>
            <p className="text-lg text-gray-600">
              The most comprehensive Porsche market intelligence platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-Time Data</h3>
              <p className="text-gray-600">
                Live market data updated daily from multiple sources
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Price History</h3>
              <p className="text-gray-600">
                Track price changes and market trends over time
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">VIN Tracking</h3>
              <p className="text-gray-600">
                Complete history for any Porsche by VIN number
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Expert Analysis</h3>
              <p className="text-gray-600">
                AI-powered insights and market recommendations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Models Section */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Popular Models
            </h2>
            <p className="text-lg text-gray-600">
              Explore market data for specific models and trims
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {popularModels.map(model => (
              <div key={model.name} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">{model.name}</h3>
                <div className="space-y-2 mb-4">
                  {model.trims.map(trim => (
                    <Link
                      key={trim}
                      href={`/browse?model=${encodeURIComponent(model.name)}&trim=${encodeURIComponent(trim)}`}
                      className="block text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {trim}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/browse?model=${encodeURIComponent(model.name)}`}
                  className="text-sm text-gray-600 hover:text-blue-600"
                >
                  View all {model.name} listings →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Find Your Perfect Porsche?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of enthusiasts using PorscheStats to make smarter decisions
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>
    </div>
  );
}