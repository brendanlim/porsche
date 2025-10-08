'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface ModelStats {
  model: string;
  totalListings: number;
  trims: Array<{
    trim: string;
    count: number;
  }>;
}

export default function ModelsPage() {
  const [models, setModels] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/admin/models');
      const data = await response.json();
      setModels(data.models || []);
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Models Overview</h1>
        <p className="text-gray-600 mt-1">View listings by model and trim</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => (
          <Card key={model.model}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{model.model}</span>
                <span className="text-sm font-normal text-gray-600">
                  {model.totalListings.toLocaleString()} total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link
                  href={`/admin/models/${model.model}`}
                  className="block px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
                >
                  View all {model.model} listings →
                </Link>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Trims:</p>
                  <div className="space-y-1">
                    {model.trims.slice(0, 5).map((trim) => (
                      <Link
                        key={trim.trim}
                        href={`/admin/models/${model.model}/${trim.trim}`}
                        className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 rounded-lg"
                      >
                        <span>{trim.trim || 'Base'}</span>
                        <span className="text-gray-600">{trim.count}</span>
                      </Link>
                    ))}
                    {model.trims.length > 5 && (
                      <Link
                        href={`/admin/models/${model.model}`}
                        className="block px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        +{model.trims.length - 5} more trims...
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
