'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, TrendingUp, Search, User, LogOut, Crown } from 'lucide-react';
import { useUser, useProfile } from '@/lib/auth/hooks';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, loading: userLoading } = useUser();
  const { profile, isSubscribed } = useProfile();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between py-6">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">
                Porsche<span className="text-blue-600">Trends</span>
              </span>
            </Link>
            <div className="ml-10 hidden space-x-8 lg:block">
              <Link href="/models" className="text-base font-medium text-gray-700 hover:text-blue-600">
                Models
              </Link>
              <Link href="/browse" className="text-base font-medium text-gray-700 hover:text-blue-600">
                Browse
              </Link>
              <Link href="/trends" className="text-base font-medium text-gray-700 hover:text-blue-600">
                Trends
              </Link>
              <Link href="/vin" className="text-base font-medium text-gray-700 hover:text-blue-600">
                VIN Lookup
              </Link>
              <Link href="/pricing" className="text-base font-medium text-gray-700 hover:text-blue-600">
                Pricing
              </Link>
            </div>
          </div>
          <div className="ml-10 space-x-4 flex items-center">
            <button className="hidden lg:block p-2 text-gray-500 hover:text-blue-600">
              <Search className="h-5 w-5" />
            </button>
            
            {userLoading ? (
              <div className="h-10 w-20 bg-gray-200 animate-pulse rounded-md" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {isSubscribed && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">
                        {profile?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      {isSubscribed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          <Crown className="h-3 w-3 mr-1" />
                          Premium
                        </span>
                      )}
                    </div>
                    
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="inline h-4 w-4 mr-2" />
                      Account Settings
                    </Link>
                    
                    {!isSubscribed && (
                      <Link
                        href="/pricing"
                        className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Crown className="inline h-4 w-4 mr-2" />
                        Upgrade to Premium
                      </Link>
                    )}
                    
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleSignOut();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="inline h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden lg:inline-block rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700"
              >
                Sign In
              </Link>
            )}
            
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-500" />
              ) : (
                <Menu className="h-6 w-6 text-gray-500" />
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4">
            <div className="space-y-4">
              <Link
                href="/models"
                className="block text-base font-medium text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Models
              </Link>
              <Link
                href="/browse"
                className="block text-base font-medium text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Browse
              </Link>
              <Link
                href="/trends"
                className="block text-base font-medium text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Trends
              </Link>
              <Link
                href="/vin"
                className="block text-base font-medium text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                VIN Lookup
              </Link>
              <Link
                href="/pricing"
                className="block text-base font-medium text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              
              {user ? (
                <>
                  <div className="border-t pt-4">
                    <p className="px-4 text-sm font-medium text-gray-900">
                      {profile?.full_name || user.email}
                    </p>
                    {isSubscribed && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mx-4 mt-1">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </span>
                    )}
                  </div>
                  <Link
                    href="/account"
                    className="block text-base font-medium text-gray-700 hover:text-blue-600"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Account Settings
                  </Link>
                  {!isSubscribed && (
                    <Link
                      href="/pricing"
                      className="block text-base font-medium text-blue-600 hover:text-blue-700"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Upgrade to Premium
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="block w-full text-left text-base font-medium text-gray-700 hover:text-blue-600"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}