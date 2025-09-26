import { createClient } from '@supabase/supabase-js';
import { marketNarrative } from '../../lib/analytics/market-narrative';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ModelTrimCombo {
  model: string;
  trim: string;
  listing_count: number;
}

async function getModelsWithSufficientData(): Promise<ModelTrimCombo[]> {
  console.log('Finding models/trims with sufficient data for analysis...');

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
      WITH model_trim_counts AS (
        SELECT
          model,
          trim,
          COUNT(*) FILTER (WHERE sold_date >= NOW() - INTERVAL '1 year') as year_count,
          COUNT(*) FILTER (WHERE sold_date >= NOW() - INTERVAL '6 months') as six_month_count,
          COUNT(*) FILTER (WHERE sold_date >= NOW() - INTERVAL '3 months') as three_month_count,
          COUNT(*) as total_count
        FROM listings
        WHERE sold_date IS NOT NULL
          AND model IN ('911', '718', 'cayman', 'boxster')
        GROUP BY model, trim
      )
      SELECT
        model,
        trim,
        year_count as listing_count
      FROM model_trim_counts
      WHERE year_count >= 10
        AND six_month_count >= 5
        AND three_month_count >= 3
      ORDER BY model, trim;
    `;

    // Execute raw SQL query
    const { data: rawData, error: queryError } = await supabase
      .from('listings')
      .select('model, trim')
      .not('sold_date', 'is', null)
      .in('model', ['911', '718', 'cayman', 'boxster']);

    if (queryError) {
      console.error('Error getting models with data:', queryError);
      return [];
    }

    // Process data to count occurrences
    const counts = new Map<string, number>();
    const modelTrims = new Map<string, { model: string; trim: string }>();

    rawData?.forEach(item => {
      const key = `${item.model}_${item.trim || 'base'}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      modelTrims.set(key, { model: item.model, trim: item.trim || 'base' });
    });

    // Filter for sufficient data and format
    const result: ModelTrimCombo[] = [];
    counts.forEach((count, key) => {
      if (count >= 10) {
        const mt = modelTrims.get(key);
        if (mt) {
          result.push({
            model: mt.model,
            trim: mt.trim,
            listing_count: count
          });
        }
      }
    });

    return result;
  }

  return data || [];
}

async function updateNarrative(model: string, trim: string) {
  console.log(`  Generating narrative for ${model} ${trim}...`);

  try {
    // Generate the narrative using the existing market narrative function
    const narrative = await marketNarrative(model, trim);

    if (!narrative) {
      console.log(`    ⚠️  No narrative generated for ${model} ${trim}`);
      return;
    }

    // Save or update the narrative in the database
    const { error } = await supabase
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
        trends_data: narrative.trendsData,
        current_price: narrative.currentPrice,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'model,trim'
      });

    if (error) {
      console.error(`    ❌ Error saving narrative for ${model} ${trim}:`, error);
    } else {
      console.log(`    ✅ Successfully updated narrative for ${model} ${trim}`);
    }
  } catch (err) {
    console.error(`    ❌ Error generating narrative for ${model} ${trim}:`, err);
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

  console.log(`Found ${modelTrims.length} model/trim combinations to analyze:`);
  modelTrims.forEach(mt => {
    console.log(`  - ${mt.model} ${mt.trim} (${mt.listing_count} listings)`);
  });

  console.log('\nGenerating narratives...');

  // Process each model/trim combination
  let successCount = 0;
  let errorCount = 0;

  for (const { model, trim } of modelTrims) {
    await updateNarrative(model, trim);

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