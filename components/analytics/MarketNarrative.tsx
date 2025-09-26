'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketNarrative, MarketPhase, TrendData } from '@/lib/analytics/market-narrative';

interface MarketNarrativeProps {
  model: string;
  trim: string;
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
}> = {
  bubble: {
    color: 'text-red-600',
    icon: <AlertTriangle className="w-4 h-4" />,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  peak: {
    color: 'text-orange-600',
    icon: <TrendingUp className="w-4 h-4" />,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  correction: {
    color: 'text-yellow-600',
    icon: <TrendingDown className="w-4 h-4" />,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  recovery: {
    color: 'text-emerald-600',
    icon: <TrendingUp className="w-4 h-4" />,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  },
  stable: {
    color: 'text-blue-600',
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  volatile: {
    color: 'text-purple-600',
    icon: <Activity className="w-4 h-4" />,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  }
};

export function MarketNarrativeCard({
  model,
  trim,
  trends,
  currentPrice,
  historicalData,
  className
}: MarketNarrativeProps) {
  const [narrative, setNarrative] = useState<MarketNarrative | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNarrative();
  }, [model, trim, trends.threeMonth, trends.sixMonth, trends.oneYear]);

  const fetchNarrative = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/analytics/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          trim,
          trends,
          currentPrice,
          historicalData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate narrative');
      }

      const data = await response.json();
      setNarrative(data);
    } catch (err) {
      console.error('Error fetching narrative:', err);
      setError('Unable to generate market narrative');
      // Use fallback narrative generation
      generateFallbackNarrative();
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackNarrative = () => {
    // Simple client-side fallback
    const { threeMonth, sixMonth, oneYear } = trends;

    let phase: MarketPhase['phase'] = 'stable';
    let summary = '';

    if (Math.abs(sixMonth) > Math.abs(oneYear) && Math.abs(sixMonth) > Math.abs(threeMonth) && sixMonth < -10) {
      phase = 'correction';
      summary = `The ${model} ${trim} market peaked around 6 months ago and has corrected ${Math.abs(sixMonth).toFixed(1)}%.`;
    } else if (threeMonth > 10 && threeMonth > sixMonth) {
      phase = 'bubble';
      summary = `The ${model} ${trim} market is accelerating with ${threeMonth.toFixed(1)}% gains in 3 months.`;
    } else if (threeMonth > 0 && sixMonth > 0 && oneYear > 0) {
      phase = 'stable';
      summary = `The ${model} ${trim} market shows steady appreciation across all timeframes.`;
    } else {
      phase = 'volatile';
      summary = `The ${model} ${trim} market shows mixed signals with varying trends.`;
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
        `3-month: ${threeMonth > 0 ? '+' : ''}${threeMonth.toFixed(1)}%`,
        `6-month: ${sixMonth > 0 ? '+' : ''}${sixMonth.toFixed(1)}%`,
        `1-year: ${oneYear > 0 ? '+' : ''}${oneYear.toFixed(1)}%`
      ],
      recommendation: 'Monitor market conditions closely.',
      confidence: 0.7
    });
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <CardTitle>Market Story</CardTitle>
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
    <Card className={cn("relative overflow-hidden", className)}>
      <div className={cn("absolute top-0 left-0 right-0 h-1", phaseStyle.bgColor)} />

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Market Analysis</CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1",
              phaseStyle.color,
              phaseStyle.bgColor,
              phaseStyle.borderColor
            )}
          >
            {phaseStyle.icon}
            <span className="capitalize">{narrative.marketPhase.phase}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Left Column - Summary & Recommendation */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Market Overview
            </h4>
            {/* Summary with Icon */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className={cn("p-1.5 rounded-full", phaseStyle.bgColor)}>
                {phaseStyle.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 leading-relaxed">
                  {narrative.summary}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  {narrative.detailedStory}
                </p>
              </div>
            </div>

            {/* Recommendation Box */}
            <div className={cn(
              "p-4 rounded-lg border-2",
              phaseStyle.bgColor,
              phaseStyle.borderColor
            )}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("p-1 rounded", phaseStyle.color)}>
                  {phaseStyle.icon}
                </div>
                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                  Action Plan
                </h4>
              </div>
              <p className="text-sm text-gray-700 font-medium leading-relaxed ml-7">
                {narrative.recommendation}
              </p>
            </div>
          </div>

          {/* Right Column - Insights & Confidence */}
          <div className="space-y-4">
            {/* Key Insights as Cards */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Key Insights
              </h4>
              <div className="grid gap-2">
                {narrative.keyInsights.map((insight, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border-l-3 border-blue-400">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-blue-900 font-medium">{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Meter */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">Analysis Confidence</span>
                <span className="text-lg font-bold text-gray-800">
                  {Math.round(narrative.confidence * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={cn(
                    "h-3 rounded-full transition-all duration-300",
                    narrative.confidence > 0.8 ? "bg-green-500" :
                    narrative.confidence > 0.6 ? "bg-yellow-500" : "bg-red-500"
                  )}
                  style={{ width: `${narrative.confidence * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for inline display
 */
export function MarketNarrativeInline({
  narrative,
  className
}: {
  narrative: MarketNarrative;
  className?: string;
}) {
  const phaseStyle = phaseConfig[narrative.marketPhase.phase];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Badge
        variant="outline"
        className={cn(
          "flex items-center gap-1",
          phaseStyle.color,
          phaseStyle.bgColor,
          phaseStyle.borderColor
        )}
      >
        {phaseStyle.icon}
        <span className="capitalize">{narrative.marketPhase.phase}</span>
      </Badge>
      <p className="text-sm text-gray-600 flex-1">
        {narrative.summary}
      </p>
    </div>
  );
}

/**
 * Market phase indicator badge
 */
export function MarketPhaseBadge({
  phase,
  size = 'default',
  showIcon = true,
  className
}: {
  phase: MarketPhase['phase'];
  size?: 'small' | 'default' | 'large';
  showIcon?: boolean;
  className?: string;
}) {
  const phaseStyle = phaseConfig[phase];

  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    default: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-2'
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        sizeClasses[size],
        phaseStyle.color,
        phaseStyle.bgColor,
        phaseStyle.borderColor,
        className
      )}
    >
      {showIcon && phaseStyle.icon}
      <span className="capitalize">{phase}</span>
    </Badge>
  );
}