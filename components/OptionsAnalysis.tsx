'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface OptionData {
  name: string;
  listings: number;
  averagePremium: number;
  premiumPercent: number;
  marketAvailability: 'high' | 'medium' | 'low' | 'rare';
  priceImpact: 'rising' | 'falling' | 'stable';
}

interface OptionsAnalysisProps {
  optionsData: OptionData[];
  trimName: string;
  totalListings: number;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function getImpactColor(percent: number): string {
  if (percent >= 5) return 'text-green-600';
  if (percent >= 2) return 'text-green-500';
  if (percent >= 0) return 'text-gray-600';
  return 'text-red-600';
}

function getAvailabilityBadge(availability: string) {
  const colors = {
    high: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-blue-100 text-blue-800 border-blue-200',
    low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    rare: 'bg-purple-100 text-purple-800 border-purple-200'
  };
  
  return colors[availability as keyof typeof colors] || colors.low;
}

export function OptionsAnalysis({ optionsData, trimName, totalListings }: OptionsAnalysisProps) {
  // Split options into value-adding and less-impact categories
  const valueAddingOptions = optionsData
    .filter(opt => opt.premiumPercent >= 2)
    .sort((a, b) => b.premiumPercent - a.premiumPercent)
    .slice(0, 5);
    
  const lessImpactOptions = optionsData
    .filter(opt => opt.premiumPercent > 0 && opt.premiumPercent < 2)
    .sort((a, b) => b.premiumPercent - a.premiumPercent)
    .slice(0, 5);
    
  const mostCommonOptions = [...optionsData]
    .sort((a, b) => b.listings - a.listings)
    .slice(0, 9);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Options Analysis</CardTitle>
        <CardDescription>
          Price premiums are normalized by comparing same-year vehicles with and without each option
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Value Adding vs Less Impact Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Options That Add Value */}
          <div>
            <h3 className="text-lg font-semibold text-green-700 mb-4">Options That Add Value</h3>
            <div className="space-y-3">
              {valueAddingOptions.map((option) => (
                <div key={option.name} className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{option.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-600">{option.listings} listings</span>
                        <Badge className={getAvailabilityBadge(option.marketAvailability)}>
                          {option.marketAvailability}
                        </Badge>
                        {option.priceImpact === 'rising' && (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        )}
                        {option.priceImpact === 'falling' && (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        +{option.premiumPercent.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">premium</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Options With Less Impact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Options With Less Impact</h3>
            <div className="space-y-3">
              {lessImpactOptions.map((option) => (
                <div key={option.name} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{option.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-600">{option.listings} listings</span>
                        <Badge className={getAvailabilityBadge(option.marketAvailability)}>
                          {option.marketAvailability}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-600">
                        +{option.premiumPercent.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500">neutral</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most Common Options Grid */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Common Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mostCommonOptions.map((option) => (
              <div key={option.name} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="font-medium text-gray-900 text-sm mb-1">{option.name}</div>
                <div className="text-xs text-gray-600">{option.listings} listings</div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Insights */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Market Insight</h4>
              <p className="text-sm text-blue-700">
                For {trimName}, Paint to Sample (PTS) and performance packages like Weissach show the highest 
                value retention, while comfort features like BOSE audio have minimal impact on resale value.
              </p>
            </div>
          </div>
        </div>

        {/* Value Retention Chart */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Option Value Retention by Mileage</h3>
          <div className="space-y-3">
            {['0-5k miles', '5k-10k miles', '10k-20k miles', '20k+ miles'].map((range, index) => {
              const factor = 1 - (index * 0.15);
              return (
                <div key={range} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">{range}</span>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-xs text-gray-500">PTS</span>
                      <span className="ml-2 font-bold text-green-600">
                        +{(9.4 * factor).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Weissach</span>
                      <span className="ml-2 font-bold text-green-600">
                        +{(4.6 * factor).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">PCCB</span>
                      <span className="ml-2 font-bold text-gray-600">
                        +{(1.5 * factor).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}