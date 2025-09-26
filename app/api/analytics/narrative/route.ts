import { NextRequest, NextResponse } from 'next/server';
import { generateMarketNarrative, interpretTrends } from '@/lib/analytics/market-narrative';
import type { TrendData } from '@/lib/analytics/market-narrative';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, trim, trends, currentPrice, historicalData } = body;

    // Check for force refresh parameter
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!model || !trim || !trends) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate trends data
    if (typeof trends.threeMonth !== 'number' ||
        typeof trends.sixMonth !== 'number' ||
        typeof trends.oneYear !== 'number') {
      return NextResponse.json(
        { error: 'Invalid trends data' },
        { status: 400 }
      );
    }

    // Create a cache key based on model and trim
    const cacheKey = `${model.toLowerCase().replace(/\s+/g, '-')}-${trim.toLowerCase().replace(/\s+/g, '-')}`;

    // Check if we have a cached narrative that's less than 7 days old (skip if force refresh)
    if (!forceRefresh) {
      const { data: cachedNarrative, error: cacheError } = await supabaseAdmin
        .from('market_narratives')
        .select('*')
        .eq('model', model)
        .eq('trim', trim)
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // If we have a valid cached narrative, return it
      if (cachedNarrative && !cacheError) {
        console.log(`Using cached narrative for ${model} ${trim}`);
        return NextResponse.json({
          summary: cachedNarrative.summary,
          detailedStory: cachedNarrative.detailed_story,
          marketPhase: cachedNarrative.market_phase,
          keyInsights: cachedNarrative.key_insights,
          recommendation: cachedNarrative.recommendation,
          confidence: cachedNarrative.confidence,
          cached: true,
          generatedAt: cachedNarrative.updated_at
        });
      }
    }

    console.log(`Generating new narrative for ${model} ${trim}`);

    // Generate new narrative using OpenAI or fallback
    const narrative = await generateMarketNarrative(
      model,
      trim,
      trends as TrendData,
      currentPrice,
      historicalData
    );

    // Store the narrative in the database
    const { error: insertError } = await supabaseAdmin
      .from('market_narratives')
      .upsert({
        model,
        trim,
        summary: narrative.summary,
        detailed_story: narrative.detailedStory,
        market_phase: narrative.marketPhase,
        key_insights: narrative.keyInsights,
        recommendation: narrative.recommendation,
        confidence: narrative.confidence,
        trends_data: trends,
        current_price: currentPrice,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'model,trim'
      });

    if (insertError) {
      console.error('Error caching narrative:', insertError);
      // Continue anyway, don't fail the request
    }

    return NextResponse.json({
      ...narrative,
      cached: false,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating market narrative:', error);

    // Return a basic interpretation even if OpenAI fails
    try {
      const { pattern, phase, interpretation } = interpretTrends(body.trends);

      return NextResponse.json({
        summary: interpretation,
        detailedStory: interpretation,
        marketPhase: {
          phase,
          confidence: 0.6,
          description: pattern
        },
        keyInsights: [
          `3-month: ${body.trends.threeMonth.toFixed(1)}%`,
          `6-month: ${body.trends.sixMonth.toFixed(1)}%`,
          `1-year: ${body.trends.oneYear.toFixed(1)}%`
        ],
        recommendation: 'Monitor market conditions for opportunities.',
        confidence: 0.6,
        cached: false,
        generatedAt: new Date().toISOString()
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Failed to generate market narrative' },
        { status: 500 }
      );
    }
  }
}