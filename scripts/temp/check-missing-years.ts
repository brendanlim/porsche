import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkMissingYears() {
  console.log('===========================================');
  console.log('         GT4 RS YEAR DISTRIBUTION');
  console.log('===========================================\n');

  // Check GT4 RS
  const { data: gt4rsData } = await supabase
    .from('listings')
    .select('year, model, trim, price, generation, source')
    .or('trim.ilike.%gt4%rs%,trim.ilike.%gt4-rs%,trim.ilike.%gt4 rs%')
    .order('year', { ascending: true });

  const gt4rsByYear: Record<number, number> = {};
  gt4rsData?.forEach(listing => {
    if (listing.year) {
      gt4rsByYear[listing.year] = (gt4rsByYear[listing.year] || 0) + 1;
    }
  });

  console.log('GT4 RS by Year:');
  Object.entries(gt4rsByYear).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([year, count]) => {
    console.log(`  ${year}: ${count} listings`);
  });

  if (!gt4rsByYear[2022]) {
    console.log('\n❌ MISSING: 2022 GT4 RS (first model year!)');
  }

  console.log(`\nTotal GT4 RS: ${gt4rsData?.length || 0} listings`);

  console.log('\n===========================================');
  console.log('       996 GT3 YEAR DISTRIBUTION');
  console.log('===========================================\n');

  // Check 996 GT3
  const { data: gt3Data } = await supabase
    .from('listings')
    .select('year, model, trim, generation, price, source')
    .ilike('trim', '%GT3%')
    .or('generation.eq.996,generation.eq.996.1,generation.eq.996.2')
    .order('year', { ascending: true });

  const gt3ByYear: Record<number, number> = {};
  const generationByYear: Record<number, Set<string>> = {};

  gt3Data?.forEach(listing => {
    if (listing.year) {
      gt3ByYear[listing.year] = (gt3ByYear[listing.year] || 0) + 1;
      if (!generationByYear[listing.year]) {
        generationByYear[listing.year] = new Set();
      }
      if (listing.generation) {
        generationByYear[listing.year].add(listing.generation);
      }
    }
  });

  console.log('996 GT3 by Year:');
  Object.entries(gt3ByYear).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([year, count]) => {
    const gens = generationByYear[Number(year)] ? Array.from(generationByYear[Number(year)]).join(', ') : 'N/A';
    console.log(`  ${year}: ${count} listings (Generation: ${gens})`);
  });

  // 996 GT3 was produced from 1999-2005 (996.1: 1999-2001, 996.2: 2002-2005)
  console.log('\nExpected 996 GT3 years: 1999-2005');
  console.log('  • 996.1 GT3: 1999-2001');
  console.log('  • 996.2 GT3: 2002-2005 (including GT3 RS in 2004)');

  const missing996Years = [];
  for (let year = 1999; year <= 2005; year++) {
    if (!gt3ByYear[year]) {
      missing996Years.push(year);
    }
  }

  if (missing996Years.length > 0) {
    console.log(`\n❌ MISSING 996 GT3 years: ${missing996Years.join(', ')}`);
  }

  console.log(`\nTotal 996 generation GT3: ${gt3Data?.length || 0} listings`);

  // Also check all GT3s to see distribution
  console.log('\n===========================================');
  console.log('       ALL GT3 DISTRIBUTION');
  console.log('===========================================\n');

  const { data: allGT3 } = await supabase
    .from('listings')
    .select('year, generation')
    .ilike('trim', '%GT3%')
    .not('generation', 'is', null)
    .order('year', { ascending: true });

  const gt3GenerationCount: Record<string, number> = {};
  allGT3?.forEach(listing => {
    if (listing.generation) {
      gt3GenerationCount[listing.generation] = (gt3GenerationCount[listing.generation] || 0) + 1;
    }
  });

  console.log('GT3 by Generation:');
  Object.entries(gt3GenerationCount).sort().forEach(([gen, count]) => {
    console.log(`  ${gen}: ${count} listings`);
  });

  // Check if we're missing entire generations
  const expectedGenerations = ['996', '996.1', '996.2', '997.1', '997.2', '991.1', '991.2', '992.1'];
  const missingGens = expectedGenerations.filter(gen => !gt3GenerationCount[gen] && !gt3GenerationCount[gen.split('.')[0]]);

  if (missingGens.length > 0) {
    console.log(`\n⚠️  Generations with no GT3 data: ${missingGens.join(', ')}`);
  }
}

checkMissingYears().catch(console.error);