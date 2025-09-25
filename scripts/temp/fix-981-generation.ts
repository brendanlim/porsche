import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix981Generation() {
  console.log('Fixing 2016 GT4 generation labels (982 -> 981)...\n');

  // Update all 2016 cars with 982 generation to 981
  const { data, error, count } = await supabase
    .from('listings')
    .update({ generation: '981' })
    .eq('year', 2016)
    .eq('generation', '982')
    .select('id');

  if (error) {
    console.error('Error updating:', error);
    return;
  }

  console.log(`✅ Fixed ${data?.length || 0} listings from 982 to 981 generation\n`);

  // Check results
  const { data: check } = await supabase
    .from('listings')
    .select('generation')
    .eq('year', 2016)
    .ilike('model', '%cayman%');

  if (check) {
    const counts = check.reduce((acc, item) => {
      const gen = item.generation || 'null';
      acc[gen] = (acc[gen] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('2016 Cayman generation distribution after fix:');
    Object.entries(counts).forEach(([gen, count]) => {
      console.log(`  ${gen}: ${count} cars`);
    });
  }
}

fix981Generation().catch(console.error);