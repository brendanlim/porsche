'use client';

import { useState, useEffect } from 'react';
import { useUser, useProfile } from '@/lib/auth/hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Car,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  Eye,
  Crown,
  Gauge
} from 'lucide-react';
import { formatPrice, formatMileage } from '@/lib/utils';
import { UserCarDetailed } from '@/lib/types/database';

export default function GaragePage() {
  const { user, loading: userLoading } = useUser();
  const { isSubscribed } = useProfile();
  const router = useRouter();
  const [cars, setCars] = useState<UserCarDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    fetchUserCars();
  }, [user, userLoading, router]);

  const fetchUserCars = async () => {
    try {
      const response = await fetch('/api/user-cars');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch garage');
      }

      if (data.success) {
        setCars(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load garage');
    } finally {
      setLoading(false);
    }
  };

  const deleteCar = async (carId: string) => {
    if (!confirm('Are you sure you want to remove this car from your garage?')) {
      return;
    }

    try {
      const response = await fetch(`/api/user-cars/${carId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete car');
      }

      // Remove car from local state
      setCars(cars.filter(car => car.id !== carId));
    } catch (err) {
      console.error('Error deleting car:', err);
      alert('Failed to remove car from garage');
    }
  };

  const calculateValueChange = (car: UserCarDetailed) => {
    if (!car.purchase_price || !car.latest_estimated_value) return null;

    const change = car.latest_estimated_value - car.purchase_price;
    const percentChange = ((change / car.purchase_price) * 100);

    return { change, percentChange };
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              My Garage
              {isSubscribed && (
                <Crown className="inline-block w-8 h-8 text-yellow-500 ml-2" />
              )}
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              Track your Porsche collection and monitor market values
            </p>
          </div>

          {!isSubscribed && cars.length >= 1 ? (
            <Link
              href="/pricing"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Crown className="w-5 h-5 mr-2" />
              Upgrade to Add More Cars
            </Link>
          ) : (
            <Link
              href="/garage/add"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Car
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Cars Grid */}
        {cars.length === 0 ? (
          <div className="text-center py-16">
            <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your garage is empty
            </h3>
            <p className="text-gray-600 mb-6">
              Add your first Porsche to start tracking its value and market performance
            </p>
            <Link
              href="/garage/add"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Car
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              Free accounts can track 1 car with limited stats. <Link href="/pricing" className="text-blue-600 hover:underline">Upgrade for unlimited cars</Link>
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.map((car) => {
              const valueChange = calculateValueChange(car);

              return (
                <div key={car.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {/* Car Header */}
                  <div className="p-6 pb-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {car.nickname || `${car.year} ${car.model_name} ${car.trim_name}`}
                        </h3>
                        {car.nickname && (
                          <p className="text-sm text-gray-600">
                            {car.year} {car.model_name} {car.trim_name}
                          </p>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <Link
                          href={`/garage/${car.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/garage/${car.id}/edit`}
                          className="p-2 text-gray-400 hover:text-blue-600"
                          title="Edit Car"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => deleteCar(car.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                          title="Remove Car"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Car Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      {car.mileage && (
                        <div className="flex items-center">
                          <Gauge className="w-4 h-4 mr-1" />
                          {formatMileage(car.mileage)}
                        </div>
                      )}

                      {car.exterior_color_name && (
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-1 border border-gray-300"
                            style={{ backgroundColor: car.exterior_color_hex || '#gray' }}
                          />
                          {car.exterior_color_name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Valuation Section */}
                  <div className="px-6 pb-4">
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Current Est. Value</span>
                        {isSubscribed ? (
                          car.latest_estimated_value && (
                            <span className="text-lg font-bold text-gray-900">
                              {formatPrice(car.latest_estimated_value)}
                            </span>
                          )
                        ) : (
                          <span className="text-sm text-gray-500 italic">
                            <Link href="/pricing" className="text-blue-600 hover:underline inline-flex items-center">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium only
                            </Link>
                          </span>
                        )}
                      </div>

                      {isSubscribed && valueChange && (
                        <div className="flex items-center text-sm">
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

                      {isSubscribed && car.recent_sold_avg_price && (
                        <div className="text-xs text-gray-500 mt-1">
                          Similar cars avg: {formatPrice(car.recent_sold_avg_price)}
                        </div>
                      )}

                      {!isSubscribed && (
                        <div className="text-xs text-gray-500 mt-1">
                          <Link href="/pricing" className="text-blue-600 hover:underline">
                            Upgrade for full valuation data →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Market Data */}
                  {isSubscribed && car.similar_active_listings > 0 && (
                    <div className="px-6 pb-4">
                      <div className="text-xs text-gray-500">
                        {car.similar_active_listings} similar car{car.similar_active_listings !== 1 ? 's' : ''} for sale
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Premium Upsell */}
        {!isSubscribed && cars.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Unlock Full Garage Features
                </h3>
                <p className="text-gray-600 mb-4">
                  You&apos;re limited to 1 car with basic stats. Upgrade for unlimited cars and full insights.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Unlimited cars</strong> (currently limited to 1)</li>
                  <li>• <strong>Real valuations</strong> with confidence scores</li>
                  <li>• <strong>Market trends</strong> and appreciation tracking</li>
                  <li>• <strong>Price alerts</strong> when similar cars are listed</li>
                  <li>• <strong>Historical charts</strong> and detailed analytics</li>
                  <li>• <strong>Export reports</strong> for insurance/financing</li>
                </ul>
              </div>
              <div className="ml-8">
                <Link
                  href="/pricing"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Upgrade to Premium
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}