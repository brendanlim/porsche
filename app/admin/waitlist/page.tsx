'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Search } from 'lucide-react';

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  interested_models: string[];
  referral_source: string | null;
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      const response = await fetch('/api/admin/waitlist');
      const data = await response.json();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Failed to fetch waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = [
      ['Email', 'Name', 'Joined', 'Models', 'Source'].join(','),
      ...entries.map(entry => [
        entry.email,
        entry.full_name || '',
        new Date(entry.created_at).toLocaleDateString(),
        entry.interested_models?.join('; ') || '',
        entry.referral_source || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredEntries = entries.filter(entry =>
    entry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Waitlist</h1>
          <p className="text-gray-600 mt-1">{entries.length} people waiting</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Joined
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Interested Models
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">{entry.email}</td>
                    <td className="py-3 px-4 text-sm">{entry.full_name || '-'}</td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {entry.interested_models?.length > 0
                        ? entry.interested_models.join(', ')
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {entry.referral_source || 'direct'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredEntries.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No waitlist entries found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
