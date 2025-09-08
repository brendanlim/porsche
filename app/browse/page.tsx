'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Car, DollarSign, Activity, Flame, ArrowRight, Filter, Gauge } from 'lucide-react';

interface TrimData {
  id: string;
  name: string;
  model: string;
  is_high_performance: boolean;
  stats: {
    totalListings: number;
    activeListings: number;
    soldListings: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    averageMileage: number;
    appreciation: number;
    recentListings: number;
    marketHeat: 'hot' | 'warm' | 'cool';
  };
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

function TrimCard({ trim }: { trim: TrimData }) {
  const modelSlug = trim.model.toLowerCase().replace(/\s+/g, '-');
  const trimSlug = trim.name.toLowerCase().replace(/\s+/g, '-');
  const analyticsUrl = `/models/${modelSlug}/${trimSlug}/analytics`;

  return (
    <Link href={analyticsUrl}>
      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-gray-200 hover:border-blue-300 h-full">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                {trim.model} {trim.name}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                {trim.stats.totalListings} total listings
              </CardDescription>
            </div>
            <div className="flex flex-col gap-1 items-end">
              {trim.is_high_performance && (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  High Performance
                </Badge>
              )}
              {trim.stats.marketHeat === 'hot' && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                  <Flame className="h-3 w-3 mr-1" />
                  Hot Market
                </Badge>
              )}
              {trim.stats.marketHeat === 'warm' && (
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Warm Market
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Price Range */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Price</span>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(trim.stats.averagePrice)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{formatPrice(trim.stats.minPrice)}</span>
              <div className="flex-1 mx-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                  style={{
                    width: `${((trim.stats.averagePrice - trim.stats.minPrice) / (trim.stats.maxPrice - trim.stats.minPrice)) * 100}%`
                  }}
                />
              </div>
              <span>{formatPrice(trim.stats.maxPrice)}</span>
            </div>
          </div>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${trim.stats.appreciation > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {trim.stats.appreciation > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-600">YoY</p>
                <p className={`text-sm font-semibold ${trim.stats.appreciation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trim.stats.appreciation > 0 ? '+' : ''}{trim.stats.appreciation.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Gauge className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Avg Mileage</p>
                <p className="text-sm font-semibold text-gray-900">
                  {trim.stats.averageMileage > 0 ? formatMileage(trim.stats.averageMileage) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Market Activity */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center text-sm">
              <div className="flex gap-3">
                <span className="text-gray-600">
                  <span className="font-semibold text-green-600">{trim.stats.activeListings}</span> active
                </span>
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-500">{trim.stats.soldListings}</span> sold
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <span className="text-xs">{trim.stats.recentListings} new</span>
                <span className="text-xs text-gray-400">(30d)</span>
              </div>
            </div>
          </div>

          {/* View Analytics Link */}
          <div className="pt-3 flex items-center justify-between text-sm">
            <span className="text-blue-600 font-medium">View Full Analytics</span>
            <ArrowRight className="h-4 w-4 text-blue-600" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function BrowsePage() {
  const [trims, setTrims] = useState<TrimData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [performanceFilter, setPerformanceFilter] = useState<string>('all');

  useEffect(() => {
    fetchTrims();
  }, []);

  const fetchTrims = async () => {
    try {
      const response = await fetch('/api/trims');
      if (!response.ok) throw new Error('Failed to fetch trims');
      const data = await response.json();
      setTrims(data);
    } catch (error) {
      console.error('Error fetching trims:', error);
      setTrims([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrims = trims.filter(trim => {
    if (modelFilter !== 'all' && !trim.model.toLowerCase().includes(modelFilter)) {
      return false;
    }
    if (performanceFilter === 'high' && !trim.is_high_performance) {
      return false;
    }
    if (performanceFilter === 'regular' && trim.is_high_performance) {
      return false;
    }
    return true;
  });

  const uniqueModels = Array.from(new Set(trims.map(t => t.model))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Browse Porsche Models
          </h1>
          <p className="text-lg text-gray-600">
            Explore comprehensive market analytics for each Porsche trim level
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm"
            >
              <option value="all">All Models</option>
              {uniqueModels.map(model => (
                <option key={model} value={model.toLowerCase()}>{model}</option>
              ))}
            </select>
          </div>
          <select
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm"
          >
            <option value="all">All Performance Levels</option>
            <option value="high">High Performance Only</option>
            <option value="regular">Regular Models</option>
          </select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Trims</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredTrims.length}</p>
                </div>
                <Car className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Listings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredTrims.reduce((sum, t) => sum + t.stats.totalListings, 0)}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Market Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(
                      filteredTrims.reduce((sum, t) => sum + t.stats.averagePrice, 0) / 
                      (filteredTrims.length || 1)
                    )}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hot Markets</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredTrims.filter(t => t.stats.marketHeat === 'hot').length}
                  </p>
                </div>
                <Flame className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trim Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrims.map((trim) => (
            <TrimCard key={trim.id} trim={trim} />
          ))}
        </div>

        {filteredTrims.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No trims match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}