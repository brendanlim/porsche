'use client';

import { useState } from 'react';
import { Search, AlertCircle, TrendingDown, Calendar, MapPin } from 'lucide-react';
import { formatPrice, formatMileage, validateVIN } from '@/lib/utils';
import Link from 'next/link';

interface VINData {
  vin: string;
  listings: any[];
  priceHistory: any[];
  summary: {
    model?: string;
    trim?: string;
    year?: number;
    firstSeen?: string;
    lastSeen?: string;
    lowestPrice?: number;
    highestPrice?: number;
    currentPrice?: number;
    sold: boolean;
    soldPrice?: number;
    soldDate?: string;
    totalListings?: number;
  };
}

export default function VINPage() {
  const [vin, setVin] = useState('');
  const [vinData, setVinData] = useState<VINData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateVIN(vin)) {
      setError('Please enter a valid 17-character VIN');
      return;
    }

    setLoading(true);
    setError(null);
    setVinData(null);

    try {
      const response = await fetch(`/api/vin/${vin.toUpperCase()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch VIN data');
      }

      if (data.success) {
        setVinData(data.data);
        if (data.data.listings.length === 0) {
          setError('No history found for this VIN. Try searching for a different vehicle.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculatePriceChange = () => {
    if (!vinData?.priceHistory || vinData.priceHistory.length < 2) return null;
    
    const first = vinData.priceHistory[0].price;
    const last = vinData.priceHistory[vinData.priceHistory.length - 1].price;
    const change = last - first;
    const percentChange = ((change / first) * 100).toFixed(1);
    
    return { change, percentChange };
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            VIN History Lookup
          </h1>
          <p className="text-lg text-gray-600">
            Track any Porsche&apos;s complete price history and market journey
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              placeholder="Enter 17-character VIN (e.g., WP0AB2A74JL201234)"
              className="w-full px-6 py-4 pr-16 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={17}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {vinData && vinData.listings.length > 0 && (
          <div className="space-y-8">
            {/* Summary Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">
                {vinData.summary.year} {vinData.summary.model} {vinData.summary.trim || 'Base'}
              </h2>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Status</p>
                  <p className="text-lg font-semibold">
                    {vinData.summary.sold ? (
                      <span className="text-green-600">Sold</span>
                    ) : (
                      <span className="text-blue-600">Active</span>
                    )}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current/Sold Price</p>
                  <p className="text-lg font-semibold">
                    {formatPrice(vinData.summary.soldPrice || vinData.summary.currentPrice || 0)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Price Range</p>
                  <p className="text-lg font-semibold">
                    {formatPrice(vinData.summary.lowestPrice || 0)} - {formatPrice(vinData.summary.highestPrice || 0)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Times Listed</p>
                  <p className="text-lg font-semibold">
                    {vinData.summary.totalListings || 1}
                    {vinData.summary.totalListings > 1 && (
                      <span className="text-sm text-orange-600 ml-1">(Relisted)</span>
                    )}
                  </p>
                </div>
              </div>

              {calculatePriceChange() && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <TrendingDown className={`w-5 h-5 mr-2 ${
                      calculatePriceChange()!.change < 0 ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className="text-sm text-gray-600">Price Change:</span>
                    <span className={`ml-2 font-semibold ${
                      calculatePriceChange()!.change < 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPrice(Math.abs(calculatePriceChange()!.change))} 
                      ({calculatePriceChange()!.percentChange}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Listings History */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Listing History</h2>
              
              <div className="space-y-4">
                {vinData.listings.map((listing, index) => (
                  <div key={listing.id} className="border-l-4 border-blue-500 pl-4 py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {listing.year} {listing.model} {listing.trim || 'Base'}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(listing.created_at || listing.scraped_at).toLocaleDateString()}
                          </span>
                          <span>
                            {formatMileage(listing.mileage || 0)} miles
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xl font-bold">{formatPrice(listing.price)}</p>
                        <p className="text-sm text-gray-500">{listing.source}</p>
                        {listing.source_url && (
                          <a
                            href={listing.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View listing →
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {listing.sold_date && (
                      <div className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                        Sold on {new Date(listing.sold_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Price History Chart */}
            {vinData.priceHistory.length > 1 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Price History</h2>
                
                <div className="space-y-2">
                  {vinData.priceHistory.map((history, index) => (
                    <div key={history.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-sm text-gray-600">
                        {new Date(history.observed_at).toLocaleDateString()}
                      </span>
                      <span className="font-semibold">
                        {formatPrice(history.price)}
                      </span>
                      {index > 0 && (
                        <span className={`text-sm ${
                          history.price < vinData.priceHistory[index - 1].price
                            ? 'text-green-600'
                            : history.price > vinData.priceHistory[index - 1].price
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}>
                          {history.price < vinData.priceHistory[index - 1].price
                            ? '↓'
                            : history.price > vinData.priceHistory[index - 1].price
                            ? '↑'
                            : '→'}
                          {' '}
                          {formatPrice(Math.abs(history.price - vinData.priceHistory[index - 1].price))}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Example VINs */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Don&apos;t have a VIN? Try these high-value GT cars:
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => setVin('WP0AF2A96BS785577')}
              className="text-blue-600 hover:underline text-sm"
              title="2011 911 GT3 RS"
            >
              2011 GT3 RS - WP0AF2A96BS785577
            </button>
            <button
              onClick={() => setVin('WP0ZZZ99ZKS199508')}
              className="text-blue-600 hover:underline text-sm"
              title="2019 911 GT3 R - FIA GT3 Race Car"
            >
              2019 GT3 R (Race Car) - WP0ZZZ99ZKS199508
            </button>
            <button
              onClick={() => setVin('WP0CA2A89SK212302')}
              className="text-blue-600 hover:underline text-sm"
              title="2025 718 Boxster"
            >
              2025 Boxster - WP0CA2A89SK212302
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}