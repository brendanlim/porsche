'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Car, Activity, ArrowRight, ChevronDown, ChevronUp, Info, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Sparkline } from '@/components/ui/sparkline';

interface ModelTrimData {
  model: string;
  trim: string | null;
  display_model: string;
  display_trim: string;
  original_model?: string; // Track the original model for generation detection
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

// Generation definitions for each model
const MODEL_GENERATIONS: Record<string, string[]> = {
  '911': ['992', '991', '997', '996', '993', '964'],
  'cayman': ['982', '981', '987'],
  'boxster': ['982', '981', '987', '986'],
  '718': ['982'],
  'taycan': ['J1'],
  'panamera': ['971', '970'],
  'cayenne': ['9Y0', '92A', '958', '955'],
  'macan': ['95B']
};

// Helper to get generation from year and model
function getGenerationFromYear(model: string, year: number): string {
  const normalizedModel = model.toLowerCase();

  if (normalizedModel === '911') {
    if (year >= 2019) return '992';
    if (year >= 2012) return '991';
    if (year >= 2005) return '997';
    if (year >= 1999) return '996';
    if (year >= 1995) return '993';
    if (year >= 1989) return '964';
  }

  // Handle all Cayman/Boxster variants including 718-prefixed ones
  if (normalizedModel === 'cayman' || normalizedModel === 'boxster' ||
      normalizedModel === '718-cayman' || normalizedModel === '718-boxster' ||
      normalizedModel.includes('718')) {

    // 982 generation (718) - 2017+
    if (year >= 2017) return '982';

    // 981 generation - 2013-2016
    if (year >= 2013 && year <= 2016) return '981';

    // 987 generation - Cayman 2006-2012, Boxster 2005-2012
    if (year >= 2005 && year <= 2012) return '987';

    // 986 generation - Boxster only 1997-2004
    if (year >= 1997 && year <= 2004 && (normalizedModel === 'boxster' || normalizedModel === '718-boxster')) return '986';
  }

  return '';
}

export default function ModelsPage() {
  const [modelData, setModelData] = useState<ModelTrimData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [allListings, setAllListings] = useState<any[]>([]);
  const [selectedGenerations, setSelectedGenerations] = useState<Record<string, string | null>>({});
  const supabase = createClient();
  
  const INITIAL_TRIMS_TO_SHOW = 10;

  useEffect(() => {
    fetchModelData();
  }, []);

  const fetchModelData = async () => {
    try {
      setLoading(true);
      
      // Fetch listings directly and aggregate in the frontend
      // Note: Supabase has a default limit of 1000, we need to fetch all
      // TEMPORARILY: Removing sold_date requirement for testing
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('model, trim, price, mileage, year, created_at, generation, sold_date')
        .not('model', 'is', null)
        // .not('sold_date', 'is', null) // TEMPORARILY DISABLED for testing generation filters
        .gt('price', 15000) // Filter out bad data
        .order('model', { ascending: true })
        .limit(9999);

      if (listingsError) throw listingsError;

      // Store the raw listings for sparkline data
      setAllListings(listings || []);
      
      // Aggregate the data manually
      const aggregated = aggregateListings(listings || []);
      setModelData(aggregated);
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
      // Normalize model names to combine 718 variants with base models
      let normalizedModel = listing.model || 'Unknown';
      const lowerModel = normalizedModel.toLowerCase();

      // Handle all 718 Cayman variants (with space, dash, or just 718)
      if (lowerModel === '718-cayman' || lowerModel === '718 cayman' ||
          (lowerModel === '718' && listing.trim?.toLowerCase().includes('gt4'))) {
        normalizedModel = 'cayman';
      } else if (lowerModel === '718-boxster' || lowerModel === '718 boxster') {
        normalizedModel = 'boxster';
      }
      
      const key = `${normalizedModel}_${listing.trim || 'Base'}`;
      
      if (!modelTrimMap.has(key)) {
        modelTrimMap.set(key, {
          model: normalizedModel,
          trim: listing.trim,
          display_model: formatModelName(normalizedModel),
          display_trim: listing.trim || 'Base',
          original_models: [], // Keep track of all original models for this trim
          listings: [],
          recentListings: []
        });
      }
      
      const data = modelTrimMap.get(key);
      // Track all original models for this trim
      if (!data.original_models.includes(listing.model)) {
        data.original_models.push(listing.model);
      }
      data.listings.push(listing);
      
      // Check if listing is from last 7 days (one week)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      if (new Date(listing.created_at) > oneWeekAgo) {
        data.recentListings.push(listing);
      }
    });

