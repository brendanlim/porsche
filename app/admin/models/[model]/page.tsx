'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Listing {
  id: string;
  title: string;
  year: number;
  trim: string;
  price: number;
  mileage: number;
  source: string;
  vin: string;
  scraped_at: string;
}

export default function ModelDetailPage() {
  const params = useParams();
  const model = decodeURIComponent(params.model as string);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/listings?model=${encodeURIComponent(model)}&limit=100`);
      const data = await response.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/models" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">
            ← Back to Models
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{model}</h1>
          <p className="text-gray-600 mt-1">{listings.length} listings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Listings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">VIN</th>
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
                        <Link
                          href={`/admin/listings/vin/${listing.vin}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs"
                        >
                          {listing.vin.substring(listing.vin.length - 8)}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
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

            {listings.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No listings found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
