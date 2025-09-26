'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle, Info, ChevronRight, BarChart3, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketNarrative, MarketPhase, TrendData } from '@/lib/analytics/market-narrative';

interface MarketNarrativeProps {
  model: string;
  trim: string;
  generation: string;
  trends: TrendData;
  currentPrice: number;
  historicalData?: {
    avgPrice30Days: number;
    avgPrice90Days: number;
    volumeLast30Days: number;
    volumeLast90Days: number;
  };
  className?: string;
}

const phaseConfig: Record<MarketPhase['phase'], {
  color: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  gradient: string;
}> = {
  bubble: {
    color: 'text-red-600',
    icon: <AlertTriangle className="w-4 h-4" />,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    gradient: 'from-red-500 to-red-600'
  },
  peak: {
    color: 'text-orange-600',
    icon: <TrendingUp className="w-4 h-4" />,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    gradient: 'from-orange-500 to-orange-600'
  },
  correction: {
    color: 'text-yellow-600',
    icon: <TrendingDown className="w-4 h-4" />,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    gradient: 'from-yellow-500 to-yellow-600'
  },
  recovery: {
    color: 'text-emerald-600',
    icon: <TrendingUp className="w-4 h-4" />,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  stable: {
    color: 'text-blue-600',
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    gradient: 'from-blue-500 to-blue-600'
  },
  volatile: {
    color: 'text-purple-600',
    icon: <Activity className="w-4 h-4" />,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    gradient: 'from-purple-500 to-purple-600'
  }
};

export function MarketNarrativeCard({
  model,
  trim,
  generation,
  trends,
  currentPrice,
  historicalData,
  className
}: MarketNarrativeProps) {
  const [narrative, setNarrative] = useState<MarketNarrative | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchKey, setLastFetchKey] = useState<string>('');

  useEffect(() => {
    if (!trends || !currentPrice) {
      setLoading(false);
      return;
    }

    // Create a stable key with rounded values to prevent floating point differences
    // Round to 1 decimal place for trends and nearest 1000 for price
    const roundedPrice = Math.round(currentPrice / 1000) * 1000;
    const fetchKey = `${model}-${trim}-${generation}-${trends.threeMonth?.toFixed(1)}-${trends.sixMonth?.toFixed(1)}-${trends.oneYear?.toFixed(1)}-${roundedPrice}`;

    // Only fetch if the key actually changed
    if (fetchKey !== lastFetchKey) {
      console.log(`MarketNarrative: Fetching for key: ${fetchKey}`);
      setLastFetchKey(fetchKey);
      fetchNarrative();
    } else {
      console.log(`MarketNarrative: Using existing narrative (key unchanged: ${fetchKey})`);
    }
  }, [model, trim, generation, trends, currentPrice, lastFetchKey]);

  const fetchNarrative = async () => {
    try {
      const response = await fetch('/api/analytics/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          trim,
          generation,
          trends,
          currentPrice,
          historicalData
        })
      });

      if (response.status === 404) {
        // No narrative available for this model/trim - this is expected for models with insufficient data
        setNarrative(null);
        setError(null);
      } else if (!response.ok) {
        throw new Error('Failed to generate narrative');
      } else {
        const data = await response.json();
        setNarrative(data);
      }
    } catch (err) {
      console.error('Error fetching narrative:', err);
      setError('Unable to generate market narrative');
      // Only use fallback for actual errors, not for 404s
      if (trends && currentPrice) {
        generateFallbackNarrative();
      }
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackNarrative = () => {
    // Don't generate fallback if we already have a narrative
    if (narrative) {
      console.log('Skipping fallback - narrative already exists');
      return;
    }

    // Simple client-side fallback
    const { threeMonth, sixMonth, oneYear } = trends;

    let phase: MarketPhase['phase'] = 'stable';
    let summary = '';

    if (Math.abs(sixMonth) > Math.abs(oneYear) && Math.abs(sixMonth) > Math.abs(threeMonth) && sixMonth < -10) {
      phase = 'correction';
      summary = `The ${generation} ${model} ${trim} market peaked around 6 months ago and has corrected ${Math.abs(sixMonth).toFixed(1)}%.`;
    } else if (threeMonth > 10 && threeMonth > sixMonth) {
      phase = 'bubble';
      summary = `The ${generation} ${model} ${trim} market is accelerating with ${threeMonth.toFixed(1)}% gains in 3 months.`;
    } else if (threeMonth > 0 && sixMonth > 0 && oneYear > 0) {
      phase = 'stable';
      summary = `The ${generation} ${model} ${trim} market shows steady appreciation across all timeframes.`;
    } else {
      phase = 'volatile';
      summary = `The ${generation} ${model} ${trim} market shows mixed signals with varying trends.`;
    }

    setNarrative({
      summary,
      detailedStory: summary,
      marketPhase: {
        phase,
        confidence: 0.7,
        description: phase
      },
      keyInsights: [
        `Recent: ${threeMonth > 0 ? '+' : ''}${threeMonth.toFixed(1)}% (3 months)`,
        `Half-year: ${sixMonth > 0 ? '+' : ''}${sixMonth.toFixed(1)}%`,
        `Annual: ${oneYear > 0 ? '+' : ''}${oneYear.toFixed(1)}%`
      ],
      recommendation: 'Monitor market conditions closely.',
      confidence: 0.7
    });
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <CardTitle>Market Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!narrative) {
    return null;
  }

  const phaseStyle = phaseConfig[narrative.marketPhase.phase];

  return (
    <Card className={cn("relative overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-gray-50", className)}>
      {/* Top accent bar with gradient */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", phaseStyle.gradient)} />

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-700" />
            <CardTitle className="text-lg font-bold text-gray-900">
              Market Analysis
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 font-semibold text-xs shadow-md border-2",
              phaseStyle.color,
              phaseStyle.bgColor,
              phaseStyle.borderColor
            )}
          >
            {phaseStyle.icon}
            <span className="capitalize font-bold">{narrative.marketPhase.phase}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Market Story Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 h-6">
              <Activity className="w-4 h-4 text-gray-700" />
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                Market Story
              </h4>
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 rounded-xl" />
              <div className="relative p-3 rounded-xl backdrop-blur-sm h-full">
                <div className="flex items-start gap-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", phaseStyle.bgColor.replace('50', '500').replace('bg-', 'bg-'))} />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                      {narrative.summary}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed italic">
                      {narrative.detailedStory}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 h-6">
              <TrendingUp className="w-4 h-4 text-gray-700" />
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                Key Insights
              </h4>
            </div>
            <div className="space-y-2 flex-1">
              {narrative.keyInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 group hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 transition-all group-hover:scale-150",
                    phaseStyle.bgColor.replace('50', '400').replace('bg-', 'bg-')
                  )} />
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation & Confidence */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 h-6">
              <Target className="w-4 h-4 text-gray-700" />
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                Recommendation
              </h4>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              {/* Recommendation */}
              <div className={cn(
                "p-3 rounded-xl border-2 shadow-md",
                phaseStyle.bgColor,
                phaseStyle.borderColor
              )}>
                <p className="text-sm text-gray-800 leading-relaxed font-semibold">
                  {narrative.recommendation}
                </p>
              </div>

              {/* Confidence Meter */}
              <div className="p-3 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
                  Confidence
                </span>
                <span className="text-lg font-black text-gray-900">
                  {(narrative.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r shadow-sm",
                    narrative.confidence >= 0.8 ? "from-green-400 to-green-600" :
                    narrative.confidence >= 0.6 ? "from-yellow-400 to-yellow-600" :
                    "from-orange-400 to-orange-600"
                  )}
                  style={{ width: `${narrative.confidence * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {narrative.confidence >= 0.8 ? "✓ High confidence" :
                 narrative.confidence >= 0.6 ? "⚡ Moderate confidence" :
                 "⚠ Limited data"}
              </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simplified export for backward compatibility
export function MarketNarrative({ model, trim, generation }: { model: string; trim: string; generation: string }) {
  // This is a placeholder that would need to fetch the actual data
  // In real usage, the parent component should provide the trends and price data
  return null;
}