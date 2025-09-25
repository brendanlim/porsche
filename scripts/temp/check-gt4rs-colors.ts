#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkGT4RSListings() {
  console.log('🔍 Checking GT4 RS listings color status...\n');

  // Check GT4 RS listings without colors
  const { data: noColorListings, error: error1 } = await supabase
    .from('listings')
    .select('id, vin, source, source_url, year, exterior_color, interior_color')
    .ilike('trim', '%GT4 RS%')
    .is('exterior_color', null);

  console.log('GT4 RS listings without exterior color:', noColorListings?.length || 0);

  if (noColorListings && noColorListings.length > 0) {
    console.log('\nSample listings missing colors:');
    noColorListings.slice(0, 10).forEach(l => {
      console.log(`  • ${l.year} GT4 RS - VIN: ${l.vin || 'N/A'}`);
      console.log(`    Source: ${l.source} - URL: ${l.source_url}`);
    });
  }

  // Check total GT4 RS listings
  const { count: totalCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('trim', '%GT4 RS%');

  // Check listings with colors
  const { count: withColorCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('trim', '%GT4 RS%')
    .not('exterior_color', 'is', null);

  console.log(`\n📊 Summary:`);
  console.log(`  Total GT4 RS listings: ${totalCount}`);
  console.log(`  With colors: ${withColorCount}`);
  console.log(`  Missing colors: ${(totalCount || 0) - (withColorCount || 0)}`);
  console.log(`  Coverage: ${withColorCount && totalCount ? ((withColorCount / totalCount) * 100).toFixed(1) : 0}%`);

  // Check by source
  const { data: bySource } = await supabase
    .from('listings')
    .select('source')
    .ilike('trim', '%GT4 RS%')
    .is('exterior_color', null);

  const sourceCounts: Record<string, number> = {};
  bySource?.forEach(l => {
    sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
  });

  console.log('\n📋 Missing colors by source:');
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`  • ${source}: ${count} listings`);
  });
}

checkGT4RSListings().catch(console.error);