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
    .select('generation')
    .eq('model', '911')
    .ilike('trim', '%GT3%')
    .not('generation', 'is', null);

  const genCounts: Record<string, number> = {};
  generations?.forEach(row => {
    const gen = row.generation || 'unknown';
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
    .select('id, generation, model, trim')
    .like('generation', '%.%');

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
      if (!updateMap[`${row.generation}→${base}`]) {
        updateMap[`${row.generation}→${base}`] = [];
      }
      updateMap[`${row.generation}→${base}`].push(row.id);
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

  // Fix generation field by removing .1 and .2 suffixes
  let totalUpdated = 0;

  // Update each variant type separately, in batches to avoid URI too large errors
  for (const [change, ids] of Object.entries(updateMap)) {
    const [oldGen, newGen] = change.split('→');

    // Process in batches of 100
    const batchSize = 100;
    let batchCount = 0;

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);

      const { error, count } = await supabase
        .from('listings')
        .update({ generation: newGen })
        .in('id', batch);

      if (error) {
        console.error(`Error updating batch for ${oldGen}→${newGen}:`, error.message);
      } else {
        batchCount += count || 0;
      }
    }

    console.log(`✅ Updated ${batchCount} listings: ${oldGen} → ${newGen}`);
    totalUpdated += batchCount;
  }

  console.log(`\n✅ Total: Updated ${totalUpdated} listings with generation normalization`);

  // Verify the fix
  console.log('\n📊 Verifying normalization...');

  const { data: afterCheck } = await supabase
    .from('listings')
    .select('generation')
    .eq('model', '911')
    .ilike('trim', '%GT3%')
    .not('generation', 'is', null);

  const afterCounts: Record<string, number> = {};
  afterCheck?.forEach(row => {
    const gen = row.generation || 'unknown';
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