import { NextRequest, NextResponse } from 'next/server';
import { generateMarketNarrative, interpretTrends } from '@/lib/analytics/market-narrative';
import type { TrendData } from '@/lib/analytics/market-narrative';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  let body: any;
  let model: string, trim: string, generation: string, trends: TrendData, currentPrice: number, historicalData: any;

  try {
    body = await req.json();
    ({ model, trim, generation, trends, currentPrice, historicalData } = body);

    // Check for force refresh parameter
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!model || !trim || !generation || !trends) {
      return NextResponse.json(
        { error: 'Missing required parameters (model, trim, generation, trends)' },
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

    // Check if we have sufficient data (all trends are 0 means no historical data)
    if (trends.threeMonth === 0 && trends.sixMonth === 0 && trends.oneYear === 0) {
      return NextResponse.json(
        { error: 'Insufficient data for market narrative' },
        { status: 404 }
      );
    }

    // Create a cache key based on model, trim, and generation
    const cacheKey = `${model.toLowerCase().replace(/\s+/g, '-')}-${trim.toLowerCase().replace(/\s+/g, '-')}-${generation.toLowerCase().replace(/\s+/g, '-')}`;

    // Check if we have a cached narrative that's less than 7 days old (skip if force refresh)
    if (!forceRefresh) {
      const { data: cachedNarrative, error: cacheError } = await supabaseAdmin
        .from('market_narratives')
        .select('*')
        .eq('model', model)
        .eq('trim', trim)
        .eq('generation', generation)
        .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // If we have a valid cached narrative, return it
      if (cachedNarrative && !cacheError) {
        console.log(`Using cached narrative for ${generation} ${model} ${trim}`);
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

    // Before generating, check if we have sufficient data for a meaningful narrative
    // We need the same thresholds as the weekly update script
    const { count: listingCount } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('model', model)
      .eq('trim', trim)
      .eq('generation', generation)
      .not('sold_date', 'is', null)
      .gte('sold_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    // Check if we have sufficient data (at least 10 listings in past year)
    if (!listingCount || listingCount < 10) {
      console.log(`Insufficient data for ${generation} ${model} ${trim}: only ${listingCount || 0} listings in past year`);
      return NextResponse.json(
        { error: 'Insufficient data for market narrative' },
        { status: 404 }
      );
    }

    console.log(`Generating new narrative for ${generation} ${model} ${trim} (${listingCount} listings)`);

    // Generate new narrative using OpenAI or fallback
    const narrative = await generateMarketNarrative(
      model,
      trim,
      generation,
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
        generation,
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
        onConflict: 'model,trim,generation'
      });

    if (insertError) {
      console.error(`Error caching narrative for ${generation} ${model} ${trim}:`, insertError);
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
      if (!body || !body.trends) {
        return NextResponse.json(
          { error: 'Failed to generate market narrative - invalid data' },
          { status: 500 }
        );
      }
      const { pattern, phase, interpretation } = interpretTrends(body.trends as TrendData);

      return NextResponse.json({
        summary: interpretation,
        detailedStory: interpretation,
        marketPhase: {
          phase,
          confidence: 0.6,
          description: pattern
        },
        keyInsights: [
          `3-month: ${(body.trends as TrendData).threeMonth.toFixed(1)}%`,
          `6-month: ${(body.trends as TrendData).sixMonth.toFixed(1)}%`,
          `1-year: ${(body.trends as TrendData).oneYear.toFixed(1)}%`
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