    // Calculate aggregates
    const result: ModelTrimData[] = [];
    modelTrimMap.forEach(data => {
      const prices = data.listings.map((l: any) => l.price).filter((p: any) => p > 0);
      const mileages = data.listings.map((l: any) => l.mileage).filter((m: any) => m > 0);
      const years = data.listings.map((l: any) => l.year).filter((y: any) => y > 1990 && y <= new Date().getFullYear());
      
      // Determine the primary original model (prefer 718- versions for generation detection)
      const primaryOriginalModel = data.original_models.find((m: string) => m.includes('718')) || 
                                    data.original_models[0] || 
                                    data.model;
      
      result.push({
        model: data.model,
        trim: data.trim,
        display_model: data.display_model,
        display_trim: data.display_trim,
        original_model: primaryOriginalModel,
        total_listings: data.listings.length,
        avg_price: prices.length > 0 ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : 0,
        avg_mileage: mileages.length > 0 ? Math.round(mileages.reduce((a: number, b: number) => a + b, 0) / mileages.length) : 0,
        min_price: prices.length > 0 ? Math.min(...prices) : 0,
        max_price: prices.length > 0 ? Math.max(...prices) : 0,
        min_year: years.length > 0 ? Math.min(...years) : undefined,
        max_year: years.length > 0 ? Math.max(...years) : undefined,
        price_trend: 0, // Would need historical data to calculate
        volume_trend: 0, // Would need historical data to calculate
        last_30_days_listings: data.recentListings.length, // Actually last 7 days now
        median_days_on_market: 0 // Would need sold_date to calculate
      });
    });

