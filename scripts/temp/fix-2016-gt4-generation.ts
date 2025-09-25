import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix2016GT4Generation() {
  console.log('Fixing 2016 GT4 generation labels...\n');
  console.log('Context: 2016 GT4 is 981 generation, not 982');
  console.log('982 GT4 started in 2020\n');

  // Find all 2016 GT4s with wrong generation
  const { data: wrongGeneration, error: fetchError } = await supabase
    .from('listings')
    .select('id, year, model, trim, generation')
    .eq('year', 2016)
    .or('trim.ilike.%GT4%,model.ilike.%GT4%')
    .or('generation.eq.982,generation.eq.982.1');

  if (fetchError) {
    console.error('Error fetching listings:', fetchError);
    return;
  }

  console.log(`Found ${wrongGeneration?.length || 0} 2016 GT4s with incorrect 982 generation\n`);

  if (!wrongGeneration || wrongGeneration.length === 0) {
    console.log('No incorrect listings found');
    return;
  }

  // Update them to correct 981 generation
  const { data: updateResult, error: updateError } = await supabase
    .from('listings')
    .update({ generation: '981' })
    .eq('year', 2016)
    .or('trim.ilike.%GT4%,model.ilike.%GT4%')
    .or('generation.eq.982,generation.eq.982.1')
    .select('id');

  if (updateError) {
    console.error('Error updating listings:', updateError);
    return;
  }

  console.log(`✅ Successfully updated ${updateResult?.length || 0} listings to 981 generation\n`);

  // Verify the fix
  const { data: verification, error: verifyError } = await supabase
    .from('listings')
    .select('generation')
    .eq('year', 2016)
    .or('trim.ilike.%GT4%,model.ilike.%GT4%');

  if (!verifyError && verification) {
    const generations = verification.reduce((acc, item) => {
      acc[item.generation || 'null'] = (acc[item.generation || 'null'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Verification - 2016 GT4 generation distribution:');
    Object.entries(generations).forEach(([gen, count]) => {
      const status = gen === '981' ? '✅' : '⚠️';
      console.log(`  ${status} ${gen}: ${count} listings`);
    });
  }

  // Also check if there are any other years incorrectly labeled
  console.log('\n\nChecking for other generation issues...\n');

  // 981 GT4 should only be 2016
  const { data: wrong981, error: error981 } = await supabase
    .from('listings')
    .select('year, count')
    .eq('generation', '981')
    .or('trim.ilike.%GT4%,model.ilike.%GT4%')
    .neq('year', 2016);

  if (wrong981 && wrong981.length > 0) {
    console.log('⚠️ Found 981 GT4s with wrong year (should only be 2016):');
    wrong981.forEach(item => {
      console.log(`  Year ${item.year}: ${item.count} listings`);
    });
  }

  // 982 GT4 should only be 2020+
  const { data: wrong982, error: error982 } = await supabase
    .from('listings')
    .select('year, id')
    .or('generation.eq.982,generation.eq.982.1')
    .or('trim.ilike.%GT4%,model.ilike.%GT4%')
    .lt('year', 2020);

  if (wrong982 && wrong982.length > 0) {
    console.log(`\n⚠️ Found ${wrong982.length} 982 GT4s before 2020 (should be 2020+)`);
    const yearCounts = wrong982.reduce((acc, item) => {
      acc[item.year || 'null'] = (acc[item.year || 'null'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(yearCounts).forEach(([year, count]) => {
      console.log(`  Year ${year}: ${count} listings`);
    });
  }

  console.log('\n✅ Generation fix complete!');
}

fix2016GT4Generation().catch(console.error);