import OpenAI from 'openai';

export interface TrendData {
  threeMonth: number;
  sixMonth: number;
  oneYear: number;
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
  const { threeMonth, sixMonth, oneYear } = trends;

  // Peak Detection - 6 month is the most negative
  if (Math.abs(sixMonth) > Math.abs(oneYear) && Math.abs(sixMonth) > Math.abs(threeMonth) && sixMonth < -10) {
    return {
      pattern: 'post-peak correction',
      phase: 'correction',
      interpretation: 'The market peaked around 6 months ago and is now undergoing a healthy correction. Prices are stabilizing after speculative excess.'
    };
  }

  // Bottom Detection - 6 month is the most positive
  if (Math.abs(sixMonth) > Math.abs(oneYear) && Math.abs(sixMonth) > Math.abs(threeMonth) && sixMonth > 10) {
    return {
      pattern: 'recovery from bottom',
      phase: 'recovery',
      interpretation: 'The market bottomed around 6 months ago and is now recovering. Buyers are returning as values become attractive.'
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

  // Steady Appreciation
  if (threeMonth > 0 && sixMonth > 0 && oneYear > 0 &&
      Math.abs(threeMonth - sixMonth) < 5 && Math.abs(sixMonth - oneYear) < 5) {
    return {
      pattern: 'steady appreciation',
      phase: 'stable',
      interpretation: 'The market is showing healthy, consistent appreciation. This sustainable growth pattern typically indicates strong fundamentals.'
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
    Model: ${model} ${trim}
    Current Average Price: $${currentPrice.toLocaleString()}

    Price Trends:
    - 3-Month: ${trends.threeMonth > 0 ? '+' : ''}${trends.threeMonth.toFixed(2)}%
    - 6-Month: ${trends.sixMonth > 0 ? '+' : ''}${trends.sixMonth.toFixed(2)}%
    - 1-Year: ${trends.oneYear > 0 ? '+' : ''}${trends.oneYear.toFixed(2)}%

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

  Please provide:
  1. A single sentence summary (max 15 words)
  2. A brief story (1-2 sentences max) explaining the market dynamics
  3. 2-3 bullet point insights (each max 10 words)
  4. A brief recommendation for buyers and sellers (1 sentence)

  Format your response as JSON with these fields:
  {
    "summary": "very brief summary",
    "detailedStory": "1-2 sentence story",
    "keyInsights": ["short insight1", "short insight2", "short insight3"],
    "recommendation": "brief action recommendation"
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    return {
      summary: analysis.summary || interpretation,
      detailedStory: analysis.detailedStory || interpretation,
      marketPhase: {
        phase,
        confidence: calculateConfidence(trends),
        description: pattern
      },
      keyInsights: analysis.keyInsights || [interpretation],
      recommendation: analysis.recommendation || 'Monitor market conditions closely.',
      confidence: calculateConfidence(trends)
    };

  } catch (error) {
    console.error('Error generating narrative with OpenAI:', error);

    // Fallback to rule-based narrative
    return generateFallbackNarrative(model, trim, trends, pattern, phase, interpretation);
  }
}

/**
 * Generates a fallback narrative without OpenAI
 */
function generateFallbackNarrative(
  model: string,
  trim: string,
  trends: TrendData,
  pattern: string,
  phase: MarketPhase['phase'],
  interpretation: string
): MarketNarrative {
  const { threeMonth, sixMonth, oneYear } = trends;

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
        'Spring peak typical for sports cars',
        `${Math.abs(sixMonth).toFixed(1)}% correction from highs`,
        'Decline moderating recently'
      ];
      recommendation = 'Buyers: Entry opportunities emerging. Sellers: Wait for recovery.';
      break;

    case 'recovery from bottom':
      summary = `Market recovering, up ${sixMonth.toFixed(1)}% from bottom.`;
      detailedStory = `Found floor 6 months ago, recovered ${sixMonth.toFixed(1)}%. Pace normalizing.`;
      keyInsights = [
        'Market bottomed and recovering',
        'Recovery pace normalizing',
        'Buyer confidence returning'
      ];
      recommendation = 'Buyers: Act before further gains. Sellers: Improving conditions.';
      break;

    case 'bubble formation':
      summary = `Rapid acceleration: ${threeMonth.toFixed(1)}% in 3 months.`;
      detailedStory = `Prices accelerating beyond sustainable pace. Speculative enthusiasm evident.`;
      keyInsights = [
        'Speculative buying evident',
        'Exceeding historical norms',
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
  const { threeMonth, sixMonth, oneYear } = trends;

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