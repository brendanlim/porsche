#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../../lib/supabase/admin';

async function cleanupMisclassifiedListings() {
  console.log('🧹 Cleaning up misclassified parts/accessories listings...\n');

  // Define patterns that indicate non-car listings
  const nonCarPatterns = [
    'seats',
    'wheels',
    'parts',
    'engine',
    'transmission',
    'steering',
    'spoiler',
    'bumper',
    'hood',
    'fender',
    'door',
    'interior',
    'recaro',
    'bucket-seats'
  ];

  let totalDeleted = 0;

  for (const pattern of nonCarPatterns) {
    console.log(`🔍 Checking for listings with "${pattern}" in URL...`);

    // Get all listings matching this pattern
    const { data: suspiciousListings, error } = await supabaseAdmin
      .from('listings')
      .select('id, source_url, model, trim, price, year')
      .ilike('source_url', `%${pattern}%`);

    if (error) {
      console.error(`❌ Error checking for ${pattern} listings:`, error);
      continue;
    }

    if (!suspiciousListings || suspiciousListings.length === 0) {
      console.log(`   ✅ No listings found with "${pattern}"`);
      continue;
    }

    console.log(`   Found ${suspiciousListings.length} listings to review:`);

    const toDelete: string[] = [];

    for (const listing of suspiciousListings) {
      // Check if this is clearly a parts/accessories listing
      const url = listing.source_url?.toLowerCase() || '';
      const isPartListing =
        url.includes(`/${pattern}/`) ||
        url.includes(`${pattern}-`) ||
        url.includes(`-${pattern}`) ||
        url.includes(`${pattern}s/`) ||
        url.includes('/recaro-') ||
        url.includes('-recaro') ||
        url.includes('bucket-seats') ||
        url.includes('collection-of-') ||
        (!listing.year && listing.price && listing.price < 50000); // No year + cheap = likely parts

      if (isPartListing) {
        console.log(`     ❌ DELETING: ${listing.year || 'N/A'} ${listing.model} ${listing.trim} - $${listing.price?.toLocaleString() || 'N/A'}`);
        console.log(`        URL: ${listing.source_url}`);
        toDelete.push(listing.id);
      } else {
        console.log(`     ⚠️  KEEPING: ${listing.year || 'N/A'} ${listing.model} ${listing.trim} - $${listing.price?.toLocaleString() || 'N/A'}`);
        console.log(`        URL: ${listing.source_url} (might be legitimate)`);
      }
    }

    // Delete the identified parts listings
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('listings')
        .delete()
        .in('id', toDelete);

      if (deleteError) {
        console.error(`❌ Error deleting ${pattern} listings:`, deleteError);
      } else {
        console.log(`   ✅ Deleted ${toDelete.length} misclassified listings`);
        totalDeleted += toDelete.length;
      }
    }

    console.log('');
  }

  // Additional cleanup: Remove listings with obviously wrong data
  console.log('🔍 Checking for listings with obviously wrong data...\n');

  // Find listings with no year and suspiciously low prices (likely parts)
  const { data: noYearListings, error: noYearError } = await supabaseAdmin
    .from('listings')
    .select('id, source_url, model, trim, price, year')
    .is('year', null)
    .lt('price', 30000) // Very low price + no year = likely parts
    .not('price', 'is', null);

  if (noYearError) {
    console.error('❌ Error checking for no-year listings:', noYearError);
  } else if (noYearListings && noYearListings.length > 0) {
    console.log(`Found ${noYearListings.length} listings with no year and low prices:`);

    const toDeleteNoYear: string[] = [];

    for (const listing of noYearListings) {
      // If it's under $30k and has no year, it's very likely parts
      console.log(`   ❌ DELETING: No Year ${listing.model} ${listing.trim} - $${listing.price?.toLocaleString()}`);
      console.log(`      URL: ${listing.source_url}`);
      toDeleteNoYear.push(listing.id);
    }

    if (toDeleteNoYear.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('listings')
        .delete()
        .in('id', toDeleteNoYear);

      if (deleteError) {
        console.error('❌ Error deleting no-year listings:', deleteError);
      } else {
        console.log(`   ✅ Deleted ${toDeleteNoYear.length} no-year listings`);
        totalDeleted += toDeleteNoYear.length;
      }
    }
  }

  console.log(`\n🎉 Cleanup completed! Total listings deleted: ${totalDeleted}`);

  // Run the GT4 check again to confirm the fix
  console.log('\n🔍 Re-checking GT4 listings under $50k...');

  const { data: remainingCheapGT4s, error: gt4Error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .ilike('trim', '%GT4%')
    .lt('price', 50000);

  if (gt4Error) {
    console.error('❌ Error checking GT4s:', gt4Error);
  } else {
    console.log(`Found ${remainingCheapGT4s?.length || 0} GT4 listings under $50k remaining`);

    if (remainingCheapGT4s && remainingCheapGT4s.length > 0) {
      console.log('Remaining cheap GT4s:');
      remainingCheapGT4s.forEach(l => {
        console.log(`   - ${l.year || 'N/A'} ${l.model} ${l.trim} - $${l.price?.toLocaleString()} - ${l.source_url}`);
      });
    } else {
      console.log('✅ No GT4 listings under $50k remain - fix successful!');
    }
  }
}

cleanupMisclassifiedListings().catch(console.error);