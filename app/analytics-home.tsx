'use client';

import Link from 'next/link';
import { ArrowRight, TrendingUp, BarChart3, DollarSign, Activity } from 'lucide-react';

const MODELS = [
  { 
    slug: '911', 
    name: '911',
    description: 'The iconic sports car',
    metrics: { avgPrice: '$145,000', listings: 342, trend: '+5.2%' },
    hot: true 
  },
  { 
    slug: '718-cayman', 
    name: '718 Cayman',
    description: 'Mid-engine perfection',
    metrics: { avgPrice: '$85,000', listings: 128, trend: '+3.8%' },
    hot: true 
  },
  { 
    slug: '718-boxster', 
    name: '718 Boxster',
    description: 'Open-top thrills',
    metrics: { avgPrice: '$82,000', listings: 95, trend: '+2.1%' }
  },
];

export default function AnalyticsHome() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Porsche Market Analytics
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl">
            Real-time market intelligence for collectors, dealers, and enthusiasts. 
            Track prices, discover trends, and make data-driven decisions.
          </p>
        </div>
      </div>

      {/* Models Grid */}
      <div className="container mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-8">Select a Model for Detailed Analytics</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODELS.map((model) => (
            <Link
              key={model.slug}
              href={`/models/${model.slug}/analytics`}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 relative group"
            >
              {model.hot && (
                <span className="absolute top-4 right-4 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  HOT
                </span>
              )}
              
              <h3 className="text-xl font-bold mb-2">{model.name}</h3>
              <p className="text-gray-600 mb-4">{model.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg Price:</span>
                  <span className="font-semibold">{model.metrics.avgPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Active Listings:</span>
                  <span className="font-semibold">{model.metrics.listings}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">30-Day Trend:</span>
                  <span className="font-semibold text-green-600">{model.metrics.trend}</span>
                </div>
              </div>
              
              <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                <span className="text-sm font-medium">View Analytics</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Features Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8">What You'll Get</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <TrendingUp className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-2">Market Trends</h3>
              <p className="text-sm text-gray-600">
                Historical pricing and volume trends to spot opportunities
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-semibold mb-2">Trim Analysis</h3>
              <p className="text-sm text-gray-600">
                Compare GT models, base trims, and special editions
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <DollarSign className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="font-semibold mb-2">Value Insights</h3>
              <p className="text-sm text-gray-600">
                Price vs mileage correlation and depreciation patterns
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Activity className="h-8 w-8 text-red-600 mb-3" />
              <h3 className="font-semibold mb-2">Top Performers</h3>
              <p className="text-sm text-gray-600">
                Identify appreciating models and investment opportunities
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}