import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check718ModelIssue() {
  console.log('Investigating why 2016 GT4 appears in 718 GT4 analytics...\n');

  // Check 2016 GT4s and their model field
  const { data: gt4s_2016, error } = await supabase
    .from('listings')
    .select('id, vin, year, model, trim, generation')
    .eq('year', 2016)
    .ilike('trim', '%GT4%');

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${gt4s_2016?.length || 0} 2016 GT4 listings\n`);

  // Count by model
  const modelCounts: Record<string, number> = {};
  const problemListings: any[] = [];

  gt4s_2016?.forEach(listing => {
    const model = listing.model || 'null';
    modelCounts[model] = (modelCounts[model] || 0) + 1;

    // Check if incorrectly labeled as 718
    if (model.includes('718')) {
      problemListings.push(listing);
    }
  });

  console.log('Model distribution for 2016 GT4s:');
  Object.entries(modelCounts).forEach(([model, count]) => {
    const status = model.includes('718') ? '❌' : '✅';
    console.log(`  ${status} ${model}: ${count} listings`);
  });

  if (problemListings.length > 0) {
    console.log(`\n❌ PROBLEM: Found ${problemListings.length} 2016 GT4s incorrectly labeled as "718 Cayman"`);
    console.log('The 2016 GT4 is a 981 Cayman GT4, not a 718 Cayman GT4!');
    console.log('\nCorrect labeling:');
    console.log('  - 2016 GT4 → "Cayman" (981 generation)');
    console.log('  - 2020+ GT4 → "718 Cayman" (982 generation)');

    console.log('\nSample of incorrect listings:');
    problemListings.slice(0, 5).forEach(listing => {
      console.log(`  ID: ${listing.id}`);
      console.log(`  Model: ${listing.model} (should be "Cayman")`)
      console.log(`  Generation: ${listing.generation}`);
      console.log(`  VIN: ${listing.vin}`);
      console.log('  ---');
    });

    console.log(`\n🔧 FIX NEEDED: Update model from "718 Cayman" to "Cayman" for all 2016 GT4s`);
  } else {
    console.log('\n✅ All 2016 GT4s are correctly labeled as "Cayman" (not 718)');
  }

  // Also check if any 718s exist before 2020
  console.log('\n\nChecking for any 718 models before 2020...');

  const { data: early718s } = await supabase
    .from('listings')
    .select('year, model, trim, generation, count')
    .ilike('model', '%718%')
    .lt('year', 2020)
    .ilike('trim', '%GT4%');

  if (early718s && early718s.length > 0) {
    const yearGroups: Record<number, number> = {};
    early718s.forEach(item => {
      yearGroups[item.year || 0] = (yearGroups[item.year || 0] || 0) + 1;
    });

    console.log('\n❌ Found 718 GT4s before 2020:');
    Object.entries(yearGroups).forEach(([year, count]) => {
      console.log(`  Year ${year}: ${count} listings`);
    });
    console.log('\n718 GT4 only exists from 2020 onwards!');
  }
}

check718ModelIssue().catch(console.error);