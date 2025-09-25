#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function removeDuplicateGT4RS() {
  console.log('🔍 Finding duplicate GT4 RS listings...\n');

  // Get all GT4 RS listings
  const { data: allGT4RS, error } = await supabase
    .from('listings')
    .select('id, vin, source, source_url, year, model, trim, exterior_color, price, mileage, sold_date')
    .ilike('trim', '%GT4 RS%')
    .order('vin', { ascending: true });

  if (error || !allGT4RS) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${allGT4RS.length} total GT4 RS listings\n`);

  // Find duplicates - group by VIN
  const byVin: Record<string, typeof allGT4RS> = {};
  const noVin: typeof allGT4RS = [];

  allGT4RS.forEach(listing => {
    if (listing.vin) {
      if (!byVin[listing.vin]) byVin[listing.vin] = [];
      byVin[listing.vin].push(listing);
    } else {
      noVin.push(listing);
    }
  });

  // Find VINs with duplicates
  const duplicateVins = Object.entries(byVin)
    .filter(([vin, listings]) => listings.length > 1);

  console.log(`Found ${duplicateVins.length} VINs with duplicate listings:\n`);

  const toDelete: string[] = [];

  duplicateVins.forEach(([vin, listings]) => {
    console.log(`VIN: ${vin} (${listings.length} listings)`);

    // Sort by completeness - prefer listings with more data
    const sorted = listings.sort((a, b) => {
      // Prefer listings with colors
      if (a.exterior_color && !b.exterior_color) return -1;
      if (!a.exterior_color && b.exterior_color) return 1;

      // Prefer listings with price
      if (a.price && !b.price) return -1;
      if (!a.price && b.price) return 1;

      // Prefer listings with mileage
      if (a.mileage && !b.mileage) return -1;
      if (!a.mileage && b.mileage) return 1;

      return 0;
    });

    // Keep the best one, mark others for deletion
    const keep = sorted[0];
    const deleteThese = sorted.slice(1);

    console.log(`  ✅ KEEP: ${keep.source} - Color: ${keep.exterior_color || 'N/A'} - Price: ${keep.price || 'N/A'}`);
    console.log(`     URL: ${keep.source_url}`);

    deleteThese.forEach(d => {
      console.log(`  ❌ DELETE: ${d.source} - Color: ${d.exterior_color || 'N/A'} - Price: ${d.price || 'N/A'}`);
      console.log(`     URL: ${d.source_url}`);
      toDelete.push(d.id);
    });
    console.log('');
  });

  // Also check listings without VIN that have suspicious URLs or missing data
  console.log('Listings without VIN that should be removed (missing critical data):\n');

  noVin.forEach(listing => {
    // Remove listings without VIN AND without color AND without price
    if (!listing.exterior_color && (!listing.price || listing.price === 0)) {
      console.log(`  ❌ DELETE: ${listing.year} ${listing.model} ${listing.trim}`);
      console.log(`     Source: ${listing.source}`);
      console.log(`     URL: ${listing.source_url}`);
      console.log(`     Reason: No VIN, no color, no price`);
      console.log('');
      toDelete.push(listing.id);
    }
  });

  if (toDelete.length === 0) {
    console.log('No duplicates to remove');
    return;
  }

  console.log('='.repeat(60));
  console.log(`Total listings to delete: ${toDelete.length}`);
  console.log('='.repeat(60));

  // Confirm before deleting
  console.log('\n🗑️  Deleting duplicate listings...\n');

  const { error: deleteError } = await supabase
    .from('listings')
    .delete()
    .in('id', toDelete);

  if (deleteError) {
    console.error('❌ Error deleting listings:', deleteError);
  } else {
    console.log(`✅ Successfully deleted ${toDelete.length} duplicate listings`);
  }

  // Verify remaining listings
  console.log('\n📊 Verifying remaining GT4 RS listings...\n');

  const { count: remainingCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('trim', '%GT4 RS%');

  const { count: withColorCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('trim', '%GT4 RS%')
    .not('exterior_color', 'is', null);

  console.log(`Remaining GT4 RS listings: ${remainingCount}`);
  console.log(`With color data: ${withColorCount}`);
  console.log(`Coverage: ${withColorCount && remainingCount ? ((withColorCount / remainingCount) * 100).toFixed(1) : 0}%`);

  // Show color distribution
  const { data: colorData } = await supabase
    .from('listings')
    .select('exterior_color')
    .ilike('trim', '%GT4 RS%')
    .not('exterior_color', 'is', null);

  if (colorData) {
    const colorCounts: Record<string, number> = {};
    colorData.forEach(l => {
      let color = l.exterior_color || 'Unknown';
      if (color === 'Arctic Grey') color = 'Arctic Gray';
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });

    console.log('\nTop GT4 RS Colors:');
    Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([color, count]) => {
        const percentage = ((count / colorData.length) * 100).toFixed(1);
        console.log(`  ${color}: ${count} listings (${percentage}%)`);
      });
  }
}

removeDuplicateGT4RS().catch(console.error);