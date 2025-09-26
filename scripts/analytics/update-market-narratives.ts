import { createClient } from '@supabase/supabase-js';
import { generateMarketNarrative } from '../../lib/analytics/market-narrative';
import type { TrendData } from '../../lib/analytics/market-narrative';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ModelTrimGenerationCombo {
  model: string;
  trim: string;
  generation: string;
  listing_count: number;
  avg_price: number;
}

async function getModelsWithSufficientData(): Promise<ModelTrimGenerationCombo[]> {
  console.log('Finding models/trims/generations with sufficient data for analysis...');

  // Get models and trims that have enough data points for trend analysis
  // We need at least 10 sales in the past year for reliable trends
  const { data, error } = await supabase.rpc('get_models_with_sufficient_data', {
    min_listings_year: 10,
    min_listings_six_months: 5,
    min_listings_three_months: 3
  });

  if (error) {
    // If the RPC doesn't exist, fall back to a direct query
    const query = `
      WITH model_trim_gen_counts AS (
        SELECT
          model,
          trim,
          generation,
          COUNT(*) FILTER (WHERE sold_date >= NOW() - INTERVAL '1 year') as year_count,
          COUNT(*) FILTER (WHERE sold_date >= NOW() - INTERVAL '6 months') as six_month_count,
          COUNT(*) FILTER (WHERE sold_date >= NOW() - INTERVAL '3 months') as three_month_count,
          AVG(price) FILTER (WHERE sold_date >= NOW() - INTERVAL '1 year') as avg_price,
          COUNT(*) as total_count
        FROM listings
        WHERE sold_date IS NOT NULL
          AND model IN ('911', '718', 'cayman', 'boxster')
          AND generation IS NOT NULL
        GROUP BY model, trim, generation
      )
      SELECT
        model,
        trim,
        generation,
        year_count as listing_count,
        avg_price
      FROM model_trim_gen_counts
      WHERE year_count >= 10
        AND six_month_count >= 5
        AND three_month_count >= 3
      ORDER BY model, trim, generation;
    `;

    // Execute raw SQL query
    const { data: rawData, error: queryError } = await supabase
      .from('listings')
      .select('model, trim, generation, price')
      .not('sold_date', 'is', null)
      .not('generation', 'is', null)
      .in('model', ['911', '718', 'cayman', 'boxster']);

    if (queryError) {
      console.error('Error getting models with data:', queryError);
      return [];
    }

    // Process data to count occurrences
    const counts = new Map<string, number>();
    const avgPrices = new Map<string, number[]>();
    const modelTrimGens = new Map<string, { model: string; trim: string; generation: string }>();

    rawData?.forEach(item => {
      const key = `${item.model}_${item.trim || 'base'}_${item.generation}`;
      counts.set(key, (counts.get(key) || 0) + 1);

      const prices = avgPrices.get(key) || [];
      if (item.price > 0) prices.push(item.price);
      avgPrices.set(key, prices);

      modelTrimGens.set(key, {
        model: item.model,
        trim: item.trim || 'base',
        generation: item.generation
      });
    });

    // Filter for sufficient data and format
    const result: ModelTrimGenerationCombo[] = [];
    counts.forEach((count, key) => {
      if (count >= 10) {
        const mtg = modelTrimGens.get(key);
        const prices = avgPrices.get(key) || [];
        if (mtg) {
          result.push({
            model: mtg.model,
            trim: mtg.trim,
            generation: mtg.generation,
            listing_count: count,
            avg_price: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
          });
        }
      }
    });

    return result;
  }

  return data || [];
}

async function updateNarrative(model: string, trim: string, generation: string, avgPrice: number) {
  console.log(`  Generating narrative for ${generation} ${model} ${trim}...`);

  try {
    // First fetch the trend data for this specific model/trim/generation
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/analytics/${model}/${trim}?generation=${generation}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`    ⚠️  Could not fetch analytics for ${generation} ${model} ${trim}`);
      return;
    }

    const analytics = await response.json();

    // Calculate 3-year trend if we have enough historical data
    let threeYearTrend: number | undefined;
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const { data: historicalData } = await supabase
      .from('listings')
      .select('price')
      .eq('model', model)
      .eq('trim', trim)
      .eq('generation', generation)
      .not('sold_date', 'is', null)
      .gte('sold_date', new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000 - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('sold_date', new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(30);

    // Only calculate 3-year trend if we have sufficient historical data
    // Many models won't have 3 years of history and that's perfectly fine
    if (historicalData && historicalData.length >= 5) {
      const avgThreeYearPrice = historicalData.reduce((sum, d) => sum + (d.price || 0), 0) / historicalData.length;
      const currentPrice = avgPrice || analytics.averagePrice;
      if (avgThreeYearPrice > 0 && currentPrice > 0) {
        threeYearTrend = ((currentPrice - avgThreeYearPrice) / avgThreeYearPrice) * 100;
        console.log(`    📊 3-year trend available: ${threeYearTrend > 0 ? '+' : ''}${threeYearTrend.toFixed(1)}% (strengthens confidence)`);
      }
    } else if (historicalData && historicalData.length > 0) {
      console.log(`    📊 Limited historical data (${historicalData.length} sales from 3 years ago)`);
    }
    // No log if no 3-year data - this is expected for newer models

    const trends: TrendData = {
      threeMonth: analytics.wowAppreciation || 0,
      sixMonth: analytics.momAppreciation || 0,
      oneYear: analytics.yoyAppreciation || 0,
      threeYear: threeYearTrend
    };

    // Generate the narrative using the market narrative function
    const narrative = await generateMarketNarrative(
      model,
      trim,
      generation,
      trends,
      avgPrice || analytics.averagePrice
    );

    if (!narrative) {
      console.log(`    ⚠️  No narrative generated for ${generation} ${model} ${trim}`);
      return;
    }

    // Save or update the narrative in the database
    const { error } = await supabase
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
        current_price: avgPrice || analytics.averagePrice,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'model,trim,generation'
      });

    if (error) {
      console.error(`    ❌ Error saving narrative for ${generation} ${model} ${trim}:`, error);
    } else {
      console.log(`    ✅ Successfully updated narrative for ${generation} ${model} ${trim}`);
    }
  } catch (err) {
    console.error(`    ❌ Error generating narrative for ${generation} ${model} ${trim}:`, err);
  }
}

async function main() {
  console.log('=== Market Narrative Update Started ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Get all model/trim combinations with sufficient data
  const modelTrims = await getModelsWithSufficientData();

  if (modelTrims.length === 0) {
    console.log('No models found with sufficient data for analysis');
    process.exit(0);
  }

  console.log(`Found ${modelTrims.length} model/trim/generation combinations to analyze:`);
  modelTrims.forEach(mtg => {
    console.log(`  - ${mtg.generation} ${mtg.model} ${mtg.trim} (${mtg.listing_count} listings)`);
  });

  console.log('\nGenerating narratives...');

  // Process each model/trim combination
  let successCount = 0;
  let errorCount = 0;

  for (const { model, trim, generation, avg_price } of modelTrims) {
    await updateNarrative(model, trim, generation, avg_price);

    // Add a small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 2000));

    successCount++;
  }

  console.log('\n=== Market Narrative Update Complete ===');
  console.log(`Total processed: ${modelTrims.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
}

// Run the update
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});