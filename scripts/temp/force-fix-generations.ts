#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceNormalize() {
  console.log('🔧 Force normalizing all generation codes...\n');

  // Map of what to change
  const updates = [
    { from: '991.1', to: '991' },
    { from: '991.2', to: '991' },
    { from: '992.1', to: '992' },
    { from: '992.2', to: '992' },
    { from: '996.1', to: '996' },
    { from: '996.2', to: '996' },
    { from: '997.1', to: '997' },
    { from: '997.2', to: '997' },
    { from: '987.1', to: '987' },
    { from: '987.2', to: '987' },
    { from: '981.1', to: '981' },
    { from: '981.2', to: '981' },
    { from: '982.1', to: '982' },
    { from: '982.2', to: '982' },
    { from: '986.1', to: '986' },
    { from: '986.2', to: '986' },
    { from: '3.2 Carrera', to: '3' }
  ];

  let totalUpdated = 0;

  for (const update of updates) {
    const { error, count } = await supabase
      .from('listings')
      .update({ generation: update.to })
      .eq('generation', update.from);

    if (error) {
      console.error(`Error updating ${update.from}:`, error.message);
    } else if (count && count > 0) {
      console.log(`✅ Updated ${count} listings: ${update.from} → ${update.to}`);
      totalUpdated += count;
    }
  }

  console.log(`\n📊 Total updated: ${totalUpdated} listings`);

  // Check result for any remaining dots
  const { data: check } = await supabase
    .from('listings')
    .select('generation')
    .like('generation', '%.%');

  if (check && check.length > 0) {
    console.log(`\n⚠️  Still have ${check.length} listings with dots:`);
    const counts: Record<string, number> = {};
    check.forEach(row => {
      counts[row.generation] = (counts[row.generation] || 0) + 1;
    });
    Object.entries(counts).forEach(([gen, count]) => {
      console.log(`   ${gen}: ${count}`);
    });
  } else {
    console.log('\n✅ All generation codes normalized!');
  }

  // Show final GT3 distribution
  const { data: gt3s } = await supabase
    .from('listings')
    .select('generation')
    .eq('model', '911')
    .ilike('trim', '%GT3%')
    .not('generation', 'is', null);

  const genCounts: Record<string, number> = {};
  gt3s?.forEach(row => {
    genCounts[row.generation] = (genCounts[row.generation] || 0) + 1;
  });

  console.log('\n📊 Final 911 GT3 Generation Distribution:');
  Object.entries(genCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .forEach(([gen, count]) => {
      console.log(`  ${gen}: ${count}`);
    });
}

forceNormalize().catch(console.error);