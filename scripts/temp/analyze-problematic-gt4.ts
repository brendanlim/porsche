#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../../lib/supabase/admin';

async function analyzeProblematicGT4() {
  const listingId = '3a70a411-388c-423d-9737-2c2bb86fb6e7';

  console.log('🔍 Analyzing problematic GT4 listing...\n');

  // Get the full listing details
  const { data: listing, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (error) {
    console.error('❌ Error fetching listing:', error);
    return;
  }

  if (!listing) {
    console.log('❌ Listing not found');
    return;
  }

  console.log('📋 Full Listing Details:');
  console.log('================================');
  console.log(`ID: ${listing.id}`);
  console.log(`Source: ${listing.source}`);
  console.log(`Source URL: ${listing.source_url}`);
  console.log(`Year: ${listing.year || 'NULL'}`);
  console.log(`Make: ${listing.make}`);
  console.log(`Model: ${listing.model}`);
  console.log(`Trim: ${listing.trim}`);
  console.log(`Price: $${listing.price?.toLocaleString() || 'NULL'}`);
  console.log(`Mileage: ${listing.mileage?.toLocaleString() || 'NULL'} miles`);
  console.log(`Color: ${listing.color || 'NULL'}`);
  console.log(`VIN: ${listing.vin || 'NULL'}`);
  console.log(`Sold Date: ${listing.sold_date || 'NULL'}`);
  console.log(`List Date: ${listing.list_date || 'NULL'}`);
  console.log(`Scraped At: ${listing.scraped_at}`);
  console.log(`Options Text: ${listing.options_text || 'NULL'}`);
  console.log(`Description: ${listing.description || 'NULL'}`);
  console.log(`Images: ${listing.images ? JSON.stringify(listing.images) : 'NULL'}`);
  console.log(`HTML File Path: ${listing.html_file_path || 'NULL'}`);

  console.log('\n🔍 Analysis:');
  console.log('================================');

  // Check if the URL looks suspicious
  if (listing.source_url?.includes('seats-94')) {
    console.log('❌ ISSUE IDENTIFIED: URL contains "seats-94" which is clearly not a GT4 listing');
    console.log('   This appears to be a seat/parts listing, not a car listing');
  }

  // Check if there's a year mismatch
  if (!listing.year) {
    console.log('❌ ISSUE: Missing year - legitimate GT4 listings should have a year');
  }

  // Check model classification
  if (listing.model === '718 Cayman' && listing.trim === 'GT4') {
    console.log('⚠️  Model/Trim classification suggests this should be a 718 Cayman GT4');
    console.log('   But the URL and price suggest this is not actually a car');
  }

  // Check if there's HTML stored for this listing
  if (listing.html_file_path) {
    console.log(`📄 HTML file stored at: ${listing.html_file_path}`);
    console.log('   Recommend examining the HTML to see what was actually scraped');
  } else {
    console.log('❌ No HTML file stored - cannot verify original content');
  }

  console.log('\n💡 Recommended Actions:');
  console.log('================================');
  console.log('1. Delete this listing - it appears to be seats/parts, not a GT4');
  console.log('2. Examine the HTML (if available) to understand how it was misclassified');
  console.log('3. Update scraping logic to better filter out non-car listings');
  console.log('4. Check for other similar misclassified listings');
}

analyzeProblematicGT4().catch(console.error);