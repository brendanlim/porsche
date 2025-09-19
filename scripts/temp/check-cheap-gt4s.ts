#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../../lib/supabase/admin';

async function checkCheapGT4s() {
  console.log('🔍 Searching for GT4 listings with suspiciously low prices...\n');

  // Query for GT4 listings under $50k
  const { data: cheapGT4s, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .ilike('trim', '%GT4%')
    .lt('price', 50000)
    .order('price', { ascending: true });

  if (error) {
    console.error('❌ Error querying database:', error);
    return;
  }

  console.log(`Found ${cheapGT4s?.length || 0} GT4 listings under $50,000:\n`);

  if (cheapGT4s && cheapGT4s.length > 0) {
    cheapGT4s.forEach((listing, index) => {
      console.log(`${index + 1}. ID: ${listing.id}`);
      console.log(`   Source: ${listing.source}`);
      console.log(`   URL: ${listing.source_url}`);
      console.log(`   Year: ${listing.year}`);
      console.log(`   Model: ${listing.model}`);
      console.log(`   Trim: ${listing.trim}`);
      console.log(`   Price: $${listing.price?.toLocaleString()}`);
      console.log(`   Mileage: ${listing.mileage?.toLocaleString()} miles`);
      console.log(`   Color: ${listing.color}`);
      console.log(`   VIN: ${listing.vin}`);
      console.log(`   Sold Date: ${listing.sold_date}`);
      console.log(`   Scraped: ${listing.scraped_at}`);
      console.log(`   Options Text: ${listing.options_text?.substring(0, 100)}...`);
      console.log('   ---');
    });
  } else {
    console.log('✅ No GT4 listings found under $50,000');
  }

  // Also check for GT4 listings between $50k-$100k (still suspiciously low)
  console.log('\n🔍 Checking GT4 listings between $50k-$100k (also suspicious)...\n');

  const { data: lowGT4s, error: lowError } = await supabaseAdmin
    .from('listings')
    .select('*')
    .ilike('trim', '%GT4%')
    .gte('price', 50000)
    .lt('price', 100000)
    .order('price', { ascending: true });

  if (lowError) {
    console.error('❌ Error querying database:', lowError);
    return;
  }

  console.log(`Found ${lowGT4s?.length || 0} GT4 listings between $50k-$100k:\n`);

  if (lowGT4s && lowGT4s.length > 0) {
    lowGT4s.forEach((listing, index) => {
      console.log(`${index + 1}. ID: ${listing.id} - ${listing.year} ${listing.model} ${listing.trim} - $${listing.price?.toLocaleString()} - ${listing.source}`);
    });
  }

  // Check overall GT4 price distribution
  console.log('\n📊 GT4 Price Distribution:');

  const { data: allGT4s, error: allError } = await supabaseAdmin
    .from('listings')
    .select('price')
    .ilike('trim', '%GT4%')
    .not('price', 'is', null)
    .order('price', { ascending: true });

  if (!allError && allGT4s) {
    const prices = allGT4s.map(l => l.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const median = prices[Math.floor(prices.length / 2)];
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

    console.log(`   Total GT4 listings: ${prices.length}`);
    console.log(`   Min price: $${min.toLocaleString()}`);
    console.log(`   Max price: $${max.toLocaleString()}`);
    console.log(`   Median price: $${median.toLocaleString()}`);
    console.log(`   Average price: $${avg.toLocaleString()}`);
  }
}

checkCheapGT4s().catch(console.error);