import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import type { MarketNarrative, MarketPhase } from './market-narrative';

export interface AggregateMarketInsight {
  overallTrend: 'bullish' | 'bearish' | 'mixed' | 'stable';
  marketSummary: string;
  keyThemes: string[];  // 3-5 major themes across all models
  hotSegments: {
    model: string;
    trim: string;
    reason: string;
    trend: number;
  }[];
  coolSegments: {
    model: string;
    trim: string;
    reason: string;
    trend: number;
  }[];
  emergingTrends: string[];  // New patterns emerging in the market
  marketHealth: {
    score: number; // 0-100
    factors: string[];
  };
  recommendation: string;  // Overall market recommendation
  confidence: number;
}

interface ModelNarrativeData {
  model: string;
  trim: string;
  generation: string;
  marketPhase: MarketPhase;
  confidence: number;
  trends: {
    threeMonth: number;
    sixMonth: number;
    oneYear: number;
  };
  currentPrice: number;
}

/**
 * Generate high-level market insights from individual model narratives
 */
export async function generateAggregateMarketNarrative(
  supabaseUrl: string,
  supabaseKey: string
): Promise<AggregateMarketInsight> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all recent narratives with their trend data
  const { data: narratives, error } = await supabase
    .from('market_narratives')
    .select('*')
    .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('confidence', { ascending: false });

  if (error || !narratives || narratives.length === 0) {
    return generateFallbackAggregate();
  }

  // Process narratives into structured data
  const modelData: ModelNarrativeData[] = narratives.map(n => ({
    model: n.model,
    trim: n.trim,
    generation: n.generation,
    marketPhase: n.market_phase,
    confidence: n.confidence,
    trends: n.trends_data,
    currentPrice: n.current_price
  }));

  // Analyze overall market sentiment
  const overallTrend = analyzeOverallTrend(modelData);
  const hotSegments = findHotSegments(modelData);
  const coolSegments = findCoolSegments(modelData);
  const marketHealth = calculateMarketHealth(modelData);

  // Use OpenAI to generate sophisticated insights
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const context = `
        Analyze the Porsche collector market based on ${modelData.length} model/trim segments:

        Market Phases Distribution:
        - Bubble: ${modelData.filter(m => m.marketPhase.phase === 'bubble').length}
        - Peak: ${modelData.filter(m => m.marketPhase.phase === 'peak').length}
        - Correction: ${modelData.filter(m => m.marketPhase.phase === 'correction').length}
        - Recovery: ${modelData.filter(m => m.marketPhase.phase === 'recovery').length}
        - Stable: ${modelData.filter(m => m.marketPhase.phase === 'stable').length}
        - Volatile: ${modelData.filter(m => m.marketPhase.phase === 'volatile').length}

        Top Performers (6-month):
        ${hotSegments.slice(0, 3).map(s => `${s.model} ${s.trim}: +${s.trend.toFixed(1)}%`).join(', ')}

        Weakest Segments (6-month):
        ${coolSegments.slice(0, 3).map(s => `${s.model} ${s.trim}: ${s.trend.toFixed(1)}%`).join(', ')}

        Average Trends Across Market:
        - 3-month: ${(modelData.reduce((sum, m) => sum + m.trends.threeMonth, 0) / modelData.length).toFixed(1)}%
        - 6-month: ${(modelData.reduce((sum, m) => sum + m.trends.sixMonth, 0) / modelData.length).toFixed(1)}%
        - 1-year: ${(modelData.reduce((sum, m) => sum + m.trends.oneYear, 0) / modelData.length).toFixed(1)}%
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',  // Using mini model to reduce costs (was gpt-4-turbo-preview)
        messages: [
          {
            role: 'system',
            content: `You are a Porsche market analyst creating high-level market insights.
            Focus on patterns, themes, and actionable intelligence across the entire market.
            Be concise and insightful.`
          },
          {
            role: 'user',
            content: `${context}

            Generate:
            1. Market summary (2-3 sentences max)
            2. 3-4 key themes (each max 10 words)
            3. 2-3 emerging trends
            4. Overall recommendation (1 sentence)

            Format as JSON:
            {
              "marketSummary": "...",
              "keyThemes": ["theme1", "theme2", "theme3"],
              "emergingTrends": ["trend1", "trend2"],
              "recommendation": "..."
            }`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const aiInsights = JSON.parse(response.choices[0].message.content || '{}');

      return {
        overallTrend,
        marketSummary: aiInsights.marketSummary || generateMarketSummary(modelData, overallTrend),
        keyThemes: aiInsights.keyThemes || extractKeyThemes(modelData),
        hotSegments,
        coolSegments,
        emergingTrends: aiInsights.emergingTrends || identifyEmergingTrends(modelData),
        marketHealth,
        recommendation: aiInsights.recommendation || generateRecommendation(overallTrend, marketHealth),
        confidence: calculateAggregateConfidence(modelData)
      };

    } catch (error) {
      console.error('Error generating AI aggregate insights:', error);
    }
  }

  // Fallback to rule-based generation
  return {
    overallTrend,
    marketSummary: generateMarketSummary(modelData, overallTrend),
    keyThemes: extractKeyThemes(modelData),
    hotSegments,
    coolSegments,
    emergingTrends: identifyEmergingTrends(modelData),
    marketHealth,
    recommendation: generateRecommendation(overallTrend, marketHealth),
    confidence: calculateAggregateConfidence(modelData)
  };
}

function analyzeOverallTrend(data: ModelNarrativeData[]): AggregateMarketInsight['overallTrend'] {
  const avgSixMonth = data.reduce((sum, m) => sum + m.trends.sixMonth, 0) / data.length;
  const bullishCount = data.filter(m => m.trends.sixMonth > 5).length;
  const bearishCount = data.filter(m => m.trends.sixMonth < -5).length;

  if (bullishCount > data.length * 0.6) return 'bullish';
  if (bearishCount > data.length * 0.6) return 'bearish';
  if (Math.abs(avgSixMonth) < 3) return 'stable';
  return 'mixed';
}

function findHotSegments(data: ModelNarrativeData[]) {
  return data
    .filter(m => m.trends.sixMonth > 0)
    .sort((a, b) => b.trends.sixMonth - a.trends.sixMonth)
    .slice(0, 5)
    .map(m => ({
      model: m.model,
      trim: m.trim,
      reason: m.trends.threeMonth > m.trends.sixMonth ? 'Accelerating gains' : 'Sustained appreciation',
      trend: m.trends.sixMonth
    }));
}

function findCoolSegments(data: ModelNarrativeData[]) {
  return data
    .filter(m => m.trends.sixMonth < 0)
    .sort((a, b) => a.trends.sixMonth - b.trends.sixMonth)
    .slice(0, 5)
    .map(m => ({
      model: m.model,
      trim: m.trim,
      reason: m.trends.threeMonth < m.trends.sixMonth ? 'Accelerating decline' : 'Ongoing correction',
      trend: m.trends.sixMonth
    }));
}

function calculateMarketHealth(data: ModelNarrativeData[]) {
  const factors: string[] = [];
  let score = 50; // Base score

  // Positive factors
  const avgTrend = data.reduce((sum, m) => sum + m.trends.sixMonth, 0) / data.length;
  if (avgTrend > 5) {
    score += 20;
    factors.push('Strong appreciation across segments');
  } else if (avgTrend > 0) {
    score += 10;
    factors.push('Positive market momentum');
  }

  // Volume/activity (use confidence as proxy)
  const avgConfidence = data.reduce((sum, m) => sum + m.confidence, 0) / data.length;
  if (avgConfidence > 0.7) {
    score += 10;
    factors.push('High data confidence');
  }

  // Stability
  const volatileCount = data.filter(m => m.marketPhase.phase === 'volatile').length;
  if (volatileCount < data.length * 0.2) {
    score += 10;
    factors.push('Low volatility');
  } else {
    score -= 10;
    factors.push('High volatility concerns');
  }

  // Bubble risk
  const bubbleCount = data.filter(m => m.marketPhase.phase === 'bubble').length;
  if (bubbleCount > data.length * 0.3) {
    score -= 20;
    factors.push('Bubble risk in multiple segments');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    factors
  };
}

function generateMarketSummary(data: ModelNarrativeData[], trend: AggregateMarketInsight['overallTrend']): string {
  const avgSixMonth = data.reduce((sum, m) => sum + m.trends.sixMonth, 0) / data.length;

  switch (trend) {
    case 'bullish':
      return `The Porsche collector market shows broad strength with ${avgSixMonth.toFixed(1)}% average gains over six months. Demand remains robust across most segments.`;
    case 'bearish':
      return `Market correction underway with ${Math.abs(avgSixMonth).toFixed(1)}% average decline over six months. Buyers gaining leverage as prices normalize.`;
    case 'stable':
      return `Stable market conditions prevail with modest ${Math.abs(avgSixMonth).toFixed(1)}% movement. Balanced supply and demand across segments.`;
    default:
      return `Mixed market signals with diverging segment performance. Some models thriving while others correct.`;
  }
}

function extractKeyThemes(data: ModelNarrativeData[]): string[] {
  const themes: string[] = [];

  // GT models performance
  const gtModels = data.filter(m => m.trim.toLowerCase().includes('gt'));
  if (gtModels.length > 0) {
    const gtAvg = gtModels.reduce((sum, m) => sum + m.trends.sixMonth, 0) / gtModels.length;
    if (gtAvg > 10) themes.push('GT models outperforming');
    else if (gtAvg < -5) themes.push('GT models cooling off');
  }

  // Generation patterns
  const newerGens = data.filter(m => m.generation.includes('992') || m.generation.includes('982'));
  const olderGens = data.filter(m => m.generation.includes('991') || m.generation.includes('981'));
  if (newerGens.length > 0 && olderGens.length > 0) {
    const newAvg = newerGens.reduce((sum, m) => sum + m.trends.sixMonth, 0) / newerGens.length;
    const oldAvg = olderGens.reduce((sum, m) => sum + m.trends.sixMonth, 0) / olderGens.length;
    if (newAvg > oldAvg + 5) themes.push('Newer generations gaining momentum');
    if (oldAvg > newAvg + 5) themes.push('Classic generations appreciating');
  }

  // Market phases
  const correctionCount = data.filter(m => m.marketPhase.phase === 'correction').length;
  if (correctionCount > data.length * 0.4) themes.push('Broad market correction');

  const recoveryCount = data.filter(m => m.marketPhase.phase === 'recovery').length;
  if (recoveryCount > data.length * 0.4) themes.push('Recovery gaining steam');

  return themes.slice(0, 4);
}

function identifyEmergingTrends(data: ModelNarrativeData[]): string[] {
  const trends: string[] = [];

  // Acceleration/deceleration patterns
  const accelerating = data.filter(m => m.trends.threeMonth > m.trends.sixMonth + 3);
  if (accelerating.length > data.length * 0.3) {
    trends.push('Momentum accelerating across segments');
  }

  const decelerating = data.filter(m => m.trends.threeMonth < m.trends.sixMonth - 3);
  if (decelerating.length > data.length * 0.3) {
    trends.push('Growth rates moderating');
  }

  // Price tier patterns
  const highValue = data.filter(m => m.currentPrice > 200000);
  const midValue = data.filter(m => m.currentPrice >= 100000 && m.currentPrice <= 200000);
  if (highValue.length > 0 && midValue.length > 0) {
    const highAvg = highValue.reduce((sum, m) => sum + m.trends.sixMonth, 0) / highValue.length;
    const midAvg = midValue.reduce((sum, m) => sum + m.trends.sixMonth, 0) / midValue.length;
    if (highAvg > midAvg + 5) trends.push('Premium segment outperformance');
    if (midAvg > highAvg + 5) trends.push('Mid-market strength emerging');
  }

  return trends.slice(0, 3);
}

function generateRecommendation(trend: AggregateMarketInsight['overallTrend'], health: { score: number }): string {
  if (trend === 'bullish' && health.score > 70) {
    return 'Strong market conditions favor sellers. Buyers should be selective and patient.';
  } else if (trend === 'bearish' && health.score < 40) {
    return 'Correction creates opportunities for buyers. Sellers should consider holding unless necessary.';
  } else if (trend === 'stable' && health.score > 60) {
    return 'Balanced market offers fair value. Focus on quality and provenance over timing.';
  } else {
    return 'Mixed signals suggest caution. Research specific models thoroughly before transacting.';
  }
}

function calculateAggregateConfidence(data: ModelNarrativeData[]): number {
  // Weight by individual confidence scores
  const avgConfidence = data.reduce((sum, m) => sum + m.confidence, 0) / data.length;

  // Boost confidence if we have many data points
  let confidence = avgConfidence;
  if (data.length > 20) confidence += 0.1;
  if (data.length > 50) confidence += 0.1;

  return Math.min(0.95, confidence);
}

function generateFallbackAggregate(): AggregateMarketInsight {
  return {
    overallTrend: 'mixed',
    marketSummary: 'Insufficient data for comprehensive market analysis.',
    keyThemes: ['Limited data available'],
    hotSegments: [],
    coolSegments: [],
    emergingTrends: [],
    marketHealth: { score: 50, factors: ['Insufficient data'] },
    recommendation: 'More data needed for actionable insights.',
    confidence: 0.3
  };
}