'use client';

import { useState } from 'react';
import { Mail, User, Sparkles, TrendingUp, Bell, CheckCircle } from 'lucide-react';

interface WaitlistFormProps {
  currentModel?: string;
  referralSource?: string;
  onSuccess?: () => void;
}

export function WaitlistForm({ currentModel, referralSource = 'waitlist_page', onSuccess }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          full_name: fullName.trim(),
          interested_models: currentModel ? [currentModel] : [],
          referral_source: referralSource,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setSuccess(true);
      localStorage.setItem('waitlist_email', email);

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-3">
          You&apos;re on the list!
        </h3>
        <p className="text-lg text-gray-600">
          We&apos;ll notify you when we launch. Refreshing...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Benefits */}
      <div className="space-y-4 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-600 p-2 rounded-lg shrink-0">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Advanced Market Analytics</p>
            <p className="text-sm text-gray-600 mt-1">Price trends, depreciation, and market insights</p>
          </div>
        </div>
        <div className="flex items-start space-x-4">
          <div className="bg-indigo-600 p-2 rounded-lg shrink-0">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Price Alerts</p>
            <p className="text-sm text-gray-600 mt-1">Get notified when your dream car hits your target price</p>
          </div>
        </div>
        <div className="flex items-start space-x-4">
          <div className="bg-purple-600 p-2 rounded-lg shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Launch Discount</p>
            <p className="text-sm text-gray-600 mt-1">Early access members get 50% off for 3 months</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="fullName" className="block text-sm font-semibold text-gray-900 mb-2">
            Full Name
          </label>
          <div className="relative">
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="John Doe"
            />
            <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
            Email
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              placeholder="you@example.com"
            />
            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3.5 px-6 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 transition-all"
        >
          {loading ? 'Joining...' : 'Join Waitlist'}
        </button>
      </form>
    </div>
  );
}
