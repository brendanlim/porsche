#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function removeNoVINListings() {
  console.log('🔍 Finding GT4 RS listings without VINs...\n');

  // Get GT4 RS listings without VINs
  const { data, error } = await supabase
    .from('listings')
    .select('id, source, source_url, price, year')
    .ilike('trim', '%GT4 RS%')
    .is('vin', null);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} GT4 RS listings without VINs:\n`);

  if (!data || data.length === 0) {
    console.log('No listings to remove');
    return;
  }

  data.forEach((l, idx) => {
    console.log(`${idx + 1}. ${l.year || 'Unknown'} GT4 RS`);
    console.log(`   Source: ${l.source}`);
    console.log(`   Price: $${l.price?.toLocaleString() || 'N/A'}`);
    console.log(`   URL: ${l.source_url}`);
    console.log('');
  });

  console.log('='.repeat(60));
  console.log(`🗑️  Deleting ${data.length} listings without VINs...`);
  console.log('='.repeat(60));

  const { error: deleteError } = await supabase
    .from('listings')
    .delete()
    .in('id', data.map(d => d.id));

  if (deleteError) {
    console.error('❌ Delete error:', deleteError);
  } else {
    console.log(`✅ Successfully deleted ${data.length} listings without VINs`);
  }

  // Check remaining listings
  console.log('\n📊 Verifying remaining GT4 RS listings...\n');

  const { count: totalRemaining } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('trim', '%GT4 RS%');

  const { count: withVIN } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('trim', '%GT4 RS%')
    .not('vin', 'is', null);

  const { count: withColor } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('trim', '%GT4 RS%')
    .not('exterior_color', 'is', null);

  console.log(`Total GT4 RS listings: ${totalRemaining}`);
  console.log(`  With VIN: ${withVIN} (${withVIN && totalRemaining ? ((withVIN / totalRemaining) * 100).toFixed(1) : 0}%)`);
  console.log(`  With color: ${withColor} (${withColor && totalRemaining ? ((withColor / totalRemaining) * 100).toFixed(1) : 0}%)`);

  // Show color distribution
  const { data: colorData } = await supabase
    .from('listings')
    .select('exterior_color')
    .ilike('trim', '%GT4 RS%')
    .not('exterior_color', 'is', null);

  if (colorData && colorData.length > 0) {
    const colorCounts: Record<string, number> = {};
    colorData.forEach(l => {
      let color = l.exterior_color || 'Unknown';
      // Normalize Arctic Grey to Arctic Gray
      if (color === 'Arctic Grey') color = 'Arctic Gray';
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });

    console.log('\nGT4 RS Color Distribution:');
    Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([color, count]) => {
        const percentage = ((count / colorData.length) * 100).toFixed(1);
        console.log(`  ${color}: ${count} listings (${percentage}%)`);
      });
  }
}

removeNoVINListings().catch(console.error);