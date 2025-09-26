import OpenAI from 'openai';

export interface TrendData {
  threeMonth: number;
  sixMonth: number;
  oneYear: number;
  threeYear?: number; // Optional 3-year trend as minor data point
}

export interface MarketPhase {
  phase: 'bubble' | 'peak' | 'correction' | 'recovery' | 'stable' | 'volatile';
  confidence: number;
  description: string;
}

export interface MarketNarrative {
  summary: string;
  detailedStory: string;
  marketPhase: MarketPhase;
  keyInsights: string[];
  recommendation: string;
  confidence: number;
}

/**
 * Interprets trend data to identify market patterns
 */
export function interpretTrends(trends: TrendData): {
  pattern: string;
  phase: MarketPhase['phase'];
  interpretation: string;
} {
  const { threeMonth, sixMonth, oneYear, threeYear } = trends;

  // Peak Detection - 6 month is the most negative
  if (Math.abs(sixMonth) > Math.abs(oneYear) && Math.abs(sixMonth) > Math.abs(threeMonth) && sixMonth < -10) {
    return {
      pattern: 'post-peak correction',
      phase: 'correction',
      interpretation: 'The market peaked around 6 months ago and is now undergoing a healthy correction. Prices are stabilizing after speculative excess.'
    };
  }

  // Recent Peak - 6 month positive but 3 month negative (peaked ~3 months ago)
  if (sixMonth > 10 && threeMonth < -2) {
    return {
      pattern: 'recent peak correction',
      phase: 'correction',
      interpretation: 'The market peaked around 3 months ago after strong gains. Prices are now pulling back from recent highs.'
    };
  }

  // True Bottom Detection - prices were down but now recovering (negative 6mo, positive 3mo)
  if (sixMonth < -10 && threeMonth > 2) {
    return {
      pattern: 'recovery from bottom',
      phase: 'recovery',
      interpretation: 'The market appears to have bottomed and is beginning to recover. Buyers are returning as values stabilize.'
    };
  }

  // Bubble Formation - accelerating gains
  if (threeMonth > sixMonth && sixMonth > oneYear && threeMonth > 15) {
    return {
      pattern: 'bubble formation',
      phase: 'bubble',
      interpretation: 'Prices are accelerating upward rapidly. Market enthusiasm is high, but caution is warranted as this pace may not be sustainable.'
    };
  }

  // Slowing Decline - correction losing momentum
  if (threeMonth < 0 && sixMonth < 0 && Math.abs(threeMonth) < Math.abs(sixMonth)) {
    return {
      pattern: 'slowing decline',
      phase: 'correction',
      interpretation: 'The rate of decline is slowing, suggesting the market may be finding a floor. This could present buying opportunities.'
    };
  }

  // Steady Appreciation - Use 3-year trend internally for better analysis
  if (threeMonth > 0 && sixMonth > 0 && oneYear > 0 &&
      Math.abs(threeMonth - sixMonth) < 5 && Math.abs(sixMonth - oneYear) < 5) {
    let pattern = 'steady appreciation';
    let interpretation = 'The market is showing healthy, consistent appreciation. This sustainable growth pattern typically indicates strong fundamentals.';

    // Use 3-year data to refine our understanding (without mentioning it explicitly)
    if (threeYear !== undefined) {
      if (threeYear > oneYear * 2) {
        // Long-term gains strengthen our confidence
        interpretation = 'The market demonstrates exceptional strength with sustained appreciation. Collector demand remains robust.';
      } else if (threeYear < 0 && oneYear > 0) {
        // Recovery context changes the narrative
        interpretation = 'Strong recovery momentum is building. Values are returning to historical norms as market confidence returns.';
        pattern = 'recovery momentum';
      }
    }

    return {
      pattern,
      phase: 'stable',
      interpretation
    };
  }

  // Volatile Market
  if (Math.sign(threeMonth) !== Math.sign(sixMonth) || Math.sign(sixMonth) !== Math.sign(oneYear)) {
    return {
      pattern: 'high volatility',
      phase: 'volatile',
      interpretation: 'The market is showing mixed signals with no clear direction. This volatility may present both risks and opportunities.'
    };
  }

  // Default case
  return {
    pattern: 'neutral',
    phase: 'stable',
    interpretation: 'The market is showing typical seasonal variations without dramatic movements in any direction.'
  };
}

/**
 * Generates a comprehensive market narrative using OpenAI
 */
