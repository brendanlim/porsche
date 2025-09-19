'use client';

import { useState, useEffect } from 'react';
import { useUser, useProfile } from '@/lib/auth/hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Crown,
  CreditCard,
  Bell,
  Shield,
  Save,
  AlertCircle,
  CheckCircle,
  Car,
  TrendingUp
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AccountPage() {
  const { user, loading: userLoading } = useUser();
  const { profile, isSubscribed } = useProfile();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: ''
  });

  // Stats
  const [stats, setStats] = useState({
    total_cars: 0,
    total_value: 0,
    total_gain_loss: 0
  });

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        email: user.email || ''
      });
    }

    loadUserStats();
  }, [user, userLoading, profile, router]);

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/user-cars');
      const data = await response.json();

      if (data.success) {
        const cars = data.data;
        const totalValue = cars.reduce((sum: number, car: { latest_estimated_value?: number }) =>
          sum + (car.latest_estimated_value || 0), 0);
        const totalPurchasePrice = cars.reduce((sum: number, car: { purchase_price?: number }) =>
          sum + (car.purchase_price || 0), 0);

        setStats({
          total_cars: cars.length,
          total_value: totalValue,
          total_gain_loss: totalValue - totalPurchasePrice
        });
      }
    } catch (err) {
      console.error('Error loading user stats:', err);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name
        })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="md:col-span-1 bg-white rounded-xl shadow-lg p-6">
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-3 bg-white rounded-xl shadow-lg p-6">
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-6 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'subscription', name: 'Subscription', icon: Crown },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Account Settings
          </h1>
          <p className="text-gray-600">
            Manage your profile, subscription, and preferences
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <Car className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_cars}</p>
                <p className="text-sm text-gray-600">Cars in Garage</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(stats.total_value)}
                </p>
                <p className="text-sm text-gray-600">Total Portfolio Value</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <TrendingUp className={`w-8 h-8 mr-3 ${
                stats.total_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
              <div>
                <p className={`text-2xl font-bold ${
                  stats.total_gain_loss >= 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  {stats.total_gain_loss >= 0 ? '+' : ''}{formatPrice(stats.total_gain_loss)}
                </p>
                <p className="text-sm text-gray-600">Total Gain/Loss</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="md:col-span-1">
            <nav className="bg-white rounded-xl shadow-lg p-4">
              <ul className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {tab.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-green-700">{success}</p>
                    </div>
                  )}

                  <form onSubmit={updateProfile} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Subscription Tab */}
              {activeTab === 'subscription' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Subscription</h2>

                  <div className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                          {isSubscribed ? (
                            <>
                              <Crown className="w-5 h-5 text-yellow-500 mr-2" />
                              Premium Plan
                            </>
                          ) : (
                            'Free Plan'
                          )}
                        </h3>
                        <p className="text-gray-600">
                          {isSubscribed
                            ? 'Access to all premium features'
                            : 'Basic features with limited access'
                          }
                        </p>
                      </div>

                      {!isSubscribed && (
                        <Link
                          href="/pricing"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Upgrade
                        </Link>
                      )}
                    </div>

                    {isSubscribed ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status</span>
                          <span className="text-green-600 font-medium">Active</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Next billing</span>
                          <span className="text-gray-900">
                            {profile?.subscription_ends_at
                              ? new Date(profile.subscription_ends_at).toLocaleDateString()
                              : 'Unknown'
                            }
                          </span>
                        </div>
                        <div className="pt-3 border-t">
                          <button className="text-red-600 hover:text-red-700 text-sm">
                            Cancel subscription
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Premium Features</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Unlimited car tracking</li>
                          <li>• Real-time valuation updates</li>
                          <li>• Market alerts and notifications</li>
                          <li>• Advanced analytics and reports</li>
                          <li>• Priority customer support</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

                  <div className="space-y-6">
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                          <span className="ml-3 text-gray-700">Market alerts for watched cars</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                          <span className="ml-3 text-gray-700">Weekly market reports</span>
                        </label>
                        <label className="flex items-center">
                          <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <span className="ml-3 text-gray-700">New features and updates</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Frequency</h3>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input type="radio" name="frequency" className="border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                          <span className="ml-3 text-gray-700">Immediate</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="frequency" className="border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <span className="ml-3 text-gray-700">Daily digest</span>
                        </label>
                        <label className="flex items-center">
                          <input type="radio" name="frequency" className="border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <span className="ml-3 text-gray-700">Weekly summary</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t">
                      <button className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Security Settings</h2>

                  <div className="space-y-6">
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Password</h3>
                      <p className="text-gray-600 mb-4">
                        Change your password to keep your account secure
                      </p>
                      <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Change Password
                      </button>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Two-Factor Authentication</h3>
                      <p className="text-gray-600 mb-4">
                        Add an extra layer of security to your account
                      </p>
                      <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Enable 2FA
                      </button>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Account Deletion</h3>
                      <p className="text-gray-600 mb-4">
                        Permanently delete your account and all associated data
                      </p>
                      <button className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}