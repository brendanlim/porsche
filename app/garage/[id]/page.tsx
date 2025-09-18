'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser, useProfile } from '@/lib/auth/hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Gauge,
  DollarSign,
  Eye,
  AlertTriangle,
  Crown,
  ExternalLink
} from 'lucide-react';
import { formatPrice, formatMileage } from '@/lib/utils';
import { UserCarDetailed } from '@/lib/types/database';

interface CarDetailPageProps {
  params: { id: string };
}

export default function CarDetailPage({ params }: CarDetailPageProps) {
  const { user, loading: userLoading } = useUser();
  const { isSubscribed } = useProfile();
  const router = useRouter();
  const [car, setCar] = useState<UserCarDetailed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCarDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/user-cars/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch car details');
      }

      if (data.success) {
        setCar(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load car details');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    fetchCarDetails();
  }, [user, userLoading, router, params.id, fetchCarDetails]);

  const deleteCar = async () => {
    if (!confirm('Are you sure you want to remove this car from your garage?')) {
      return;
    }

    try {
      const response = await fetch(`/api/user-cars/${params.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete car');
      }

      router.push('/garage');
    } catch (err) {
      console.error('Error deleting car:', err);
      alert('Failed to remove car from garage');
    }
  };

  const calculateValueChange = () => {
    if (!car?.purchase_price || !car?.latest_estimated_value) return null;

    const change = car.latest_estimated_value - car.purchase_price;
    const percentChange = ((change / car.purchase_price) * 100);

    return { change, percentChange };
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white rounded-xl shadow-lg p-6">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !car) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error || 'Car not found'}
            </h2>
            <p className="text-gray-600 mb-6">
              The car you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Link
              href="/garage"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Garage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const valueChange = calculateValueChange();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/garage"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Garage
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {car.nickname || `${car.year} ${car.model_name} ${car.trim_name}`}
              </h1>
              {car.nickname && (
                <p className="text-lg text-gray-600">
                  {car.year} {car.model_name} {car.trim_name}
                </p>
              )}
            </div>

            <div className="flex space-x-2">
              <Link
                href={`/garage/${car.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
              <button
                onClick={deleteCar}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Vehicle Details</h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">VIN</h3>
                  <p className="text-lg font-mono">
                    {car.vin || 'Not provided'}
                    {car.vin && (
                      <Link
                        href={`/vin?vin=${car.vin}`}
                        className="ml-2 text-blue-600 hover:text-blue-700"
                        title="View VIN history"
                      >
                        <ExternalLink className="w-4 h-4 inline" />
                      </Link>
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Generation</h3>
                  <p className="text-lg">{car.generation_name || 'Not specified'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Exterior Color</h3>
                  <div className="flex items-center">
                    {car.exterior_color_hex && (
                      <div
                        className="w-6 h-6 rounded-full mr-2 border border-gray-300"
                        style={{ backgroundColor: car.exterior_color_hex }}
                      />
                    )}
                    <p className="text-lg">
                      {car.exterior_color_name || 'Not specified'}
                      {car.is_paint_to_sample && (
                        <span className="ml-1 text-sm text-orange-600">(PTS)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Interior Color</h3>
                  <p className="text-lg">{car.interior_color || 'Not specified'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Current Mileage</h3>
                  <p className="text-lg flex items-center">
                    <Gauge className="w-4 h-4 mr-1 text-gray-400" />
                    {car.mileage ? formatMileage(car.mileage) : 'Not specified'}
                  </p>
                </div>

                {car.options_count > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Options</h3>
                    <p className="text-lg">{car.options_count} option{car.options_count !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Purchase Information */}
            {(car.purchase_date || car.purchase_price || car.purchase_notes) && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Purchase Information</h2>

                <div className="grid grid-cols-2 gap-6">
                  {car.purchase_date && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Purchase Date</h3>
                      <p className="text-lg flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {new Date(car.purchase_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {car.purchase_price && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Purchase Price</h3>
                      <p className="text-lg flex items-center">
                        <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                        {formatPrice(car.purchase_price)}
                      </p>
                    </div>
                  )}
                </div>

                {car.purchase_notes && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                    <p className="text-gray-700">{car.purchase_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Valuation */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Current Valuation</h2>

              {car.latest_estimated_value ? (
                <div>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {formatPrice(car.latest_estimated_value)}
                  </p>

                  {valueChange && (
                    <div className="flex items-center text-sm mb-4">
                      {valueChange.change >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                      )}
                      <span className={valueChange.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {valueChange.change >= 0 ? '+' : ''}{formatPrice(valueChange.change)}
                        ({valueChange.percentChange.toFixed(1)}%)
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Last updated: {car.last_valuation_date
                      ? new Date(car.last_valuation_date).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-3">No valuation available</p>
                  {!isSubscribed && (
                    <p className="text-sm text-blue-600">
                      Upgrade to Premium for automatic valuations
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Market Context */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Market Context</h2>

              <div className="space-y-3">
                {car.similar_active_listings > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Similar cars for sale</p>
                    <p className="text-lg font-semibold">{car.similar_active_listings}</p>
                  </div>
                )}

                {car.recent_sold_avg_price && (
                  <div>
                    <p className="text-sm text-gray-600">Recent sold average</p>
                    <p className="text-lg font-semibold">{formatPrice(car.recent_sold_avg_price)}</p>
                  </div>
                )}

                <Link
                  href={`/models/${car.model_name?.toLowerCase()}/${car.trim_name?.toLowerCase().replace(/\s+/g, '-')}/analytics`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View market analytics
                </Link>
              </div>
            </div>

            {/* Premium Upsell */}
            {!isSubscribed && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="text-center">
                  <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Premium Features
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li>• Automatic valuation updates</li>
                    <li>• Price drop alerts</li>
                    <li>• Market trend analysis</li>
                    <li>• Export reports</li>
                  </ul>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Now
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}