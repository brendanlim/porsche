'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, User, AlertCircle, CheckCircle, Sparkles, TrendingUp, Bell } from 'lucide-react';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
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
          referral_source: 'waitlist_page',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setSuccess(true);
      localStorage.setItem('waitlist_email', email);

      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
          <Sparkles className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Join the Waitlist
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Get early access to advanced Porsche market analytics
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success ? (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    You&apos;re on the waitlist!
                  </h3>
                  <p className="mt-2 text-sm text-green-700">
                    We&apos;ll notify you when we launch. Redirecting...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Advanced Market Analytics</p>
                    <p className="text-xs text-gray-600">Price trends, depreciation, and market insights</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Price Alerts</p>
                    <p className="text-xs text-gray-600">Get notified when your dream car hits your target price</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Launch Discount</p>
                    <p className="text-xs text-gray-600">Early access members get 50% off for 3 months</p>
                  </div>
                </div>
              </div>

              <form className="space-y-6" onSubmit={handleSignup}>
                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="John Doe"
                    />
                    <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="you@example.com"
                    />
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                  >
                    {loading ? 'Joining waitlist...' : 'Join Waitlist'}
                  </button>
                </div>

              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
