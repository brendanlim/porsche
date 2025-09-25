#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

async function checkDuplicates() {
  // Load environment variables
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const dotenv = await import('dotenv');
    dotenv.config({ path: envPath });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Analyzing BaT URL Duplicates\n');

  // Get all BaT URLs from cache
  const { data: batCache } = await supabase
    .from('raw_html_cache')
    .select('url, created_at')
    .like('url', '%bringatrailer.com%')
    .order('created_at', { ascending: false });

  if (!batCache || batCache.length === 0) {
    console.log('No BaT URLs in cache');
    return;
  }

  // Count duplicates
  const urlCounts = new Map<string, { count: number, dates: string[] }>();

  batCache.forEach(entry => {
    const existing = urlCounts.get(entry.url) || { count: 0, dates: [] };
    existing.count++;
    existing.dates.push(new Date(entry.created_at).toLocaleDateString());
    urlCounts.set(entry.url, existing);
  });

  // Find most duplicated URLs
  const sorted = Array.from(urlCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  console.log('Top 10 Most Duplicated BaT URLs:\n');
  sorted.forEach(([url, data], i) => {
    console.log(`${i + 1}. Fetched ${data.count} times: ${url}`);
    // Show first 5 dates
    const dateSample = data.dates.slice(0, 5).join(', ');
    console.log(`   Dates: ${dateSample}${data.dates.length > 5 ? '...' : ''}\n`);
  });

  // Calculate waste
  const totalFetches = batCache.length;
  const uniqueUrls = urlCounts.size;
  const duplicateFetches = totalFetches - uniqueUrls;
  const duplicateRate = (duplicateFetches / totalFetches * 100).toFixed(1);

  console.log('📊 Duplication Statistics:');
  console.log(`  Total fetches: ${totalFetches}`);
  console.log(`  Unique URLs: ${uniqueUrls}`);
  console.log(`  Duplicate fetches: ${duplicateFetches}`);
  console.log(`  Duplicate rate: ${duplicateRate}%`);

  // Cost calculation
  const avgPageSize = 1.5; // MB
  const costPerGB = 8; // $8/GB
  const wastedCost = (duplicateFetches * avgPageSize / 1024) * costPerGB;

  console.log(`\n💰 Cost Impact:`);
  console.log(`  Wasted fetches: ${duplicateFetches} × 1.5MB = ${(duplicateFetches * 1.5).toFixed(0)}MB`);
  console.log(`  Wasted money: $${wastedCost.toFixed(2)}`);
  console.log(`  Monthly waste (projected): $${(wastedCost * 30).toFixed(2)}`);

  // Check if these are search pages or detail pages
  const searchPages = sorted.filter(([url]) => !url.includes('/listing/'));
  const detailPages = sorted.filter(([url]) => url.includes('/listing/'));

  console.log(`\n📋 URL Types:`);
  console.log(`  Search/listing pages: ${searchPages.length}`);
  console.log(`  Detail pages: ${detailPages.length}`);

  if (searchPages.length > 0) {
    console.log('\n⚠️  Search pages being fetched multiple times:');
    searchPages.slice(0, 3).forEach(([url, data]) => {
      console.log(`  ${data.count}x: ${url.substring(0, 60)}...`);
    });
    console.log('\n  💡 These should be cached for at least 6-24 hours!');
  }

  console.log('\n✨ Solution:');
  console.log('  1. Cache search pages for 6+ hours (they rarely change)');
  console.log('  2. Check cache BEFORE making Bright Data calls');
  console.log('  3. For sold listings, NEVER re-fetch (they never change)');
  console.log(`  4. Potential savings: $${wastedCost.toFixed(2)} per run`);
}

checkDuplicates().catch(console.error);