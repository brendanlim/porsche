#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Target VINs that should be GT3 Touring models
const targetVINs = [
  'WP0AC2A94JS176169',
  'WP0AC2A94JS176222',
  'WP0AC2A99JS176295',
  'WP0AC2A99JS176782'
];

async function main() {
  console.log('🔍 Verifying GT3 Touring Trim Fixes');
  console.log('━'.repeat(60));

  // Check the target VINs
  console.log('\n📋 Checking target VINs:');

  const { data: targetListings, error: targetError } = await supabase
    .from('listings')
    .select('id, vin, trim, model, year, generation, title')
    .in('vin', targetVINs)
    .order('vin');

  if (targetError) {
    console.error('❌ Error fetching target VINs:', targetError);
    return;
  }

  let fixedCount = 0;
  let stillBrokenCount = 0;

  targetListings?.forEach((listing, index) => {
    const isFixed = listing.trim === 'GT3 Touring';
    const hasTouring = listing.title?.toLowerCase().includes('touring') || false;

    console.log(`${index + 1}. VIN: ${listing.vin}`);
    console.log(`   Current Trim: ${listing.trim || 'N/A'}`);
    console.log(`   Title: ${listing.title || 'N/A'}`);
    console.log(`   Status: ${isFixed ? '✅ FIXED' : '❌ STILL BROKEN'}`);
    console.log('');

    if (isFixed) {
      fixedCount++;
    } else if (hasTouring) {
      stillBrokenCount++;
    }
  });

  // Check all GT3 Touring models
  console.log('\n📊 All GT3 Touring models in database:');

  const { data: touringListings, error: touringError } = await supabase
    .from('listings')
    .select('id, vin, trim, model, year, generation, title')
    .eq('trim', 'GT3 Touring')
    .order('vin');

  if (touringError) {
    console.error('❌ Error fetching GT3 Touring listings:', touringError);
    return;
  }

  console.log(`\nFound ${touringListings?.length || 0} GT3 Touring listings:`);
  touringListings?.forEach((listing, index) => {
    console.log(`${index + 1}. VIN: ${listing.vin || 'N/A'}`);
    console.log(`   Year: ${listing.year}`);
    console.log(`   Generation: ${listing.generation}`);
    console.log(`   Title: ${listing.title || 'N/A'}`);
    console.log('');
  });

  // Summary
  console.log('\n' + '━'.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━'.repeat(60));
  console.log(`✅ Target VINs fixed: ${fixedCount}/4`);
  console.log(`❌ Target VINs still broken: ${stillBrokenCount}`);
  console.log(`📦 Total GT3 Touring listings: ${touringListings?.length || 0}`);

  if (stillBrokenCount > 0) {
    console.log('\n⚠️  Some target VINs still need fixing!');
    process.exit(1);
  } else {
    console.log('\n✅ All target VINs have been successfully fixed!');
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});