'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Listing {
  id: string;
  title: string;
  model: string;
  trim: string;
  generation: string;
  year: number;
  price: number;
  mileage: number;
  color: string;
  source: string;
  source_url: string;
  scraped_at: string;
  sold_date: string;
  vin: string;
  options_text: string;
}

export default function VINDetailPage() {
  const params = useParams();
  const vin = params.vin as string;
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Listing>>({});

  useEffect(() => {
    fetchListings();
  }, [vin]);

  const fetchListings = async () => {
    try {
      const response = await fetch(`/api/admin/listings/vin/${vin}`);
      const data = await response.json();
      setListings(data.listings || []);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (listing: Listing) => {
    setEditingId(listing.id);
    setEditData(listing);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        await fetchListings();
        setEditingId(null);
        setEditData({});
      }
    } catch (error) {
      console.error('Failed to save listing:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/listings"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Listings
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">VIN: {vin}</h1>
        <p className="text-gray-600 mt-1">{listings.length} listing(s) for this VIN</p>
      </div>

      <div className="space-y-4">
        {listings.map((listing) => (
          <Card key={listing.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{listing.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {listing.year} {listing.model} {listing.trim}
                    {listing.generation && ` (${listing.generation})`}
                  </p>
                </div>
                {editingId !== listing.id && (
                  <button
                    onClick={() => startEdit(listing)}
                    className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingId === listing.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        value={editData.model || ''}
                        onChange={(e) => setEditData({ ...editData, model: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trim
                      </label>
                      <input
                        type="text"
                        value={editData.trim || ''}
                        onChange={(e) => setEditData({ ...editData, trim: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>
                      <input
                        type="number"
                        value={editData.year || ''}
                        onChange={(e) => setEditData({ ...editData, year: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        value={editData.price || ''}
                        onChange={(e) => setEditData({ ...editData, price: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mileage
                      </label>
                      <input
                        type="number"
                        value={editData.mileage || ''}
                        onChange={(e) => setEditData({ ...editData, mileage: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color
                      </label>
                      <input
                        type="text"
                        value={editData.color || ''}
                        onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(listing.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Price:</span>{' '}
                    <span className="font-semibold">${listing.price?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Mileage:</span>{' '}
                    <span className="font-semibold">{listing.mileage?.toLocaleString()} mi</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Color:</span>{' '}
                    <span className="font-semibold">{listing.color || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Source:</span>{' '}
                    <span className="font-semibold">{listing.source}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Sold:</span>{' '}
                    <span className="font-semibold">
                      {listing.sold_date ? new Date(listing.sold_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Scraped:</span>{' '}
                    <span className="font-semibold">
                      {new Date(listing.scraped_at).toLocaleDateString()}
                    </span>
                  </div>
                  {listing.source_url && (
                    <div className="col-span-2 md:col-span-3">
                      <a
                        href={listing.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        View Original Listing
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  {listing.options_text && (
                    <div className="col-span-2 md:col-span-3 mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">Options & Features:</span>
                        <p className="mt-2 text-gray-600 whitespace-pre-wrap">{listing.options_text}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
