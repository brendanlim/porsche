'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, TrendingUp } from 'lucide-react';

const MODELS = [
  { slug: '911', name: '911', hot: true },
  { slug: '718-cayman', name: '718 Cayman', hot: true },
  { slug: '718-boxster', name: '718 Boxster' },
  { slug: 'cayenne', name: 'Cayenne' },
  { slug: 'macan', name: 'Macan' },
  { slug: 'panamera', name: 'Panamera' },
  { slug: 'taycan', name: 'Taycan' },
];

export function ModelAnalyticsNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6" />
              <span className="font-bold text-xl">PorscheStats</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-1">
              {MODELS.map((model) => (
                <Link
                  key={model.slug}
                  href={`/models/${model.slug}/analytics`}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.includes(model.slug)
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${model.hot ? 'relative' : ''}`}
                >
                  {model.name}
                  {model.hot && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-gray-900 flex items-center space-x-1"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}