export async function generateMarketNarrative(
  model: string,
  trim: string,
  generation: string,
  trends: TrendData,
  currentPrice: number,
  historicalData?: {
    avgPrice30Days: number;
    avgPrice90Days: number;
    volumeLast30Days: number;
    volumeLast90Days: number;
  }
): Promise<MarketNarrative> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Get basic interpretation
  const { pattern, phase, interpretation } = interpretTrends(trends);

  // Build context for OpenAI
  const trendContext = `
    Model: ${generation} ${model} ${trim}
    Current Average Price: $${currentPrice.toLocaleString()}

    Price Trends:
    - 3-Month: ${trends.threeMonth > 0 ? '+' : ''}${trends.threeMonth.toFixed(2)}%
    - 6-Month: ${trends.sixMonth > 0 ? '+' : ''}${trends.sixMonth.toFixed(2)}%
    - 1-Year: ${trends.oneYear > 0 ? '+' : ''}${trends.oneYear.toFixed(2)}%
    ${trends.threeYear !== undefined ? `- 3-Year: ${trends.threeYear > 0 ? '+' : ''}${trends.threeYear.toFixed(2)}% (long-term context)` : ''}

    Detected Pattern: ${pattern}
    Market Phase: ${phase}

    ${historicalData ? `
    Additional Context:
    - 30-Day Avg Price: $${historicalData.avgPrice30Days.toLocaleString()}
    - 90-Day Avg Price: $${historicalData.avgPrice90Days.toLocaleString()}
    - 30-Day Volume: ${historicalData.volumeLast30Days} sales
    - 90-Day Volume: ${historicalData.volumeLast90Days} sales
    ` : ''}
  `;

  const systemPrompt = `You are a Porsche market analyst specializing in collector car valuations and market trends.
  Generate insightful, data-driven narratives that help collectors and investors understand market movements.
  Be CONCISE and focus on actionable intelligence.`;

  const userPrompt = `Based on the following market data, generate a concise market narrative:

  ${trendContext}

  ${trends.threeYear !== undefined ? `INTERNAL CONTEXT (DO NOT MENTION): The 3-year trend is ${trends.threeYear > 0 ? '+' : ''}${trends.threeYear.toFixed(1)}%. Use this to inform your confidence and understanding, but NEVER mention "3-year" or long timeframes in your response unless the trend is truly exceptional (>100% or <-50%).` : ''}

  CRITICAL REQUIREMENTS:
  - Provide EXACTLY 3 key insights (no more, no less)
  - Each insight must be max 10 words
  - Focus on 3-month, 6-month, and 1-year trends only
  - Do NOT mention 3-year trends unless absolutely critical

  Please provide:
  1. A single sentence summary (max 15 words)
  2. A brief story (1-2 sentences max) explaining the market dynamics
  3. EXACTLY 3 bullet point insights (each max 10 words)
  4. A brief recommendation for buyers and sellers (1 sentence)

  Format your response as JSON with these fields:
  {
    "summary": "very brief summary",
    "detailedStory": "1-2 sentence story",
    "keyInsights": ["insight1", "insight2", "insight3"],
    "recommendation": "brief action recommendation"
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,  // Low temperature for more consistent outputs
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    return {
      summary: analysis.summary || interpretation.split('.')[0] + '.',  // Use first sentence only for summary
      detailedStory: analysis.detailedStory || interpretation,
      marketPhase: {
        phase,
        confidence: calculateConfidence(trends),
        description: pattern
      },
      keyInsights: analysis.keyInsights || generateQuickInsights(trends),
      recommendation: analysis.recommendation || 'Monitor market conditions closely.',
      confidence: calculateConfidence(trends)
    };

  } catch (error) {
    console.error('Error generating narrative with OpenAI:', error);

    // Fallback to rule-based narrative
    return generateFallbackNarrative(model, trim, generation, trends, pattern, phase, interpretation);
  }
}

/**
 * Generate quick insights from trend data
 */
function generateQuickInsights(trends: TrendData): string[] {
  const insights: string[] = [];

  // Add trend descriptions
  if (trends.threeMonth > 5) {
    insights.push(`Strong recent momentum (+${trends.threeMonth.toFixed(1)}%)`);
  } else if (trends.threeMonth < -5) {
    insights.push(`Recent weakness (${trends.threeMonth.toFixed(1)}%)`);
  } else {
    insights.push(`Stable recent performance (${trends.threeMonth > 0 ? '+' : ''}${trends.threeMonth.toFixed(1)}%)`);
  }

  // Six month perspective
  if (Math.abs(trends.sixMonth) > Math.abs(trends.threeMonth)) {
    insights.push('Momentum changing direction');
  } else if (trends.sixMonth > 10) {
    insights.push('Sustained appreciation trend');
  }

  // Year perspective
  if (trends.oneYear > 20) {
    insights.push('Exceptional annual performance');
  } else if (trends.oneYear < -10) {
    insights.push('Significant annual correction');
  } else {
    insights.push(`${trends.oneYear > 0 ? '+' : ''}${trends.oneYear.toFixed(1)}% over twelve months`);
  }

  return insights.slice(0, 3);  // Always return exactly 3
}

/**
 * Generates a fallback narrative without OpenAI
 */
function generateFallbackNarrative(
  model: string,
  trim: string,
  generation: string,
  trends: TrendData,
  pattern: string,
  phase: MarketPhase['phase'],
  interpretation: string
): MarketNarrative {
  const { threeMonth, sixMonth, oneYear, threeYear } = trends;

  let summary = '';
  let detailedStory = '';
  let keyInsights: string[] = [];
  let recommendation = '';

  // Generate narrative based on pattern
  switch (pattern) {
    case 'post-peak correction':
      summary = `Market peaked 6 months ago, down ${Math.abs(sixMonth).toFixed(1)}%.`;
      detailedStory = `Prices corrected ${Math.abs(sixMonth).toFixed(1)}% from spring peak. Decline is slowing, suggesting stabilization.`;
      keyInsights = [
        'Peak reached six months ago',
        `Down ${Math.abs(sixMonth).toFixed(1)}% from highs`,
        'Decline rate slowing recently'
      ];
      recommendation = 'Buyers: Entry opportunities emerging. Sellers: Wait for recovery.';
      break;

    case 'recent peak correction':
      summary = `Market peaked 3 months ago, now correcting.`;
      detailedStory = `After ${sixMonth.toFixed(1)}% gains, prices pulled back ${Math.abs(threeMonth).toFixed(1)}% from peak. Natural consolidation after rally.`;
      keyInsights = [
        `Up ${sixMonth.toFixed(1)}% over six months`,
        `Down ${Math.abs(threeMonth).toFixed(1)}% from recent peak`,
        'Healthy consolidation phase'
      ];
      recommendation = 'Buyers: Wait for stabilization. Sellers: Consider if gains sufficient.';
      break;

    case 'recovery from bottom':
      summary = `Market recovering, up ${threeMonth.toFixed(1)}% from lows.`;
      detailedStory = `After declining ${Math.abs(sixMonth).toFixed(1)}%, market found support and gained ${threeMonth.toFixed(1)}% recently.`;
      keyInsights = [
        'Bottom appears established',
        `Recovery gaining momentum`,
        'Buyer confidence returning'
      ];
      recommendation = 'Buyers: Early recovery opportunity. Sellers: Wait for further gains.';
      break;

    case 'bubble formation':
      summary = `Rapid acceleration: ${threeMonth.toFixed(1)}% in 3 months.`;
      detailedStory = `Prices accelerating beyond sustainable pace. Speculative enthusiasm evident.`;
      keyInsights = [
        `Up ${threeMonth.toFixed(1)}% in three months`,
        'Pace exceeding historical norms',
        'Correction risk increasing'
      ];
      recommendation = 'Buyers: Exercise caution. Sellers: Excellent exit opportunity.';
      break;

    default:
      summary = `Market ${Math.abs(threeMonth) < 5 ? 'stable' : threeMonth > 0 ? 'appreciating' : 'declining'}: ${threeMonth.toFixed(1)}% (3mo).`;
      detailedStory = `Typical market movement without dramatic shifts.`;
      keyInsights = [
        `3-month: ${threeMonth > 0 ? '+' : ''}${threeMonth.toFixed(1)}%`,
        `6-month: ${sixMonth > 0 ? '+' : ''}${sixMonth.toFixed(1)}%`,
        `1-year: ${oneYear > 0 ? '+' : ''}${oneYear.toFixed(1)}%`
      ];
      recommendation = 'Monitor conditions and act based on circumstances.';
  }

  return {
    summary,
    detailedStory,
    marketPhase: {
      phase,
      confidence: calculateConfidence(trends),
      description: pattern
    },
    keyInsights,
    recommendation,
    confidence: calculateConfidence(trends)
  };
}

/**
 * Calculates confidence score based on trend consistency
 */
function calculateConfidence(trends: TrendData): number {
  const { threeMonth, sixMonth, oneYear, threeYear } = trends;

  // Start with base confidence
  let confidence = 0.5;

  // Consistent direction increases confidence
  if (Math.sign(threeMonth) === Math.sign(sixMonth) && Math.sign(sixMonth) === Math.sign(oneYear)) {
    confidence += 0.2;
  }

  // Clear trend progression increases confidence
  if ((threeMonth > sixMonth && sixMonth > oneYear) || (threeMonth < sixMonth && sixMonth < oneYear)) {
    confidence += 0.15;
  }

  // Large movements increase confidence (more signal)
  if (Math.abs(sixMonth) > 15) {
    confidence += 0.1;
  }

  // 3-year data boosts confidence when available (but many models won't have it)
  if (threeYear !== undefined && !isNaN(threeYear)) {
    confidence += 0.15; // Having long-term data increases confidence

    // Consistent long-term trend adds more confidence
    if (Math.sign(threeYear) === Math.sign(oneYear) && Math.sign(oneYear) === Math.sign(sixMonth)) {
      confidence += 0.1;
    }

    // Very strong 3-year trends (>50% change) add extra confidence
    if (Math.abs(threeYear) > 50) {
      confidence += 0.05;
    }
  }
  // Note: No penalty for missing 3-year data - it's expected for newer models

  // Very small movements decrease confidence
  if (Math.abs(threeMonth) < 2 && Math.abs(sixMonth) < 2 && Math.abs(oneYear) < 2) {
    confidence -= 0.2;
  }

  return Math.max(0.2, Math.min(0.95, confidence));
}

/**
 * Formats currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats percentage for display
 */
export function formatPercentage(value: number, showSign: boolean = true): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}