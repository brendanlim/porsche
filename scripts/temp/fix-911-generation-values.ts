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

async function fixGenerations() {
  console.log('🔧 Fixing 911 generation values in database');
  console.log('━'.repeat(80));

  // First, backup the database
  console.log('\n⚠️  IMPORTANT: Make sure you have a database backup!');
  console.log('   Run: npx tsx scripts/backup/backup-database.ts');
  console.log('   Press Ctrl+C now if you need to backup first.\n');

  // Query all 911 listings
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, year, model, trim, generation')
    .ilike('model', '911')
    .order('year', { ascending: false });

  if (error || !listings) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`\n📊 Found ${listings.length} 911 listings to check`);

  const updates: Array<{ id: string; oldGen: string | null; newGen: string }> = [];

  // Process each listing
  listings.forEach(listing => {
    const year = listing.year;
    let correctGeneration: string | null = null;

    // 911 generation mapping
    if (year >= 2024) {
      correctGeneration = '992.2';
    } else if (year >= 2019) {
      correctGeneration = '992.1';
    } else if (year >= 2016) {
      correctGeneration = '991.2';
    } else if (year >= 2012) {
      correctGeneration = '991.1';
    } else if (year >= 2009) {
      correctGeneration = '997.2';
    } else if (year >= 2005) {
      correctGeneration = '997.1';
    } else if (year >= 1999) {
      correctGeneration = '996';
    } else if (year >= 1994) {
      correctGeneration = '993';
    } else if (year >= 1989) {
      correctGeneration = '964';
    } else if (year >= 1984) {
      correctGeneration = '3.2 Carrera';
    } else if (year >= 1978) {
      correctGeneration = 'SC';
    }

    // Check if update is needed
    if (correctGeneration && listing.generation !== correctGeneration) {
      updates.push({
        id: listing.id,
        oldGen: listing.generation,
        newGen: correctGeneration
      });
    }
  });

  if (updates.length === 0) {
    console.log('\n✅ All generation values are already correct!');
    return;
  }

  console.log(`\n📝 Need to update ${updates.length} listings`);

  // Show breakdown of updates
  const updateBreakdown: Record<string, number> = {};
  updates.forEach(u => {
    const key = `${u.oldGen || 'NULL'} → ${u.newGen}`;
    updateBreakdown[key] = (updateBreakdown[key] || 0) + 1;
  });

  console.log('\n📊 Update breakdown:');
  Object.entries(updateBreakdown)
    .sort(([, a], [, b]) => b - a)
    .forEach(([change, count]) => {
      console.log(`  ${change}: ${count} listings`);
    });

  // Perform updates in batches
  console.log('\n🔄 Updating database...');
  const batchSize = 100;
  let updatedCount = 0;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    // Update each item in the batch
    for (const update of batch) {
      const { error: updateError } = await supabase
        .from('listings')
        .update({ generation: update.newGen })
        .eq('id', update.id);

      if (updateError) {
        console.error(`  ❌ Failed to update ID ${update.id}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }

    console.log(`  ✅ Updated ${updatedCount}/${updates.length} listings...`);
  }

  // Verify the updates
  console.log('\n🔍 Verifying updates...');

  // Check 991 specifically
  const { data: gen991, error: gen991Error } = await supabase
    .from('listings')
    .select('generation')
    .ilike('model', '911')
    .gte('year', 2012)
    .lte('year', 2018);

  if (gen991 && !gen991Error) {
    const gen991Counts = gen991.reduce((acc: any, l) => {
      acc[l.generation || 'NULL'] = (acc[l.generation || 'NULL'] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 991 Generation Distribution (2012-2018):');
    Object.entries(gen991Counts).forEach(([gen, count]) => {
      console.log(`  ${gen}: ${count} listings`);
    });
  }

  // Check 992 specifically
  const { data: gen992, error: gen992Error } = await supabase
    .from('listings')
    .select('generation')
    .ilike('model', '911')
    .gte('year', 2019);

  if (gen992 && !gen992Error) {
    const gen992Counts = gen992.reduce((acc: any, l) => {
      acc[l.generation || 'NULL'] = (acc[l.generation || 'NULL'] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 992 Generation Distribution (2019+):');
    Object.entries(gen992Counts).forEach(([gen, count]) => {
      console.log(`  ${gen}: ${count} listings`);
    });
  }

  console.log('\n' + '━'.repeat(80));
  console.log(`✅ Update complete! Updated ${updatedCount} listings.`);
}

// Run the fix
fixGenerations()
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });