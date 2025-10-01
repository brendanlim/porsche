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

// Original VINs that should be GT3 RS
const targetVins = [
  'WP0AF2A90GS192496',
  'WP0AF2A90GS193132'
];

async function verifyFixes() {
  console.log('🔍 Verifying GT3 RS fixes');
  console.log('━'.repeat(60));

  // Check the specific VINs
  console.log('\n📊 Checking target VINs:');
  for (const vin of targetVins) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, vin, model, trim, year, title')
      .eq('vin', vin)
      .single();

    if (error) {
      console.log(`  ❌ ${vin} - Not found`);
    } else if (data) {
      const status = data.trim === 'GT3 RS' ? '✅' : '❌';
      console.log(`  ${status} ${vin}: ${data.year} ${data.model} ${data.trim}`);
    }
  }

  // Check overall GT3 RS stats
  console.log('\n\n📊 GT3 RS Statistics:');
  console.log('━'.repeat(60));

  // Count all GT3 RS
  const { data: gt3rsCount, error: countError } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('trim', 'GT3 RS');

  console.log(`\n  Total GT3 RS listings: ${gt3rsCount || 0}`);

  // Check VIN patterns for 991 GT3 RS
  const { data: vinPatternGT3RS, error: vinError } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .like('vin', 'WP0AF2A9%')
    .eq('trim', 'GT3 RS');

  console.log(`  991 GT3 RS (WP0AF2A9 pattern): ${vinPatternGT3RS || 0}`);

  // Check for any remaining misclassified
  const { data: misclassified, error: misError } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .like('vin', 'WP0AF2A9%')
    .neq('trim', 'GT3 RS');

  if (misclassified && misclassified > 0) {
    console.log(`  ⚠️  Potential misclassified GT3 RS remaining: ${misclassified}`);
  } else {
    console.log(`  ✅ No misclassified GT3 RS found with WP0AF2A9 VIN pattern`);
  }

  // Show breakdown by year
  console.log('\n📊 GT3 RS by Year:');
  const { data: yearBreakdown, error: yearError } = await supabase
    .from('listings')
    .select('year')
    .eq('trim', 'GT3 RS')
    .order('year');

  if (yearBreakdown) {
    const yearCounts = yearBreakdown.reduce((acc: any, item: any) => {
      acc[item.year] = (acc[item.year] || 0) + 1;
      return acc;
    }, {});

    Object.entries(yearCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([year, count]) => {
        console.log(`  ${year}: ${count} listings`);
      });
  }

  console.log('\n━'.repeat(60));
  console.log('✅ Verification complete!');
}

// Run verification
verifyFixes()
  .catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });