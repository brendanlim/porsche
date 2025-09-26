#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGenerations() {
  console.log('🔍 Checking for generation normalization issues...\n');

  // Check GT3 generation distribution
  const { data: generations } = await supabase
    .from('listings')
    .select('generation, generation_code')
    .eq('model', '911')
    .ilike('trim', '%GT3%')
    .not('generation', 'is', null);

  const genCounts: Record<string, number> = {};
  generations?.forEach(row => {
    const gen = row.generation || row.generation_code || 'unknown';
    genCounts[gen] = (genCounts[gen] || 0) + 1;
  });

  console.log('Current GT3 Generation Distribution:');
  Object.entries(genCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .forEach(([gen, count]) => {
      console.log(`  ${gen}: ${count}`);
    });

  // Find all listings with .1 or .2 suffixes
  console.log('\n🔍 Looking for generation variants that need normalization...');

  const { data: variantListings, error } = await supabase
    .from('listings')
    .select('id, generation, generation_code, model, trim')
    .or('generation.like.%.1,generation.like.%.2,generation_code.like.%.1,generation_code.like.%.2');

  if (error) {
    console.error('Error fetching variants:', error);
    return;
  }

  if (!variantListings || variantListings.length === 0) {
    console.log('✅ No generation variants found that need normalization');
    return;
  }

  console.log(`\nFound ${variantListings.length} listings with generation variants`);

  // Group by generation pattern
  const updateMap: Record<string, string[]> = {};

  variantListings.forEach(row => {
    if (row.generation?.includes('.')) {
      const base = row.generation.split('.')[0];
      if (!updateMap[`generation:${row.generation}→${base}`]) {
        updateMap[`generation:${row.generation}→${base}`] = [];
      }
      updateMap[`generation:${row.generation}→${base}`].push(row.id);
    }

    if (row.generation_code?.includes('.')) {
      const base = row.generation_code.split('.')[0];
      if (!updateMap[`generation_code:${row.generation_code}→${base}`]) {
        updateMap[`generation_code:${row.generation_code}→${base}`] = [];
      }
      updateMap[`generation_code:${row.generation_code}→${base}`].push(row.id);
    }
  });

  console.log('\nNormalization needed:');
  Object.entries(updateMap).forEach(([change, ids]) => {
    console.log(`  ${change}: ${ids.length} listings`);
  });

  // Ask for confirmation
  console.log('\n⚠️  This will normalize all generation codes by removing .1 and .2 suffixes');
  console.log('Examples: 996.2 → 996, 997.1 → 997, etc.');

  // Perform the updates
  console.log('\n🔧 Normalizing generations...');

  // Fix generation field
  const { error: genError, count: genCount } = await supabase
    .from('listings')
    .update({
      generation: supabase.sql`SPLIT_PART(generation, '.', 1)`
    })
    .like('generation', '%.%');

  if (genError) {
    console.error('Error updating generation:', genError);
  } else {
    console.log(`✅ Updated ${genCount || 0} listings with generation normalization`);
  }

  // Fix generation_code field
  const { error: codeError, count: codeCount } = await supabase
    .from('listings')
    .update({
      generation_code: supabase.sql`SPLIT_PART(generation_code, '.', 1)`
    })
    .like('generation_code', '%.%');

  if (codeError) {
    console.error('Error updating generation_code:', codeError);
  } else {
    console.log(`✅ Updated ${codeCount || 0} listings with generation_code normalization`);
  }

  // Verify the fix
  console.log('\n📊 Verifying normalization...');

  const { data: afterCheck } = await supabase
    .from('listings')
    .select('generation, generation_code')
    .eq('model', '911')
    .ilike('trim', '%GT3%')
    .not('generation', 'is', null);

  const afterCounts: Record<string, number> = {};
  afterCheck?.forEach(row => {
    const gen = row.generation || row.generation_code || 'unknown';
    afterCounts[gen] = (afterCounts[gen] || 0) + 1;
  });

  console.log('\nGT3 Generation Distribution After Fix:');
  Object.entries(afterCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .forEach(([gen, count]) => {
      console.log(`  ${gen}: ${count}`);
    });

  console.log('\n✅ Generation normalization complete!');
}

fixGenerations().catch(console.error);