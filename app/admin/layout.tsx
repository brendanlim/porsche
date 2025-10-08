import Link from 'next/link';
import {
  LayoutDashboard,
  Car,
  Users,
  BarChart3,
  ListChecks,
  DollarSign,
  LogOut
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">PorscheStats</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Overview</span>
            </Link>

            <Link
              href="/admin/models"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <Car className="h-5 w-5" />
              <span>Models</span>
            </Link>

            <Link
              href="/admin/listings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <Car className="h-5 w-5" />
              <span>Listings</span>
            </Link>

            <Link
              href="/admin/waitlist"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <ListChecks className="h-5 w-5" />
              <span>Waitlist</span>
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <Users className="h-5 w-5" />
              <span>Users</span>
            </Link>

            <Link
              href="/admin/stats"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <BarChart3 className="h-5 w-5" />
              <span>Statistics</span>
            </Link>

            <Link
              href="/admin/pricing"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <DollarSign className="h-5 w-5" />
              <span>Pricing Tiers</span>
            </Link>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition text-gray-400"
            >
              <LogOut className="h-5 w-5" />
              <span>Back to Site</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
