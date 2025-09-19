#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../../lib/supabase/admin';

async function fixMisclassifiedGT4() {
  const problematicId = '3a70a411-388c-423d-9737-2c2bb86fb6e7';

  console.log('🔧 Fixing misclassified GT4 listing...\n');

  // First, confirm the listing details before deletion
  const { data: listing, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('id, source_url, price, model, trim')
    .eq('id', problematicId)
    .single();

  if (fetchError || !listing) {
    console.log('❌ Listing not found or error fetching:', fetchError);
    return;
  }

  console.log('📋 Confirming listing to delete:');
  console.log(`   ID: ${listing.id}`);
  console.log(`   URL: ${listing.source_url}`);
  console.log(`   Model/Trim: ${listing.model} ${listing.trim}`);
  console.log(`   Price: $${listing.price?.toLocaleString()}`);

  // Delete the misclassified listing
  const { error: deleteError } = await supabaseAdmin
    .from('listings')
    .delete()
    .eq('id', problematicId);

  if (deleteError) {
    console.error('❌ Error deleting listing:', deleteError);
    return;
  }

  console.log('✅ Successfully deleted misclassified listing\n');

  // Now check for other potential misclassified listings
  console.log('🔍 Checking for other potential misclassified listings...\n');

  // Look for listings with suspicious URLs (parts, seats, wheels, etc.)
  const suspiciousPatterns = [
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
    'interior'
  ];

  for (const pattern of suspiciousPatterns) {
    const { data: suspiciousListings, error } = await supabaseAdmin
      .from('listings')
      .select('id, source_url, model, trim, price, year')
      .ilike('source_url', `%${pattern}%`)
      .limit(10);

    if (error) {
      console.error(`❌ Error checking for ${pattern} listings:`, error);
      continue;
    }

    if (suspiciousListings && suspiciousListings.length > 0) {
      console.log(`⚠️  Found ${suspiciousListings.length} listings with "${pattern}" in URL:`);
      suspiciousListings.forEach(l => {
        console.log(`   - ${l.year || 'N/A'} ${l.model} ${l.trim} - $${l.price?.toLocaleString() || 'N/A'} - ${l.source_url}`);
      });
      console.log('');
    }
  }

  // Check for listings missing critical data (likely misclassified)
  console.log('🔍 Checking for listings missing critical data...\n');

  const { data: missingDataListings, error: missingError } = await supabaseAdmin
    .from('listings')
    .select('id, source_url, model, trim, price, year, make, vin')
    .or('year.is.null,make.is.null,vin.is.null')
    .not('price', 'is', null)
    .lt('price', 100000) // Focus on suspiciously cheap ones
    .order('price', { ascending: true })
    .limit(20);

  if (missingError) {
    console.error('❌ Error checking for missing data:', missingError);
  } else if (missingDataListings && missingDataListings.length > 0) {
    console.log(`⚠️  Found ${missingDataListings.length} listings with missing critical data and low prices:`);
    missingDataListings.forEach(l => {
      const issues = [];
      if (!l.year) issues.push('no year');
      if (!l.make) issues.push('no make');
      if (!l.vin) issues.push('no VIN');
      console.log(`   - ${l.year || 'N/A'} ${l.model} ${l.trim} - $${l.price?.toLocaleString() || 'N/A'} - Issues: ${issues.join(', ')} - ${l.source_url}`);
    });
  }

  console.log('\n✅ Misclassified listing fix completed!');
  console.log('\n💡 Recommendations:');
  console.log('   1. Review any suspicious listings found above');
  console.log('   2. Update scraper logic to filter out parts/accessories listings');
  console.log('   3. Add validation to require year, make, and VIN for car listings');
}

fixMisclassifiedGT4().catch(console.error);