#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixAllData() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE DATA FIX FOR ALL LISTINGS');
  console.log('='.repeat(80));
  console.log('This script will:');
  console.log('1. Parse all stored HTML to extract VINs and options');
  console.log('2. Populate listing_options table with normalized options');
  console.log('='.repeat(80) + '\n');

  // Get current statistics
  const { count: totalListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });

  const { count: listingsWithVIN } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .not('vin', 'is', null);

  const { count: listingsWithOptions } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .not('options_text', 'is', null);

  const { count: optionRelations } = await supabase
    .from('listing_options')
    .select('*', { count: 'exact', head: true });

  console.log('CURRENT STATUS:');
  console.log(`- Total listings: ${totalListings}`);
  console.log(`- Listings with VIN: ${listingsWithVIN} (${((listingsWithVIN!/totalListings!)*100).toFixed(1)}%)`);
  console.log(`- Listings with options_text: ${listingsWithOptions} (${((listingsWithOptions!/totalListings!)*100).toFixed(1)}%)`);
  console.log(`- Option relationships: ${optionRelations}`);
  console.log();

  // Step 1: Parse stored HTML for bring-a-trailer listings
  console.log('STEP 1: Parsing stored HTML for bring-a-trailer listings...');
  console.log('This will extract VINs, options, colors, location, and sold_date');
  console.log('Run: npx tsx scripts/parse-all-stored-html.ts');
  console.log();

  // Step 2: Populate listing_options
  console.log('STEP 2: Populating listing_options table...');
  console.log('This will normalize options_text and create relational entries');
  console.log('Run: npx tsx scripts/populate-listing-options.ts');
  console.log();

  // Provide the commands to run
  console.log('='.repeat(80));
  console.log('RUN THESE COMMANDS IN ORDER:');
  console.log('='.repeat(80));
  console.log();
  console.log('1. Parse HTML and extract data (this will take a while):');
  console.log('   npx tsx scripts/parse-all-stored-html.ts');
  console.log();
  console.log('2. After that completes, populate options relationships:');
  console.log('   npx tsx scripts/populate-listing-options.ts');
  console.log();
  console.log('3. To verify the results:');
  console.log('   npx tsx scripts/check-vins.ts');
  console.log();
  console.log('='.repeat(80));
  console.log('NOTES:');
  console.log('='.repeat(80));
  console.log('- parse-all-stored-html will process ~5800 HTML files');
  console.log('- It extracts: VIN, options, colors, location, sold_date, mileage');
  console.log('- populate-listing-options uses Gemini API (rate limited)');
  console.log('- Total time: ~30-60 minutes depending on API limits');
}

fixAllData().catch(console.error);