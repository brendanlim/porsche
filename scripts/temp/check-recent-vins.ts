#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecentVINs() {
  console.log('🔍 Checking for recently scraped listings with VINs...\n');

  // Get listings added in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recentListings, error } = await supabase
    .from('listings')
    .select('id, vin, year, model, trim, generation, created_at, scraped_at, source')
    .gt('scraped_at', oneHourAgo)
    .not('vin', 'is', null)
    .order('scraped_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error querying database:', error);
    return;
  }

  console.log(`Found ${recentListings?.length || 0} listings with VINs scraped in the last hour:\n`);

  if (recentListings && recentListings.length > 0) {
    recentListings.forEach(listing => {
      const vinLast8 = listing.vin ? listing.vin.slice(-8) : 'NO VIN';
      const time = new Date(listing.scraped_at).toLocaleTimeString();
      console.log(`  [${time}] ${listing.year} ${listing.model} ${listing.trim || ''} (${listing.generation || '?'}) - VIN: ${vinLast8} - ${listing.source}`);
    });
  }

  // Check how many listings were added without VINs
  const { data: noVinListings, count } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .gt('scraped_at', oneHourAgo)
    .or('vin.is.null,vin.eq.');

  console.log(`\n📊 Stats for last hour:`);
  console.log(`   With VINs: ${recentListings?.length || 0}`);
  console.log(`   Without VINs: ${count || 0}`);
  console.log(`   Total: ${(recentListings?.length || 0) + (count || 0)}`);

  // Check specifically for 996 GT3s
  const { data: gt3s } = await supabase
    .from('listings')
    .select('id, vin, year, model, trim, generation')
    .gt('scraped_at', oneHourAgo)
    .eq('model', '911')
    .ilike('trim', '%GT3%')
    .in('generation', ['996', '996.1', '996.2']);

  if (gt3s && gt3s.length > 0) {
    console.log(`\n🏎️  Found ${gt3s.length} new 996 GT3s!`);
    gt3s.forEach(gt3 => {
      const vinStatus = gt3.vin ? `VIN: ${gt3.vin.slice(-8)}` : 'NO VIN';
      console.log(`   ${gt3.year} GT3 (${gt3.generation}) - ${vinStatus}`);
    });
  } else {
    console.log('\n❌ No new 996 GT3s found in this scraping run');
  }
}

checkRecentVINs().catch(console.error);