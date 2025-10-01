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

async function checkGenerations() {
  console.log('🔍 Checking generation values for 911 GT3');
  console.log('━'.repeat(80));

  // Query all GT3s
  const { data: listings, error } = await supabase
    .from('listings')
    .select('vin, year, model, trim, generation, sold_date, price')
    .ilike('model', '911')
    .ilike('trim', 'GT3')
    .not('sold_date', 'is', null)
    .order('year', { ascending: false });

  if (error || !listings) {
    console.error('Error:', error);
    return;
  }

  // Group by generation
  const byGeneration = listings.reduce((acc: any, listing) => {
    const gen = listing.generation || 'NULL';
    if (!acc[gen]) {
      acc[gen] = {
        count: 0,
        years: new Set(),
        samples: []
      };
    }
    acc[gen].count++;
    acc[gen].years.add(listing.year);
    if (acc[gen].samples.length < 3) {
      acc[gen].samples.push({
        year: listing.year,
        vin: listing.vin,
        price: listing.price
      });
    }
    return acc;
  }, {});

  console.log('\n📊 Generation Distribution:');
  console.log('─'.repeat(60));

  Object.entries(byGeneration)
    .sort(([a], [b]) => {
      // Sort by generation code
      if (a === 'NULL') return 1;
      if (b === 'NULL') return -1;
      return b.localeCompare(a);
    })
    .forEach(([gen, data]: any) => {
      const years = Array.from(data.years).sort().join(', ');
      console.log(`\n${gen}: ${data.count} listings`);
      console.log(`  Years: ${years}`);
      console.log(`  Sample VINs:`);
      data.samples.forEach((s: any) => {
        console.log(`    ${s.year} - ${s.vin} - $${s.price?.toLocaleString() || 'N/A'}`);
      });
    });

  // Check for incorrect generations
  console.log('\n\n🚨 Checking for incorrect generation assignments:');
  console.log('─'.repeat(60));

  // 991.1 should be 2014-2015
  // 991.2 should be 2016-2019 (2018-2019 for GT3)
  // 992.1 should be 2020-2023
  // 992.2 should be 2024+

  const issues: any[] = [];

  listings.forEach(listing => {
    const year = listing.year;
    const gen = listing.generation;

    // Check 991 GT3s
    if (year >= 2014 && year <= 2015) {
      if (gen !== '991.1' && gen !== '991') {
        issues.push({ ...listing, expected: '991.1', actual: gen });
      }
    } else if (year >= 2016 && year <= 2019) {
      if (gen !== '991.2' && gen !== '991') {
        issues.push({ ...listing, expected: '991.2', actual: gen });
      }
    } else if (year >= 2020 && year <= 2023) {
      if (gen !== '992.1' && gen !== '992') {
        issues.push({ ...listing, expected: '992.1', actual: gen });
      }
    } else if (year >= 2024) {
      if (gen !== '992.2' && gen !== '992') {
        issues.push({ ...listing, expected: '992.2', actual: gen });
      }
    }
  });

  if (issues.length > 0) {
    console.log(`\n⚠️  Found ${issues.length} listings with incorrect generation:`);
    issues.slice(0, 10).forEach(issue => {
      console.log(`  ${issue.year} ${issue.model} ${issue.trim}`);
      console.log(`    VIN: ${issue.vin}`);
      console.log(`    Expected: ${issue.expected}, Got: ${issue.actual}`);
    });
  } else {
    console.log('\n✅ All generation assignments appear correct');
  }

  // Check what's in database for 991s specifically
  console.log('\n\n📊 991 Generation Analysis:');
  console.log('─'.repeat(60));

  const gen991 = listings.filter(l => l.year >= 2014 && l.year <= 2019);
  const gen991_1 = gen991.filter(l => l.generation === '991.1');
  const gen991_2 = gen991.filter(l => l.generation === '991.2');
  const gen991_bare = gen991.filter(l => l.generation === '991');
  const gen991_null = gen991.filter(l => !l.generation);

  console.log(`Total 991 GT3s (2014-2019): ${gen991.length}`);
  console.log(`  With '991.1': ${gen991_1.length}`);
  console.log(`  With '991.2': ${gen991_2.length}`);
  console.log(`  With '991' (bare): ${gen991_bare.length}`);
  console.log(`  With NULL: ${gen991_null.length}`);

  console.log('\n' + '━'.repeat(80));
  console.log('✅ Analysis complete!');
}

// Run check
checkGenerations()
  .catch(error => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });