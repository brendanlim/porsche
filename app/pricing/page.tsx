'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUser, useProfile } from '@/lib/auth/hooks';
import {
  Crown,
  Check,
  Star,
  TrendingUp,
  Bell,
  Car,
  BarChart3,
} from 'lucide-react';

export default function PricingPage() {
  const { user } = useUser();
  const { isSubscribed } = useProfile();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const features = {
    free: [
      'Track up to 3 cars',
      'Basic market data',
      'VIN lookup',
      'Price history viewing',
      'Community access'
    ],
    premium: [
      'Unlimited car tracking',
      'Real-time valuation updates',
      'Market alerts & notifications',
      'Advanced analytics & trends',
      'Predictive price modeling',
      'Custom market reports',
      'Export capabilities',
      'Priority customer support',
      'Early access to new features',
      'API access (coming soon)'
    ]
  };

  const pricing = {
    monthly: { price: 29, savings: 0 },
    yearly: { price: 299, savings: 49 } // $25/month when paid yearly
  };

  const testimonials = [
    {
      name: "Marcus Chen",
      car: "2021 911 GT3",
      quote: "The market predictions helped me time my GT3 purchase perfectly. Saved me $15k by waiting for the right moment.",
      avatar: "MC"
    },
    {
      name: "Sarah Williams",
      car: "2019 718 GT4",
      quote: "Love getting alerts when similar GT4s are listed. Found my dream spec and sold mine at peak value using the analytics.",
      avatar: "SW"
    },
    {
      name: "David Rodriguez",
      car: "2020 992 Turbo S",
      quote: "The valuation tracking shows my Turbo S has appreciated 8% this year. Essential tool for any serious Porsche investor.",
      avatar: "DR"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Unlock Premium Market Intelligence
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Get the insights you need to make smarter Porsche buying, selling, and investment decisions
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-blue-800 rounded-lg p-1 mb-8">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md transition ${
                billingCycle === 'monthly'
                  ? 'bg-white text-blue-900 font-medium'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md transition relative ${
                billingCycle === 'yearly'
                  ? 'bg-white text-blue-900 font-medium'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-blue-900 text-xs font-bold px-2 py-1 rounded-full">
                Save ${pricing.yearly.savings}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">$0</div>
                <p className="text-gray-600">Perfect for casual enthusiasts</p>
              </div>

              <ul className="space-y-4 mb-8">
                {features.free.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {user ? (
                <Link
                  href="/garage"
                  className="w-full inline-flex justify-center items-center px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  Access Free Features
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="w-full inline-flex justify-center items-center px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                >
                  Get Started Free
                </Link>
              )}
            </div>

            {/* Premium Plan */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-500 p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-medium flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-yellow-500 mr-2" />
                  Premium
                </h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  ${billingCycle === 'monthly' ? pricing.monthly.price : Math.round(pricing.yearly.price / 12)}
                  <span className="text-lg text-gray-600 font-normal">/month</span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-green-600 font-medium">
                    ${pricing.yearly.price}/year (Save ${pricing.yearly.savings})
                  </p>
                )}
                <p className="text-gray-600 mt-2">For serious enthusiasts & investors</p>
              </div>

              <ul className="space-y-4 mb-8">
                {features.premium.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {isSubscribed ? (
                <div className="w-full inline-flex justify-center items-center px-6 py-3 bg-green-100 text-green-800 rounded-lg text-base font-medium">
                  <Crown className="w-5 h-5 mr-2" />
                  Current Plan
                </div>
              ) : user ? (
                <button className="w-full inline-flex justify-center items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-base font-medium hover:from-blue-700 hover:to-indigo-700 transition">
                  <Crown className="w-5 h-5 mr-2" />
                  Upgrade to Premium
                </button>
              ) : (
                <Link
                  href="/signup"
                  className="w-full inline-flex justify-center items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-base font-medium hover:from-blue-700 hover:to-indigo-700 transition"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Start Premium Trial
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Premium Makes the Difference
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Premium members get access to institutional-grade market intelligence that gives them a significant edge in the Porsche market
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Predictive Analytics</h3>
              <p className="text-gray-600">
                Our ML models analyze thousands of data points to predict future values and optimal buying/selling times
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Alerts</h3>
              <p className="text-gray-600">
                Get notified instantly when cars matching your criteria are listed, or when market conditions change
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Professional Reports</h3>
              <p className="text-gray-600">
                Generate detailed valuation reports for insurance, financing, or sale purposes with our professional tools
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trusted by Porsche Enthusiasts
            </h2>
            <p className="text-lg text-gray-600">
              See how Premium members are using our platform to make smarter decisions
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.car}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">&ldquo;{testimonial.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your Premium subscription at any time. You&apos;ll continue to have access to Premium features until the end of your billing period.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                How accurate are the valuations?
              </h3>
              <p className="text-gray-600">
                Our valuations are based on real market data from multiple sources and are typically within 5-10% of actual sale prices. We constantly refine our models for accuracy.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Do you offer a free trial?
              </h3>
              <p className="text-gray-600">
                New users get a 14-day free trial of Premium features. No credit card required to start.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. All payments are processed securely through Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Make Smarter Porsche Decisions?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of enthusiasts who use our platform to buy, sell, and invest in Porsches with confidence
          </p>

          {!user ? (
            <div className="space-x-4">
              <Link
                href="/signup"
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-900 bg-white hover:bg-gray-50 transition"
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center px-8 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-blue-800 transition"
              >
                Sign In
              </Link>
            </div>
          ) : !isSubscribed ? (
            <button className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-900 bg-white hover:bg-gray-50 transition">
              <Crown className="w-5 h-5 mr-2" />
              Upgrade to Premium
            </button>
          ) : (
            <Link
              href="/garage"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-900 bg-white hover:bg-gray-50 transition"
            >
              <Car className="w-5 h-5 mr-2" />
              Go to My Garage
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}