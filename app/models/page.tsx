'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Car, Activity, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ModelTrimData {
  model: string;
  trim: string | null;
  display_model: string;
  display_trim: string;
  total_listings: number;
  avg_price: number;
  avg_mileage: number;
  min_price: number;
  max_price: number;
  price_trend: number; // percentage change
  volume_trend: number; // percentage change
  last_30_days_listings: number;
  median_days_on_market: number;
  min_year?: number;
  max_year?: number;
}

export default function ModelsPage() {
  const [modelData, setModelData] = useState<ModelTrimData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchModelData();
  }, []);

  const fetchModelData = async () => {
    try {
      setLoading(true);
      
      // Fetch aggregated data for all models and trims
      const { data, error } = await supabase.rpc('get_all_models_analytics');
      
      if (error) {
        console.error('Error fetching model data:', error);
        // Fallback to basic query if RPC doesn't exist
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select('model, trim, price, mileage, year, created_at')
          .not('model', 'is', null)
          .order('model', { ascending: true });

        if (listingsError) throw listingsError;

        // Aggregate the data manually
        const aggregated = aggregateListings(listings || []);
        setModelData(aggregated);
      } else {
        setModelData(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load models data');
    } finally {
      setLoading(false);
    }
  };

  const aggregateListings = (listings: any[]): ModelTrimData[] => {
    const modelTrimMap = new Map<string, any>();
    
    listings.forEach(listing => {
      const key = `${listing.model || 'Unknown'}_${listing.trim || 'Base'}`;
      
      if (!modelTrimMap.has(key)) {
        modelTrimMap.set(key, {
          model: listing.model || 'Unknown',
          trim: listing.trim,
          display_model: formatModelName(listing.model),
          display_trim: listing.trim || 'Base',
          listings: [],
          recentListings: []
        });
      }
      
      const data = modelTrimMap.get(key);
      data.listings.push(listing);
      
      // Check if listing is from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (new Date(listing.created_at) > thirtyDaysAgo) {
        data.recentListings.push(listing);
      }
    });

    // Calculate aggregates
    const result: ModelTrimData[] = [];
    modelTrimMap.forEach(data => {
      const prices = data.listings.map((l: any) => l.price).filter((p: any) => p > 0);
      const mileages = data.listings.map((l: any) => l.mileage).filter((m: any) => m > 0);
      const years = data.listings.map((l: any) => l.year).filter((y: any) => y > 1990 && y <= new Date().getFullYear());
      
      result.push({
        model: data.model,
        trim: data.trim,
        display_model: data.display_model,
        display_trim: data.display_trim,
        total_listings: data.listings.length,
        avg_price: prices.length > 0 ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : 0,
        avg_mileage: mileages.length > 0 ? Math.round(mileages.reduce((a: number, b: number) => a + b, 0) / mileages.length) : 0,
        min_price: prices.length > 0 ? Math.min(...prices) : 0,
        max_price: prices.length > 0 ? Math.max(...prices) : 0,
        min_year: years.length > 0 ? Math.min(...years) : undefined,
        max_year: years.length > 0 ? Math.max(...years) : undefined,
        price_trend: 0, // Would need historical data to calculate
        volume_trend: 0, // Would need historical data to calculate
        last_30_days_listings: data.recentListings.length,
        median_days_on_market: 0 // Would need sold_date to calculate
      });
    });

    return result.sort((a, b) => {
      // Sort by model first, then by trim
      if (a.model !== b.model) {
        return a.model.localeCompare(b.model);
      }
      return (a.trim || '').localeCompare(b.trim || '');
    });
  };

  const formatModelName = (model: string | null): string => {
    if (!model) return 'Unknown';
    
    const modelMap: Record<string, string> = {
      '911': '911',
      '718-cayman': '718 Cayman',
      '718-boxster': '718 Boxster',
      '718-spyder': '718 Spyder',
      'taycan': 'Taycan',
      'panamera': 'Panamera',
      'cayenne': 'Cayenne',
      'macan': 'Macan'
    };
    
    return modelMap[model.toLowerCase()] || model;
  };

  const formatPrice = (price: number): string => {
    if (!price || price === 0) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatMileage = (mileage: number): string => {
    if (!mileage || mileage === 0) return '—';
    return new Intl.NumberFormat('en-US').format(mileage);
  };

  const getModelUrl = (model: string, trim: string | null): string => {
    const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
    const trimSlug = trim ? trim.toLowerCase().replace(/\s+/g, '-') : 'base';
    return `/models/${modelSlug}/${trimSlug}/analytics`;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (trend < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Group models by base model
  const groupedModels = modelData.reduce((acc, item) => {
    const baseModel = item.display_model;
    if (!acc[baseModel]) {
      acc[baseModel] = [];
    }
    acc[baseModel].push(item);
    return acc;
  }, {} as Record<string, ModelTrimData[]>);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading models data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Porsche Models Analytics</h1>
        <p className="text-gray-600">Market overview and analytics for all Porsche models and trims</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Models</p>
                <p className="text-2xl font-bold">{Object.keys(groupedModels).length}</p>
              </div>
              <Car className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Variants</p>
                <p className="text-2xl font-bold">{modelData.length}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Listings</p>
                <p className="text-2xl font-bold">
                  {modelData.reduce((sum, m) => sum + m.total_listings, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Price</p>
                <p className="text-2xl font-bold">
                  {formatPrice(
                    modelData.reduce((sum, m) => sum + m.avg_price, 0) / modelData.length
                  )}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Models Table List */}
      <div className="space-y-8">
        {Object.entries(groupedModels).map(([modelName, trims]) => (
          <div key={modelName}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{modelName}</h2>
            <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trim / Years
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Listings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Mileage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trends
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trims.map((trim) => (
                    <tr 
                      key={`${trim.model}_${trim.trim}`}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = getModelUrl(trim.model, trim.trim)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {trim.display_trim}
                          </div>
                          {trim.min_year && trim.max_year && (
                            <div className="text-sm text-gray-500">
                              {trim.min_year === trim.max_year 
                                ? trim.min_year 
                                : `${trim.min_year}-${trim.max_year}`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatPrice(trim.min_price)} - {formatPrice(trim.max_price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatPrice(trim.avg_price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {trim.total_listings}
                          </div>
                          {trim.last_30_days_listings > 0 && (
                            <div className="text-xs text-gray-500">
                              +{trim.last_30_days_listings} new
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatMileage(trim.avg_mileage)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {trim.price_trend !== 0 && (
                            <div className="flex items-center gap-1">
                              {getTrendIcon(trim.price_trend)}
                              <span className={`text-xs ${getTrendColor(trim.price_trend)}`}>
                                {Math.abs(trim.price_trend)}%
                              </span>
                            </div>
                          )}
                          {trim.volume_trend !== 0 && (
                            <div className="flex items-center gap-1">
                              {getTrendIcon(trim.volume_trend)}
                              <span className={`text-xs ${getTrendColor(trim.volume_trend)}`}>
                                {Math.abs(trim.volume_trend)}% vol
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {modelData.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Car className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No models data available</p>
              <p className="text-sm mt-2">Run the scraper to populate data</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}