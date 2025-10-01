#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedTrends() {
  console.log('🔍 Testing Fixed Trend Calculations for 991 GT3');
  console.log('━'.repeat(80));

  // Query 991 GT3 data
  const { data: allListings, error } = await supabase
    .from('listings')
    .select('*')
    .ilike('model', '911')
    .ilike('trim', 'GT3')
    .not('sold_date', 'is', null)
    .order('sold_date', { ascending: false });

  if (error || !allListings) {
    console.error('Error fetching listings:', error);
    return;
  }

  // Filter for 991 generation
  const filteredListings = allListings.filter(l =>
    l.year >= 2014 && l.year <= 2019 && l.price > 100000
  );

  console.log(`\n📊 Total 991 GT3 listings: ${filteredListings.length}`);

  // Get the most recent sale date
  const sortedByDate = [...filteredListings]
    .filter(l => l.sold_date)
    .sort((a, b) => new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime());

  const mostRecentDate = sortedByDate.length > 0 ? new Date(sortedByDate[0].sold_date) : new Date();

  // NEW CALCULATION: 1 Year Trend with wider windows
  console.log('\n\n📈 NEW 1-Year Trend Calculation (with fixes):');
  console.log('─'.repeat(60));

  // For recent period, use last 3 months of data
  const threeMonthsAgo = new Date(mostRecentDate);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentThreeMonthListings = filteredListings.filter(l =>
    l.sold_date && new Date(l.sold_date) > threeMonthsAgo && new Date(l.sold_date) <= mostRecentDate
  );

  console.log(`\n📊 Recent 3 months (${threeMonthsAgo.toISOString().split('T')[0]} to ${mostRecentDate.toISOString().split('T')[0]}):`);
  console.log(`  Count: ${recentThreeMonthListings.length}`);

  if (recentThreeMonthListings.length > 0) {
    const prices = recentThreeMonthListings.map(l => l.price).sort((a, b) => a - b);
    console.log(`  Median: $${prices[Math.floor(prices.length / 2)].toLocaleString()}`);
    console.log(`  Average: $${(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString()}`);
    console.log(`  Range: $${Math.min(...prices).toLocaleString()} - $${Math.max(...prices).toLocaleString()}`);
  }

  // For year-ago period, use a 3-month window
  const fourteenMonthsAgoDate = new Date(mostRecentDate);
  fourteenMonthsAgoDate.setMonth(fourteenMonthsAgoDate.getMonth() - 14);
  const elevenMonthsAgoDate = new Date(mostRecentDate);
  elevenMonthsAgoDate.setMonth(elevenMonthsAgoDate.getMonth() - 11);

  const yearAgoListings = filteredListings.filter(l =>
    l.sold_date &&
    new Date(l.sold_date) >= fourteenMonthsAgoDate &&
    new Date(l.sold_date) <= elevenMonthsAgoDate
  );

  console.log(`\n📊 Year ago (11-14 months ago from ${fourteenMonthsAgoDate.toISOString().split('T')[0]} to ${elevenMonthsAgoDate.toISOString().split('T')[0]}):`);
  console.log(`  Count: ${yearAgoListings.length}`);

  if (yearAgoListings.length > 0) {
    const prices = yearAgoListings.map(l => l.price).sort((a, b) => a - b);
    console.log(`  Median: $${prices[Math.floor(prices.length / 2)].toLocaleString()}`);
    console.log(`  Average: $${(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString()}`);
    console.log(`  Range: $${Math.min(...prices).toLocaleString()} - $${Math.max(...prices).toLocaleString()}`);
  }

  // Calculate the trend with new logic
  let oneYearTrend = 0;
  const MIN_SAMPLE_SIZE = 5;

  if (recentThreeMonthListings.length >= MIN_SAMPLE_SIZE && yearAgoListings.length >= MIN_SAMPLE_SIZE) {
    const recentPrices = recentThreeMonthListings.map(l => l.price).sort((a, b) => a - b);
    const recentMedian = recentPrices[Math.floor(recentPrices.length / 2)];
    const yearAgoPrices = yearAgoListings.map(l => l.price).sort((a, b) => a - b);
    const yearAgoMedian = yearAgoPrices[Math.floor(yearAgoPrices.length / 2)];
    oneYearTrend = ((recentMedian - yearAgoMedian) / yearAgoMedian) * 100;

    console.log(`\n✅ Trend Calculation (minimum ${MIN_SAMPLE_SIZE} samples met):`);
    console.log(`  Recent median: $${recentMedian.toLocaleString()}`);
    console.log(`  Year ago median: $${yearAgoMedian.toLocaleString()}`);
    console.log(`  1-Year Trend: ${oneYearTrend > 0 ? '+' : ''}${oneYearTrend.toFixed(2)}%`);
  } else {
    console.log(`\n⚠️  Sample size too small (need ${MIN_SAMPLE_SIZE}+ for each period)`);
    console.log(`  Would fall back to other calculation methods`);

    // Try fallback with just 1 month recent data
    const recentMonth = new Date(mostRecentDate);
    recentMonth.setMonth(recentMonth.getMonth() - 1);
    const recentMonthListings = filteredListings.filter(l =>
      l.sold_date && new Date(l.sold_date) > recentMonth && new Date(l.sold_date) <= mostRecentDate
    );

    if (recentMonthListings.length > 0 && yearAgoListings.length > 0) {
      const recentPrices = recentMonthListings.map(l => l.price).sort((a, b) => a - b);
      const recentMedian = recentPrices[Math.floor(recentPrices.length / 2)];
      const yearAgoPrices = yearAgoListings.map(l => l.price).sort((a, b) => a - b);
      const yearAgoMedian = yearAgoPrices[Math.floor(yearAgoPrices.length / 2)];
      const fallbackTrend = ((recentMedian - yearAgoMedian) / yearAgoMedian) * 100;

      console.log(`\n  Fallback calculation (last month vs year ago):`);
      console.log(`    Recent month count: ${recentMonthListings.length}`);
      console.log(`    Recent median: $${recentMedian.toLocaleString()}`);
      console.log(`    Year ago median: $${yearAgoMedian.toLocaleString()}`);
      console.log(`    Fallback trend: ${fallbackTrend > 0 ? '+' : ''}${fallbackTrend.toFixed(2)}%`);
    }
  }

  // Compare with the "proper" calculation using all data
  console.log('\n\n📊 REFERENCE: Proper full-year comparison');
  console.log('─'.repeat(60));

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const lastYearSales = filteredListings.filter(l => {
    const soldDate = new Date(l.sold_date);
    return soldDate >= oneYearAgo;
  });

  const previousYearSales = filteredListings.filter(l => {
    const soldDate = new Date(l.sold_date);
    return soldDate >= twoYearsAgo && soldDate < oneYearAgo;
  });

  if (lastYearSales.length > 0 && previousYearSales.length > 0) {
    const lastYearAvg = lastYearSales.reduce((sum, l) => sum + l.price, 0) / lastYearSales.length;
    const previousYearAvg = previousYearSales.reduce((sum, l) => sum + l.price, 0) / previousYearSales.length;
    const properTrend = ((lastYearAvg - previousYearAvg) / previousYearAvg) * 100;

    console.log(`  Last 12 months: ${lastYearSales.length} sales, avg $${lastYearAvg.toLocaleString()}`);
    console.log(`  Previous 12 months: ${previousYearSales.length} sales, avg $${previousYearAvg.toLocaleString()}`);
    console.log(`  Actual YoY trend: ${properTrend > 0 ? '+' : ''}${properTrend.toFixed(2)}%`);
  }

  console.log('\n' + '━'.repeat(80));
  console.log('✅ Test complete!');
}

// Run test
testFixedTrends()
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });