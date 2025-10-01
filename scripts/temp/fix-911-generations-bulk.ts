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

async function fixGenerationsBulk() {
  console.log('🔧 Fixing 911 generation values (BULK UPDATE)');
  console.log('━'.repeat(80));

  // Define generation mapping rules
  const generationRules = [
    { minYear: 2024, maxYear: 2030, generation: '992.2' },
    { minYear: 2019, maxYear: 2023, generation: '992.1' },
    { minYear: 2016, maxYear: 2018, generation: '991.2' },
    { minYear: 2012, maxYear: 2015, generation: '991.1' },
    { minYear: 2009, maxYear: 2011, generation: '997.2' },
    { minYear: 2005, maxYear: 2008, generation: '997.1' },
    { minYear: 1999, maxYear: 2004, generation: '996' },
    { minYear: 1994, maxYear: 1998, generation: '993' },
    { minYear: 1989, maxYear: 1993, generation: '964' },
  ];

  let totalUpdated = 0;

  // Update each generation group
  for (const rule of generationRules) {
    console.log(`\n📊 Updating ${rule.generation} (${rule.minYear}-${rule.maxYear})...`);

    const { data: listings, error: fetchError } = await supabase
      .from('listings')
      .select('id')
      .ilike('model', '911')
      .gte('year', rule.minYear)
      .lte('year', rule.maxYear)
      .neq('generation', rule.generation);

    if (fetchError) {
      console.error(`  ❌ Error fetching: ${fetchError.message}`);
      continue;
    }

    if (!listings || listings.length === 0) {
      console.log(`  ✅ Already up to date`);
      continue;
    }

    console.log(`  📝 Found ${listings.length} listings to update`);

    // Bulk update using RPC or batch updates
    const ids = listings.map(l => l.id);

    // Update in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);

      const { error: updateError } = await supabase
        .from('listings')
        .update({ generation: rule.generation })
        .in('id', chunk);

      if (updateError) {
        console.error(`  ❌ Error updating chunk: ${updateError.message}`);
      } else {
        totalUpdated += chunk.length;
        console.log(`  ✅ Updated ${Math.min(i + chunkSize, ids.length)}/${ids.length}`);
      }
    }
  }

  // Verify the updates
  console.log('\n\n🔍 Verifying updates...');

  const { data: verifyData, error: verifyError } = await supabase
    .from('listings')
    .select('generation, year')
    .ilike('model', '911')
    .gte('year', 2012);

  if (verifyData && !verifyError) {
    const genCounts: Record<string, number> = {};
    verifyData.forEach(l => {
      const gen = l.generation || 'NULL';
      genCounts[gen] = (genCounts[gen] || 0) + 1;
    });

    console.log('\n📊 Final generation distribution (2012+):');
    Object.entries(genCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([gen, count]) => {
        console.log(`  ${gen}: ${count} listings`);
      });
  }

  console.log('\n' + '━'.repeat(80));
  console.log(`✅ Bulk update complete! Updated ${totalUpdated} listings.`);
}

// Run the fix
fixGenerationsBulk()
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });