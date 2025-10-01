import { createClient } from '@supabase/supabase-js';
import { generateMarketNarrative } from '../../lib/analytics/market-narrative';
import type { TrendData } from '../../lib/analytics/market-narrative';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

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

  // Get models and trims that have any sales data
  // Work with whatever data is available - even rare models with few sales
  const { data, error } = await supabase.rpc('get_models_with_sufficient_data', {
    min_listings_year: 1,  // Even 1 sale provides market signal
    min_listings_six_months: 0,  // Optional
    min_listings_three_months: 0  // Optional
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
          AND (model IN ('911', '718', 'cayman', 'boxster') OR model ILIKE '%718%' OR model ILIKE '%cayman%' OR model ILIKE '%boxster%')
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
      WHERE year_count >= 1  -- Any sales data is valuable
      ORDER BY model, trim, generation;
    `;

    // Execute raw SQL query - match 911, 718, Cayman, Boxster models (case-insensitive, with or without spaces)
    const { data: rawData, error: queryError} = await supabase
      .from('listings')
      .select('model, trim, generation, price, sold_date')
      .not('sold_date', 'is', null)
      .not('generation', 'is', null)
      .or('model.eq.911,model.ilike.%718%,model.ilike.%cayman%,model.ilike.%boxster%');

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

    // Include any model with sales data
    const result: ModelTrimGenerationCombo[] = [];
    counts.forEach((count, key) => {
      if (count >= 1) {  // Even single sales provide value for rare models
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

// Helper function to calculate trend with fallback logic (DRY)
function calculateTrendWithFallback(
  currentSales: any[],
  historicalSales: any[],
  allSales: any[],
  currentPrice: number,
  mostRecentDate: Date,
  twoMonthsFromRecent: Date,
  targetMonths: number,
  MIN_SAMPLE_SIZE: number
): { trend: number; method: string } {
  // Try exact period first
  if (currentSales.length >= MIN_SAMPLE_SIZE && historicalSales.length >= MIN_SAMPLE_SIZE) {
    const pastPrices = historicalSales.map(s => s.price).sort((a, b) => a - b);
    const pastMedian = pastPrices[Math.floor(pastPrices.length / 2)];
    const trend = ((currentPrice - pastMedian) / pastMedian) * 100;
    return { trend, method: 'exact' };
  }

  // Fallback: find any older data and scale
  if (allSales.length >= 4 && currentSales.length > 0) {
    const lookbackMonths = Math.max(targetMonths + 2, 8); // Look further back
    const oldDate = new Date(mostRecentDate.getTime() - lookbackMonths * 30 * 24 * 60 * 60 * 1000);
    const olderSales = allSales.filter(s => {
      const saleDate = new Date(s.sold_date);
      return saleDate < twoMonthsFromRecent && saleDate > oldDate;
    });

    if (olderSales.length > 0) {
      const olderPrices = olderSales.map(s => s.price).sort((a, b) => a - b);
      const olderMedian = olderPrices[Math.floor(olderPrices.length / 2)];
      const avgOlderDate = olderSales.reduce((sum, s) => sum + new Date(s.sold_date).getTime(), 0) / olderSales.length;
      const monthsDiff = (mostRecentDate.getTime() - avgOlderDate) / (1000 * 60 * 60 * 24 * 30);
      const totalTrend = ((currentPrice - olderMedian) / olderMedian) * 100;
      const scaledTrend = (totalTrend / monthsDiff) * targetMonths;
      return { trend: scaledTrend, method: `scaled from ${monthsDiff.toFixed(1)}mo` };
    }
  }

  return { trend: 0, method: 'insufficient data' };
}

async function updateNarrative(model: string, trim: string, generation: string, avgPrice: number) {
  console.log(`  Generating narrative for ${generation} ${model} ${trim}...`);

  try {
    // Calculate the analytics data directly from the database
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Convert hyphenated model names to spaces for database queries
    // e.g., '718-cayman' -> '718 Cayman'
    const dbModel = model.split('-').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');

    // Get ALL sales data for this model/trim/generation to calculate trends properly
    // This matches the logic in the frontend API route
    const { data: allSales } = await supabase
      .from('listings')
      .select('price, sold_date')
      .eq('model', dbModel)
      .ilike('trim', trim)
      .eq('generation', generation)
      .not('sold_date', 'is', null)
      .not('price', 'is', null)
      .gt('price', 0)
      .order('sold_date', { ascending: false });

    if (!allSales || allSales.length === 0) {
      console.log(`    ⚠️  No sales data found for ${generation} ${model} ${trim}`);
      return;
    }

    // Find the most recent sale date as our reference point (matching frontend logic)
    const mostRecentDate = new Date(allSales[0].sold_date);
    console.log(`    📅 Most recent sale: ${mostRecentDate.toISOString().split('T')[0]}`);

    // Current window: last 30-60 days from most recent sale
    const oneMonthFromRecent = new Date(mostRecentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsFromRecent = new Date(mostRecentDate.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentWindow = allSales.filter(s => new Date(s.sold_date) > oneMonthFromRecent);
    const currentExpandedWindow = allSales.filter(s => new Date(s.sold_date) > twoMonthsFromRecent);

    const MIN_SAMPLE_SIZE = 2;

    // Use current window, or expanded if not enough samples
    const currentSales = currentWindow.length >= MIN_SAMPLE_SIZE ? currentWindow : currentExpandedWindow;

    if (currentSales.length === 0) {
      console.log(`    ⚠️  No recent sales data for ${generation} ${model} ${trim}`);
      return;
    }

    // Calculate current median price (use median instead of average for robustness)
    const currentPrices = currentSales.map(s => s.price).sort((a, b) => a - b);
    const currentPrice = currentPrices[Math.floor(currentPrices.length / 2)];
    console.log(`    💰 Current price (median of ${currentSales.length} sales): $${currentPrice.toLocaleString()}`);

    // 3 MONTH TREND
    const threeMonthsAgoEnd = new Date(mostRecentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    const fourMonthsAgoStart = new Date(mostRecentDate.getTime() - 120 * 24 * 60 * 60 * 1000);
    const threeMonthAgoSales = allSales.filter(s => {
      const saleDate = new Date(s.sold_date);
      return saleDate > fourMonthsAgoStart && saleDate <= threeMonthsAgoEnd;
    });

    const threeMonthResult = calculateTrendWithFallback(
      currentSales, threeMonthAgoSales, allSales, currentPrice, mostRecentDate, twoMonthsFromRecent, 3, MIN_SAMPLE_SIZE
    );
    const wowAppreciation = threeMonthResult.trend;
    console.log(`    📊 3-month: ${wowAppreciation > 0 ? '+' : ''}${wowAppreciation.toFixed(2)}% (${threeMonthResult.method})`);

    // 6 MONTH TREND
    const sixMonthsAgoEnd = new Date(mostRecentDate.getTime() - 180 * 24 * 60 * 60 * 1000);
    const sevenMonthsAgoStart = new Date(mostRecentDate.getTime() - 210 * 24 * 60 * 60 * 1000);
    const sixMonthAgoSales = allSales.filter(s => {
      const saleDate = new Date(s.sold_date);
      return saleDate > sevenMonthsAgoStart && saleDate <= sixMonthsAgoEnd;
    });

    const sixMonthResult = calculateTrendWithFallback(
      currentSales, sixMonthAgoSales, allSales, currentPrice, mostRecentDate, twoMonthsFromRecent, 6, MIN_SAMPLE_SIZE
    );
    const momAppreciation = sixMonthResult.trend;
    console.log(`    📊 6-month: ${momAppreciation > 0 ? '+' : ''}${momAppreciation.toFixed(2)}% (${sixMonthResult.method})`);

    // 1 YEAR TREND
    const twelveMonthsAgoEnd = new Date(mostRecentDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    const thirteenMonthsAgoStart = new Date(mostRecentDate.getTime() - 395 * 24 * 60 * 60 * 1000);
    const oneYearAgoSales = allSales.filter(s => {
      const saleDate = new Date(s.sold_date);
      return saleDate > thirteenMonthsAgoStart && saleDate <= twelveMonthsAgoEnd;
    });

    const oneYearResult = calculateTrendWithFallback(
      currentSales, oneYearAgoSales, allSales, currentPrice, mostRecentDate, twoMonthsFromRecent, 12, MIN_SAMPLE_SIZE
    );
    const yoyAppreciation = oneYearResult.trend;
    console.log(`    📊 1-year: ${yoyAppreciation > 0 ? '+' : ''}${yoyAppreciation.toFixed(2)}% (${oneYearResult.method})`);


    // Calculate 3-year trend if we have enough historical data
    let threeYearTrend: number | undefined;
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const { data: historicalData } = await supabase
      .from('listings')
      .select('price')
      .eq('model', dbModel)
      .ilike('trim', trim)  // Case-insensitive match
      .eq('generation', generation)
      .not('sold_date', 'is', null)
      .gte('sold_date', new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000 - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('sold_date', new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000 + 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(30);

    // Only calculate 3-year trend if we have sufficient historical data
    // Many models won't have 3 years of history and that's perfectly fine
    if (historicalData && historicalData.length >= 5) {
      const avgThreeYearPrice = historicalData.reduce((sum, d) => sum + (d.price || 0), 0) / historicalData.length;
      if (avgThreeYearPrice > 0 && currentPrice > 0) {
        threeYearTrend = ((currentPrice - avgThreeYearPrice) / avgThreeYearPrice) * 100;
        console.log(`    📊 3-year trend available: ${threeYearTrend > 0 ? '+' : ''}${threeYearTrend.toFixed(1)}% (strengthens confidence)`);
      }
    } else if (historicalData && historicalData.length > 0) {
      console.log(`    📊 Limited historical data (${historicalData.length} sales from 3 years ago)`);
    }
    // No log if no 3-year data - this is expected for newer models

    const trends: TrendData = {
      threeMonth: wowAppreciation || 0,
      sixMonth: momAppreciation || 0,
      oneYear: yoyAppreciation || 0,
      threeYear: threeYearTrend
    };

    // Generate the narrative using the market narrative function
    const narrative = await generateMarketNarrative(
      model,
      trim,
      generation,
      trends,
      currentPrice
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
        current_price: currentPrice,
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

  // Check for command line arguments to filter by specific model/trim/generation
  const args = process.argv.slice(2);
  let filterModel: string | undefined;
  let filterTrim: string | undefined;
  let filterGeneration: string | undefined;

  // Parse command line arguments
  // Usage: --model=911 --trim=GT3 --generation=996
  args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (key === '--model') filterModel = value;
    if (key === '--trim') filterTrim = value;
    if (key === '--generation') filterGeneration = value;
  });

  if (filterModel || filterTrim || filterGeneration) {
    console.log('Filtering for:');
    if (filterModel) console.log(`  Model: ${filterModel}`);
    if (filterTrim) console.log(`  Trim: ${filterTrim}`);
    if (filterGeneration) console.log(`  Generation: ${filterGeneration}`);
  }

  // Get all model/trim combinations with sufficient data
  let modelTrims = await getModelsWithSufficientData();

  // Apply filters if specified
  if (filterModel || filterTrim || filterGeneration) {
    modelTrims = modelTrims.filter(mtg => {
      const matchModel = !filterModel || mtg.model.toLowerCase() === filterModel.toLowerCase();
      const matchTrim = !filterTrim || mtg.trim.toLowerCase() === filterTrim.toLowerCase();
      const matchGeneration = !filterGeneration || mtg.generation.toLowerCase() === filterGeneration.toLowerCase();
      return matchModel && matchTrim && matchGeneration;
    });
  }

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