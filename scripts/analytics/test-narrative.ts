#!/usr/bin/env tsx
/**
 * Test market narrative generation for a specific model/trim/generation
 * Usage: npx tsx scripts/analytics/test-narrative.ts --model="911" --trim="GT3" --generation="996"
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse command line arguments
const args = process.argv.slice(2);
let model: string | undefined;
let trim: string | undefined;
let generation: string | undefined;

args.forEach(arg => {
  const [key, value] = arg.split('=');
  if (key === '--model') model = value;
  if (key === '--trim') trim = value;
  if (key === '--generation') generation = value;
});

if (!model || !trim || !generation) {
  console.error('Usage: npx tsx scripts/analytics/test-narrative.ts --model="911" --trim="GT3" --generation="996"');
  process.exit(1);
}

async function test() {
  console.log(`=== Testing Market Narrative ===`);
  console.log(`Model: ${model}, Trim: ${trim}, Generation: ${generation}\n`);

  // 1. Check if narrative exists
  console.log('1. Checking existing narrative...');
  const { data: existingNarrative } = await supabase
    .from('market_narratives')
    .select('*')
    .eq('model', model)
    .ilike('trim', trim)
    .eq('generation', generation)
    .single();

  if (existingNarrative) {
    console.log('   ✓ Narrative exists');
    console.log('   Trends:', existingNarrative.trends_data);
    console.log('   Key insights:', existingNarrative.key_insights);
    console.log('   Updated:', existingNarrative.updated_at);
  } else {
    console.log('   ✗ No narrative found in database');
  }

  // 2. Check listings data
  console.log('\n2. Checking listings data...');
  const { data: allSales } = await supabase
    .from('listings')
    .select('price, sold_date, year')
    .eq('model', model)
    .ilike('trim', trim)
    .eq('generation', generation)
    .not('sold_date', 'is', null)
    .not('price', 'is', null)
    .gt('price', 0)
    .order('sold_date', { ascending: false });

  if (!allSales || allSales.length === 0) {
    console.log('   ✗ No sales data found');
    return;
  }

  console.log(`   ✓ Found ${allSales.length} sales`);
  const mostRecentDate = new Date(allSales[0].sold_date);
  console.log(`   Most recent sale: ${mostRecentDate.toISOString().split('T')[0]}`);

  // 3. Calculate trends using the correct logic
  console.log('\n3. Calculating trends...');

  const oneMonthFromRecent = new Date(mostRecentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsFromRecent = new Date(mostRecentDate.getTime() - 60 * 24 * 60 * 60 * 1000);

  const currentWindow = allSales.filter(s => new Date(s.sold_date) > oneMonthFromRecent);
  const currentExpandedWindow = allSales.filter(s => new Date(s.sold_date) > twoMonthsFromRecent);

  const MIN_SAMPLE_SIZE = 2;
  const currentSales = currentWindow.length >= MIN_SAMPLE_SIZE ? currentWindow : currentExpandedWindow;

  if (currentSales.length === 0) {
    console.log('   ✗ No recent sales data');
    return;
  }

  const currentPrices = currentSales.map(s => s.price).sort((a, b) => a - b);
  const currentPrice = currentPrices[Math.floor(currentPrices.length / 2)];
  console.log(`   Current price (median of ${currentSales.length} sales): $${currentPrice.toLocaleString()}`);

  // 3-month trend
  const threeMonthsAgoEnd = new Date(mostRecentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fourMonthsAgoStart = new Date(mostRecentDate.getTime() - 120 * 24 * 60 * 60 * 1000);
  const threeMonthAgoSales = allSales.filter(s => {
    const saleDate = new Date(s.sold_date);
    return saleDate > fourMonthsAgoStart && saleDate <= threeMonthsAgoEnd;
  });

  if (currentSales.length >= MIN_SAMPLE_SIZE && threeMonthAgoSales.length >= MIN_SAMPLE_SIZE) {
    const pastPrices = threeMonthAgoSales.map(s => s.price).sort((a, b) => a - b);
    const pastMedian = pastPrices[Math.floor(pastPrices.length / 2)];
    const trend = ((currentPrice - pastMedian) / pastMedian) * 100;
    console.log(`   3-month trend: ${trend > 0 ? '+' : ''}${trend.toFixed(2)}% (vs $${pastMedian.toLocaleString()})`);
  } else {
    console.log(`   3-month trend: Insufficient data (current: ${currentSales.length}, 3mo: ${threeMonthAgoSales.length})`);
  }

  // 6-month trend
  const sixMonthsAgoEnd = new Date(mostRecentDate.getTime() - 180 * 24 * 60 * 60 * 1000);
  const sevenMonthsAgoStart = new Date(mostRecentDate.getTime() - 210 * 24 * 60 * 60 * 1000);
  const sixMonthAgoSales = allSales.filter(s => {
    const saleDate = new Date(s.sold_date);
    return saleDate > sevenMonthsAgoStart && saleDate <= sixMonthsAgoEnd;
  });

  if (currentSales.length >= MIN_SAMPLE_SIZE && sixMonthAgoSales.length >= MIN_SAMPLE_SIZE) {
    const pastPrices = sixMonthAgoSales.map(s => s.price).sort((a, b) => a - b);
    const pastMedian = pastPrices[Math.floor(pastPrices.length / 2)];
    const trend = ((currentPrice - pastMedian) / pastMedian) * 100;
    console.log(`   6-month trend: ${trend > 0 ? '+' : ''}${trend.toFixed(2)}% (vs $${pastMedian.toLocaleString()})`);
  } else {
    console.log(`   6-month trend: Insufficient data (current: ${currentSales.length}, 6mo: ${sixMonthAgoSales.length})`);
  }

  // 1-year trend
  const twelveMonthsAgoEnd = new Date(mostRecentDate.getTime() - 365 * 24 * 60 * 60 * 1000);
  const thirteenMonthsAgoStart = new Date(mostRecentDate.getTime() - 395 * 24 * 60 * 60 * 1000);
  const oneYearAgoSales = allSales.filter(s => {
    const saleDate = new Date(s.sold_date);
    return saleDate > thirteenMonthsAgoStart && saleDate <= twelveMonthsAgoEnd;
  });

  if (currentSales.length >= MIN_SAMPLE_SIZE && oneYearAgoSales.length >= MIN_SAMPLE_SIZE) {
    const pastPrices = oneYearAgoSales.map(s => s.price).sort((a, b) => a - b);
    const pastMedian = pastPrices[Math.floor(pastPrices.length / 2)];
    const trend = ((currentPrice - pastMedian) / pastMedian) * 100;
    console.log(`   1-year trend: ${trend > 0 ? '+' : ''}${trend.toFixed(2)}% (vs $${pastMedian.toLocaleString()})`);
  } else {
    console.log(`   1-year trend: Insufficient data (current: ${currentSales.length}, 1yr: ${oneYearAgoSales.length})`);
  }

  // 4. Compare with frontend API
  console.log('\n4. Comparison:');
  console.log('   Run this to see frontend API trends:');
  console.log(`   curl -s 'http://localhost:3003/api/analytics/${model.toLowerCase().replace(/\s+/g, '-')}/${trim.toLowerCase().replace(/\s+/g, '-')}?generation=${generation}&range=3y' | jq '.threeMonthTrend,.sixMonthTrend,.oneYearTrend'`);
}

test().catch(console.error);
