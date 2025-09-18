'use client';

import { useState, useEffect } from 'react';
import { useUser, useProfile } from '@/lib/auth/hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Crown,
  AlertTriangle,
  CheckCircle,
  Car,
  DollarSign,
  Gauge,
  Calendar,
  MapPin,
  Settings
} from 'lucide-react';
import { MarketAlert } from '@/lib/types/database';
import { formatPrice } from '@/lib/utils';

export default function AlertsPage() {
  const { user, loading: userLoading } = useUser();
  const { isSubscribed } = useProfile();
  const router = useRouter();
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    fetchAlerts();
  }, [user, userLoading, router]);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch alerts');
      }

      if (data.success) {
        setAlerts(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update alert');
      }

      // Update local state
      setAlerts(alerts.map(alert =>
        alert.id === alertId ? { ...alert, is_active: isActive } : alert
      ));
    } catch (err) {
      console.error('Error toggling alert:', err);
      alert('Failed to update alert');
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete alert');
      }

      // Remove from local state
      setAlerts(alerts.filter(alert => alert.id !== alertId));
    } catch (err) {
      console.error('Error deleting alert:', err);
      alert('Failed to delete alert');
    }
  };

  const formatAlertCriteria = (alert: MarketAlert) => {
    const criteria = [];

    if (alert.model_id || alert.trim_id) {
      criteria.push(`${alert.models?.name || 'Any Model'} ${alert.trims?.name || ''}`);
    }

    if (alert.year_min || alert.year_max) {
      if (alert.year_min && alert.year_max) {
        criteria.push(`${alert.year_min}-${alert.year_max}`);
      } else if (alert.year_min) {
        criteria.push(`${alert.year_min}+`);
      } else if (alert.year_max) {
        criteria.push(`up to ${alert.year_max}`);
      }
    }

    if (alert.price_min || alert.price_max) {
      if (alert.price_min && alert.price_max) {
        criteria.push(`${formatPrice(alert.price_min)} - ${formatPrice(alert.price_max)}`);
      } else if (alert.price_min) {
        criteria.push(`${formatPrice(alert.price_min)}+`);
      } else if (alert.price_max) {
        criteria.push(`under ${formatPrice(alert.price_max)}`);
      }
    }

    if (alert.mileage_max) {
      criteria.push(`under ${alert.mileage_max.toLocaleString()} miles`);
    }

    if (alert.states && alert.states.length > 0) {
      criteria.push(`in ${alert.states.join(', ')}`);
    }

    return criteria.length > 0 ? criteria.join(' • ') : 'Any criteria';
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="h-6 bg-gray-200 rounded mb-4"></div>
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
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Bell className="w-8 h-8 mr-3 text-blue-600" />
              Market Alerts
              {isSubscribed && (
                <Crown className="w-6 h-6 text-yellow-500 ml-2" />
              )}
            </h1>
            <p className="text-gray-600 mt-2">
              Get notified when cars matching your criteria are listed
            </p>
          </div>

          <Link
            href="/alerts/create"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Alert
          </Link>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No alerts yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first market alert to get notified when matching cars are listed
            </p>
            <Link
              href="/alerts/create"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Alert
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-xl font-bold text-gray-900 mr-3">
                          {alert.alert_name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          alert.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {alert.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-3">
                        {formatAlertCriteria(alert)}
                      </p>

                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <Bell className="w-4 h-4 mr-1" />
                          {alert.notify_frequency}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Created {new Date(alert.created_at).toLocaleDateString()}
                        </span>
                        {alert.last_triggered_at && (
                          <span className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Last triggered {new Date(alert.last_triggered_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => toggleAlert(alert.id, !alert.is_active)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                          alert.is_active
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {alert.is_active ? 'Pause' : 'Activate'}
                      </button>

                      <Link
                        href={`/alerts/${alert.id}/edit`}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="Edit Alert"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete Alert"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Premium Upsell for Free Users */}
        {!isSubscribed && (
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Unlock Premium Alert Features
                </h3>
                <p className="text-gray-600 mb-4">
                  Get more advanced alerts and priority notifications with Premium
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Unlimited market alerts (vs. 3 for free users)</li>
                  <li>• Instant email & SMS notifications</li>
                  <li>• Advanced filtering by options and colors</li>
                  <li>• Price drop alerts for specific cars</li>
                  <li>• Weekly market summary reports</li>
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

        {/* Usage Stats */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Alert Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{alerts.length}</p>
              <p className="text-sm text-gray-600">Total Alerts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {alerts.filter(a => a.is_active).length}
              </p>
              <p className="text-sm text-gray-600">Active Alerts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {isSubscribed ? '∞' : `${3 - alerts.length}`}
              </p>
              <p className="text-sm text-gray-600">
                {isSubscribed ? 'Unlimited' : 'Remaining'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {alerts.filter(a => a.last_triggered_at).length}
              </p>
              <p className="text-sm text-gray-600">Ever Triggered</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}