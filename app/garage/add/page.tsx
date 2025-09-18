'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/auth/hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  Plus,
  AlertCircle,
  CheckCircle,
  Car,
  Calendar,
  Gauge,
  DollarSign,
  Hash
} from 'lucide-react';
import { validateVIN } from '@/lib/utils';

interface FormData {
  vin: string;
  year: number;
  model_id: string;
  trim_id: string;
  generation_id: string;
  exterior_color_id: string;
  interior_color: string;
  mileage: number;
  purchase_date: string;
  purchase_price: number;
  purchase_notes: string;
  nickname: string;
}

interface Model {
  id: string;
  name: string;
}

interface Trim {
  id: string;
  name: string;
}

interface Color {
  id: string;
  name: string;
  hex_code?: string;
  is_pts: boolean;
}

export default function AddCarPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [mode, setMode] = useState<'vin' | 'manual'>('vin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [vinLookupData, setVinLookupData] = useState<any>(null);

  // Form data
  const [formData, setFormData] = useState<Partial<FormData>>({
    vin: '',
    year: new Date().getFullYear(),
    model_id: '',
    trim_id: '',
    generation_id: '',
    exterior_color_id: '',
    interior_color: '',
    mileage: 0,
    purchase_date: '',
    purchase_price: 0,
    purchase_notes: '',
    nickname: ''
  });

  // Options for dropdowns
  const [models, setModels] = useState<Model[]>([]);
  const [trims, setTrims] = useState<Trim[]>([]);
  const [colors, setColors] = useState<Color[]>([]);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Load dropdown options
    loadModels();
    loadColors();
  }, [user, userLoading, router]);

  useEffect(() => {
    if (formData.model_id) {
      loadTrims(formData.model_id);
    } else {
      setTrims([]);
    }
  }, [formData.model_id]);

  const loadModels = async () => {
    try {
      // For now, hardcode Porsche models since we know the structure
      setModels([
        { id: '1', name: '911' },
        { id: '2', name: '718' }
      ]);
    } catch (err) {
      console.error('Error loading models:', err);
    }
  };

  const loadTrims = async (modelId: string) => {
    try {
      // Mock trim data - in real implementation, fetch from API
      const trimData: Record<string, Trim[]> = {
        '1': [ // 911
          { id: '1', name: 'Carrera' },
          { id: '2', name: 'Carrera S' },
          { id: '3', name: 'Carrera 4' },
          { id: '4', name: 'Carrera 4S' },
          { id: '5', name: 'Turbo' },
          { id: '6', name: 'Turbo S' },
          { id: '7', name: 'GT3' },
          { id: '8', name: 'GT3 RS' },
          { id: '9', name: 'GT2 RS' }
        ],
        '2': [ // 718
          { id: '10', name: 'Boxster' },
          { id: '11', name: 'Boxster S' },
          { id: '12', name: 'Cayman' },
          { id: '13', name: 'Cayman S' },
          { id: '14', name: 'GTS' },
          { id: '15', name: 'GT4' },
          { id: '16', name: 'GT4 RS' }
        ]
      };
      setTrims(trimData[modelId] || []);
    } catch (err) {
      console.error('Error loading trims:', err);
    }
  };

  const loadColors = async () => {
    try {
      // Mock color data - in real implementation, fetch from API
      setColors([
        { id: '1', name: 'Guards Red', hex_code: '#c20e1a', is_pts: false },
        { id: '2', name: 'GT Silver Metallic', hex_code: '#c0c0c0', is_pts: false },
        { id: '3', name: 'Racing Yellow', hex_code: '#ffd700', is_pts: false },
        { id: '4', name: 'Jet Black Metallic', hex_code: '#000000', is_pts: false },
        { id: '5', name: 'Carrara White Metallic', hex_code: '#ffffff', is_pts: false },
        { id: '6', name: 'Miami Blue', hex_code: '#00b4d8', is_pts: true },
        { id: '7', name: 'Lizard Green', hex_code: '#2d5a27', is_pts: true }
      ]);
    } catch (err) {
      console.error('Error loading colors:', err);
    }
  };

  const handleVinLookup = async () => {
    if (!formData.vin || !validateVIN(formData.vin)) {
      setError('Please enter a valid 17-character VIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vin/${formData.vin.toUpperCase()}`);
      const data = await response.json();

      if (response.ok && data.success && data.data.listings.length > 0) {
        const listing = data.data.listings[0];
        setVinLookupData(data.data);

        // Pre-fill form with VIN data
        setFormData(prev => ({
          ...prev,
          year: listing.year || prev.year,
          // Note: In real implementation, would map listing data to IDs
        }));
      } else {
        setError('No data found for this VIN. You can still add it manually.');
      }
    } catch (err) {
      setError('Failed to lookup VIN. You can still add the car manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user-cars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add car');
      }

      setSuccess(true);

      // Redirect to garage after short delay
      setTimeout(() => {
        router.push('/garage');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add car');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Car Added Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your car has been added to your garage. Redirecting...
            </p>
            <Link
              href="/garage"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              View My Garage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/garage"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Garage
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Add Car to Garage
          </h1>
          <p className="text-gray-600">
            Track your Porsche's value and market performance
          </p>
        </div>

        {/* Mode Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setMode('vin')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                mode === 'vin'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Search className="w-5 h-5 mx-auto mb-2" />
              <div className="font-medium">VIN Lookup</div>
              <div className="text-sm">Automatic data entry</div>
            </button>

            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                mode === 'manual'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Plus className="w-5 h-5 mx-auto mb-2" />
              <div className="font-medium">Manual Entry</div>
              <div className="text-sm">Enter details yourself</div>
            </button>
          </div>

          {/* VIN Lookup Section */}
          {mode === 'vin' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Identification Number (VIN)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.vin || ''}
                    onChange={(e) => updateFormData('vin', e.target.value.toUpperCase())}
                    placeholder="Enter 17-character VIN"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={17}
                  />
                  <button
                    onClick={handleVinLookup}
                    disabled={loading || !formData.vin || formData.vin.length !== 17}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {loading ? 'Looking up...' : 'Lookup'}
                  </button>
                </div>
              </div>

              {vinLookupData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">VIN Found!</h3>
                  <p className="text-green-700 text-sm">
                    {vinLookupData.summary.year} {vinLookupData.summary.model} {vinLookupData.summary.trim}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Car Details Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Car Details</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VIN (Optional)
                </label>
                <input
                  type="text"
                  value={formData.vin || ''}
                  onChange={(e) => updateFormData('vin', e.target.value.toUpperCase())}
                  placeholder="Enter VIN if known"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={17}
                />
              </div>
            )}

            {/* Basic Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year *
                </label>
                <input
                  type="number"
                  required
                  value={formData.year || ''}
                  onChange={(e) => updateFormData('year', parseInt(e.target.value))}
                  min="1960"
                  max={new Date().getFullYear() + 2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model *
                </label>
                <select
                  required
                  value={formData.model_id || ''}
                  onChange={(e) => updateFormData('model_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Model</option>
                  {models.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trim *
                </label>
                <select
                  required
                  value={formData.trim_id || ''}
                  onChange={(e) => updateFormData('trim_id', e.target.value)}
                  disabled={!formData.model_id}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select Trim</option>
                  {trims.map(trim => (
                    <option key={trim.id} value={trim.id}>{trim.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exterior Color
                </label>
                <select
                  value={formData.exterior_color_id || ''}
                  onChange={(e) => updateFormData('exterior_color_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Color</option>
                  {colors.map(color => (
                    <option key={color.id} value={color.id}>
                      {color.name} {color.is_pts ? '(PTS)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interior Color
                </label>
                <input
                  type="text"
                  value={formData.interior_color || ''}
                  onChange={(e) => updateFormData('interior_color', e.target.value)}
                  placeholder="e.g., Black Leather"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mileage
                </label>
                <input
                  type="number"
                  value={formData.mileage || ''}
                  onChange={(e) => updateFormData('mileage', parseInt(e.target.value))}
                  placeholder="Current mileage"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Purchase Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchase_date || ''}
                    onChange={(e) => updateFormData('purchase_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    value={formData.purchase_price || ''}
                    onChange={(e) => updateFormData('purchase_price', parseFloat(e.target.value))}
                    placeholder="Amount paid"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nickname (Optional)
                </label>
                <input
                  type="text"
                  value={formData.nickname || ''}
                  onChange={(e) => updateFormData('nickname', e.target.value)}
                  placeholder="e.g., My GT3, Weekend Driver"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.purchase_notes || ''}
                  onChange={(e) => updateFormData('purchase_notes', e.target.value)}
                  placeholder="Any additional details about the car or purchase..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Link
                href="/garage"
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {loading ? 'Adding...' : 'Add to Garage'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}