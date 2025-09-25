#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { processMultipleListingOptions } from '../../lib/services/options-manager';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function populateListingOptions() {
  console.log('='.repeat(80));
  console.log('POPULATING LISTING OPTIONS FROM EXISTING DATA');
  console.log('='.repeat(80));
  console.log('This will normalize options_text and create relational entries');
  console.log('='.repeat(80) + '\n');

  // Get all listings with options_text but check if they already have options
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, options_text')
    .not('options_text', 'is', null);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  if (!listings || listings.length === 0) {
    console.log('No listings with options_text found');
    return;
  }

  console.log(`Found ${listings.length} listings with options_text\n`);

  // Check how many already have entries in listing_options
  const { count: existingCount } = await supabase
    .from('listing_options')
    .select('*', { count: 'exact', head: true });

  console.log(`Current entries in listing_options table: ${existingCount}\n`);

  // Process all listings
  await processMultipleListingOptions(listings);

  // Report results
  const { count: newCount } = await supabase
    .from('listing_options')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '='.repeat(80));
  console.log('RESULTS');
  console.log('='.repeat(80));
  console.log(`Previous entries in listing_options: ${existingCount}`);
  console.log(`New entries in listing_options: ${newCount}`);
  console.log(`Net change: +${(newCount || 0) - (existingCount || 0)}`);

  // Show sample of populated options
  const { data: sampleListings } = await supabase
    .from('listing_options')
    .select(`
      listing_id,
      option:options(name, category)
    `)
    .limit(10);

  if (sampleListings && sampleListings.length > 0) {
    console.log('\nSample of populated options:');
    const listingGroups = sampleListings.reduce((acc, item) => {
      if (!acc[item.listing_id]) acc[item.listing_id] = [];
      acc[item.listing_id].push(item.option);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(listingGroups).slice(0, 3).forEach(([listingId, options]) => {
      console.log(`\nListing ${listingId}:`);
      options.forEach(opt => {
        console.log(`  - ${opt.name} (${opt.category})`);
      });
    });
  }
}

populateListingOptions().catch(console.error);