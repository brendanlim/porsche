'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter } from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  model: string;
  trim: string;
  year: number;
  price: number;
  mileage: number;
  source: string;
  scraped_at: string;
  vin: string;
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [trimFilter, setTrimFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableTrims, setAvailableTrims] = useState<string[]>([]);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sourceFilter, modelFilter, trimFilter, searchTerm]);

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/admin/listings/filter-options');
      const data = await response.json();
      setAvailableSources(data.sources || []);
      setAvailableModels(data.models || []);
      setAvailableTrims(data.trims || []);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (modelFilter !== 'all') params.append('model', modelFilter);
      if (trimFilter !== 'all') params.append('trim', trimFilter);

      const response = await fetch(`/api/admin/listings?${params}`);
      const data = await response.json();
      setListings(data.listings || []);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (type: 'source' | 'model' | 'trim', value: string) => {
    setCurrentPage(1); // Reset to first page when filter changes
    if (type === 'source') setSourceFilter(value);
    if (type === 'model') setModelFilter(value);
    if (type === 'trim') setTrimFilter(value);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Listings Management</h1>
        <p className="text-gray-600 mt-1">Browse and manage vehicle listings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={modelFilter}
                onChange={(e) => handleFilterChange('model', e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Models</option>
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <select
                value={trimFilter}
                onChange={(e) => handleFilterChange('trim', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Trims</option>
                {availableTrims.map(trim => (
                  <option key={trim} value={trim}>{trim}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Sources</option>
                {availableSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">VIN</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Trim</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Title</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Year</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Price</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Mileage</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Source</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Scraped</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      {listing.vin ? (
                        <a
                          href={`/admin/listings/vin/${listing.vin}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs"
                        >
                          {listing.vin.substring(listing.vin.length - 8)}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">{listing.model || '-'}</td>
                    <td className="py-3 px-4 text-sm">{listing.trim || '-'}</td>
                    <td className="py-3 px-4 text-sm max-w-xs truncate">{listing.title}</td>
                    <td className="py-3 px-4 text-sm">{listing.year}</td>
                    <td className="py-3 px-4 text-sm">
                      ${listing.price?.toLocaleString() || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {listing.mileage?.toLocaleString() || '-'} mi
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {listing.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(listing.scraped_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {listings.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                No listings found
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} listings
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first, last, current, and pages around current
                    return page === 1 ||
                           page === Math.ceil(totalCount / itemsPerPage) ||
                           Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, idx, arr) => (
                    <div key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-2">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
                disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
