import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix981ModelNames() {
  console.log('Fixing 2016 GT4 model names (718 Cayman -> Cayman)...\n');
  console.log('Context:');
  console.log('  - 981 GT4 (2016) = "Cayman GT4" (no 718 prefix)');
  console.log('  - 982 GT4 (2020+) = "718 Cayman GT4"\n');

  // Update all 981 generation GT4s that have "718" in the model
  const { data, error } = await supabase
    .from('listings')
    .update({ model: 'Cayman' })
    .eq('generation', '981')
    .ilike('model', '%718%')
    .select('id');

  if (error) {
    console.error('Error updating:', error);
    return;
  }

  console.log(`✅ Fixed ${data?.length || 0} 981 GT4 listings from "718 Cayman" to "Cayman"\n`);

  // Verify the fix
  const { data: check981 } = await supabase
    .from('listings')
    .select('model')
    .eq('generation', '981')
    .ilike('trim', '%GT4%');

  if (check981) {
    const modelCounts = check981.reduce((acc, item) => {
      const model = item.model || 'null';
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('981 GT4 model distribution after fix:');
    Object.entries(modelCounts).forEach(([model, count]) => {
      const status = model.includes('718') ? '❌' : '✅';
      console.log(`  ${status} ${model}: ${count} cars`);
    });
  }

  // Also check 982 generation should have 718
  console.log('\nVerifying 982 GT4s have "718" prefix...');
  const { data: check982 } = await supabase
    .from('listings')
    .select('model')
    .eq('generation', '982')
    .ilike('trim', '%GT4%');

  if (check982) {
    const modelCounts = check982.reduce((acc, item) => {
      const model = item.model || 'null';
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n982 GT4 model distribution:');
    Object.entries(modelCounts).forEach(([model, count]) => {
      const status = model.includes('718') ? '✅' : '⚠️';
      console.log(`  ${status} ${model}: ${count} cars`);
    });
  }

  console.log('\n✅ Model name fix complete!');
  console.log('2016 GT4s should no longer appear in 718 GT4 analytics.');
}

fix981ModelNames().catch(console.error);