    return result.sort((a, b) => {
      // Sort by model first
      if (a.model !== b.model) {
        return a.model.localeCompare(b.model);
      }
      
      // Within each model, create priority tiers
      const getPriority = (trim: string | null) => {
        if (!trim) return 999;
        const t = trim.toUpperCase();
        
        // GT cars get highest priority (lower number = higher priority)
        if (t.includes('GT3 RS')) return 1;
        if (t.includes('GT3')) return 2;
        if (t.includes('GT2 RS')) return 3;
        if (t.includes('GT2')) return 4;
        if (t.includes('GT4 RS')) return 5;
        if (t.includes('GT4')) return 6;
        if (t.includes('TURBO S')) return 7;
        if (t.includes('TURBO')) return 8;
        if (t.includes('GTS')) return 9;
        return 999; // Everything else
      };
      
      const aPriority = getPriority(a.trim);
      const bPriority = getPriority(b.trim);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority tier, sort by average price (descending)
      return b.avg_price - a.avg_price;
    });
  };

  const formatModelName = (model: string | null): string => {
    if (!model) return 'Unknown';
    
    const modelMap: Record<string, string> = {
      '911': '911',
      '718-cayman': 'Cayman',  // Group under Cayman
      '718-boxster': 'Boxster', // Group under Boxster
      'cayman': 'Cayman',
      'boxster': 'Boxster',
      '718-spyder': 'Boxster Spyder',
      'taycan': 'Taycan',
      'panamera': 'Panamera',
      'cayenne': 'Cayenne',
      'macan': 'Macan'
    };
    
    return modelMap[model.toLowerCase()] || model;
  };
  
  const getGenerationLabel = (originalModel: string | null): string => {
    if (!originalModel) return '';
    const m = originalModel.toLowerCase();
    
    // Determine generation based on original model name (before normalization)
    if (m.includes('718')) return '718 (982)';
    if (m === 'cayman' || m === 'boxster') return '981/987';
    return '';
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

  const getModelUrl = (model: string, trim: string | null, generation?: string): string => {
    const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
    const trimSlug = trim ? trim.toLowerCase().replace(/\s+/g, '-') : 'base';
    const baseUrl = `/models/${modelSlug}/${trimSlug}/analytics`;
    return generation ? `${baseUrl}?generation=${generation}` : baseUrl;
  };


  // Group models by base model (normalize 718-Cayman/718-Boxster to Cayman/Boxster)
  const groupedModels = modelData.reduce((acc, item) => {
    let baseModel = item.display_model;
    
    // Normalize display model names for grouping
    if (baseModel === '718 Cayman') {
      baseModel = 'Cayman';
    } else if (baseModel === '718 Boxster') {
      baseModel = 'Boxster';
    }
    
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
        <p className="text-gray-600">Model and trim specific Porsche analytics</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-xl font-bold">
                  {allListings.length > 0
                    ? new Date(Math.max(...allListings.map(l => new Date(l.created_at).getTime()))).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : '—'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Total Trims
                  {Object.values(selectedGenerations).some(v => v) && ' (Filtered)'}
                </p>
                <p className="text-2xl font-bold">
                  {(() => {
                    // Calculate total trims considering all active filters
                    const allFilteredTrims = Object.entries(groupedModels).flatMap(([modelName, trims]) => {
                      const modelKey = modelName.toLowerCase();
                      const selectedGen = selectedGenerations[modelKey];

                      if (!selectedGen) return trims;

                      // Filter listings for this generation
                      const genFilteredListings = allListings.filter(listing => {
                        const listingModel = listing.model?.toLowerCase() || '';

                        // Normalize model names - handle all 718 variants
                        let normalizedModel = listingModel;
                        if (listingModel === '718-cayman' || listingModel === '718 cayman' ||
                            (listingModel === '718' && listing.trim?.toLowerCase().includes('gt4'))) {
                          normalizedModel = 'cayman';
                        } else if (listingModel === '718-boxster' || listingModel === '718 boxster') {
                          normalizedModel = 'boxster';
                        }

                        if (normalizedModel !== modelKey) return false;
                        const gen = getGenerationFromYear(normalizedModel, listing.year);
                        return gen === selectedGen;
                      });

                      const recalculatedTrims = aggregateListings(genFilteredListings);
                      return recalculatedTrims.filter(trim =>
                        trim.model.toLowerCase() === modelKey && trim.total_listings > 0
                      );
                    });

                    return allFilteredTrims.length;
                  })()}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  VINs Tracked
                  {Object.values(selectedGenerations).some(v => v) && ' (Filtered)'}
                </p>
                <p className="text-2xl font-bold">
                  {(() => {
                    // Calculate total VINs considering all active filters
                    const allFilteredTrims = Object.entries(groupedModels).flatMap(([modelName, trims]) => {
                      const modelKey = modelName.toLowerCase();
                      const selectedGen = selectedGenerations[modelKey];

                      if (!selectedGen) return trims;

                      // Filter listings for this generation
                      const genFilteredListings = allListings.filter(listing => {
                        const listingModel = listing.model?.toLowerCase() || '';

                        // Normalize model names - handle all 718 variants
                        let normalizedModel = listingModel;
                        if (listingModel === '718-cayman' || listingModel === '718 cayman' ||
                            (listingModel === '718' && listing.trim?.toLowerCase().includes('gt4'))) {
                          normalizedModel = 'cayman';
                        } else if (listingModel === '718-boxster' || listingModel === '718 boxster') {
                          normalizedModel = 'boxster';
                        }

                        if (normalizedModel !== modelKey) return false;
                        const gen = getGenerationFromYear(normalizedModel, listing.year);
                        return gen === selectedGen;
                      });

                      const recalculatedTrims = aggregateListings(genFilteredListings);
                      return recalculatedTrims.filter(trim =>
                        trim.model.toLowerCase() === modelKey && trim.total_listings > 0
                      );
                    });

                    return allFilteredTrims.reduce((sum, m) => sum + m.total_listings, 0).toLocaleString();
                  })()}
                </p>
              </div>
              <Car className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Avg Price
                  {Object.values(selectedGenerations).some(v => v) && ' (Filtered)'}
                </p>
                <p className="text-2xl font-bold">
                  {(() => {
                    // Calculate average price considering all active filters
                    const allFilteredTrims = Object.entries(groupedModels).flatMap(([modelName, trims]) => {
                      const modelKey = modelName.toLowerCase();
                      const selectedGen = selectedGenerations[modelKey];

                      if (!selectedGen) return trims;

                      // Filter listings for this generation
                      const genFilteredListings = allListings.filter(listing => {
                        const listingModel = listing.model?.toLowerCase() || '';

                        // Normalize model names - handle all 718 variants
                        let normalizedModel = listingModel;
                        if (listingModel === '718-cayman' || listingModel === '718 cayman' ||
                            (listingModel === '718' && listing.trim?.toLowerCase().includes('gt4'))) {
                          normalizedModel = 'cayman';
                        } else if (listingModel === '718-boxster' || listingModel === '718 boxster') {
                          normalizedModel = 'boxster';
                        }

                        if (normalizedModel !== modelKey) return false;
                        const gen = getGenerationFromYear(normalizedModel, listing.year);
                        return gen === selectedGen;
                      });

                      const recalculatedTrims = aggregateListings(genFilteredListings);
                      return recalculatedTrims.filter(trim =>
                        trim.model.toLowerCase() === modelKey && trim.total_listings > 0
                      );
                    });

                    const totalPrice = allFilteredTrims.reduce((sum, m) => sum + m.avg_price, 0);
                    const avgPrice = allFilteredTrims.length > 0 ? totalPrice / allFilteredTrims.length : 0;
                    return formatPrice(avgPrice);
                  })()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Models Table List */}
      <div className="space-y-8">
        {Object.entries(groupedModels)
          .sort(([a], [b]) => {
            // Fixed ordering: 911, Cayman, Boxster, then alphabetical
            const order: Record<string, number> = {
              '911': 1,
              'Cayman': 2,
              'Boxster': 3
            };
            const orderA = order[a] || 999;
            const orderB = order[b] || 999;
            if (orderA !== orderB) return orderA - orderB;
            return a.localeCompare(b);
          })
          .map(([modelName, trims]) => {
          const isExpanded = expandedModels.has(modelName);

          // Get available generations for this model
          const modelKey = modelName.toLowerCase();
          const availableGenerations = MODEL_GENERATIONS[modelKey] || [];
          const hasGenerations = availableGenerations.length > 0;
          const selectedGen = selectedGenerations[modelKey] || null;

          // Filter and recalculate data by selected generation if applicable
          let filteredTrims = trims;
          if (selectedGen) {
            // Filter raw listings by generation for recalculation
            const genFilteredListings = allListings.filter(listing => {
              const listingModel = listing.model?.toLowerCase() || '';

              // Normalize model names - handle all 718 variants
              let normalizedModel = listingModel;
              if (listingModel === '718-cayman' || listingModel === '718 cayman' ||
                  (listingModel === '718' && listing.trim?.toLowerCase().includes('gt4'))) {
                normalizedModel = 'cayman';
              } else if (listingModel === '718-boxster' || listingModel === '718 boxster') {
                normalizedModel = 'boxster';
              }

              // Check if this listing belongs to the current model
              if (normalizedModel !== modelKey) return false;

              // Get generation for this listing's year - handle all model variants
              const gen = getGenerationFromYear(normalizedModel, listing.year);
              return gen === selectedGen;
            });

            // Recalculate aggregates for filtered listings
            const recalculatedTrims = aggregateListings(genFilteredListings);

            // Filter to only show trims that have data for this generation
            filteredTrims = recalculatedTrims.filter(trim =>
              trim.model.toLowerCase() === modelKey && trim.total_listings > 0
            );
          }

          const shouldShowButton = filteredTrims.length > INITIAL_TRIMS_TO_SHOW;
          const displayedTrims = isExpanded ? filteredTrims : filteredTrims.slice(0, INITIAL_TRIMS_TO_SHOW);
          
          
          return (
          <div key={modelName}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{modelName}</h2>

            {/* Generation Filter Buttons */}
            {hasGenerations && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGenerations(prev => ({ ...prev, [modelKey]: null }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    !selectedGen
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Gens
                </button>
                {availableGenerations.map(gen => (
                  <button
                    key={gen}
                    onClick={() => setSelectedGenerations(prev => ({
                      ...prev,
                      [modelKey]: prev[modelKey] === gen ? null : gen
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedGen === gen
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {gen.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm overflow-x-auto relative">
              <table className="min-w-full divide-y divide-gray-200 relative">
                <thead className="bg-gray-50 relative">
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
                      <div className="flex items-center gap-1">
                        <span>Trends</span>
                        <div className="relative group inline-block" title="Price trend from last 10 sales">
                          <Info className="h-3 w-3 text-gray-400 cursor-help" />
                        </div>
                      </div>
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedTrims.map((trim) => (
                    <tr
                      key={`${trim.model}_${trim.trim}`}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = getModelUrl(trim.original_model || trim.model, trim.trim, selectedGen)}
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
                          {/* Show recent sales as a simple trend line */}
                          {(() => {
                            // Get recent sales for this trim (last 10 sales)
                            const trimListings = (allListings || [])
                              .filter((l: any) => {
                                // Normalize listing model to match with trim.model
                                const listingModel = l.model?.toLowerCase() || '';
                                let normalizedListingModel = listingModel;

                                // Handle all 718 variants
                                if (listingModel === '718-cayman' || listingModel === '718 cayman' ||
                                    (listingModel === '718' && l.trim?.toLowerCase().includes('gt4'))) {
                                  normalizedListingModel = 'cayman';
                                } else if (listingModel === '718-boxster' || listingModel === '718 boxster') {
                                  normalizedListingModel = 'boxster';
                                }

                                return normalizedListingModel === trim.model.toLowerCase() &&
                                       l.trim === trim.trim &&
                                       l.price > 0;
                              })
                              .sort((a: any, b: any) => new Date(b.sold_date || b.created_at).getTime() - new Date(a.sold_date || a.created_at).getTime())
                              .slice(0, 10);
                            
                            if (trimListings.length >= 3) {
                              // Use actual recent prices (normalized to show trend)
                              const prices = trimListings.map((l: any) => l.price).reverse();
                              const normalizedPrices = prices.map(p => p / 1000); // Scale for display
                              const trend = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
                              
                              return (
                                <div className="flex items-center gap-2">
                                  <Sparkline data={normalizedPrices} width={50} height={20} />
                                  <span className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                                  </span>
                                </div>
                              );
                            } else {
                              // Not enough data for a trend
                              return (
                                <span className="text-xs text-gray-400">
                                  Insufficient data
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shouldShowButton && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedModels(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(modelName)) {
                          newSet.delete(modelName);
                        } else {
                          newSet.add(modelName);
                        }
                        return newSet;
                      });
                    }}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show All {filteredTrims.length} Trims
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
          );
        })}
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