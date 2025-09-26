import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing market narrative setup...');

  // Check if table exists
  const { data: tableCheck, error: tableError } = await supabase
    .from('market_narratives')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('❌ Error accessing market_narratives table:', tableError.message);
    process.exit(1);
  }

  console.log('✅ Market narratives table exists and is accessible');

  // Check for models with sufficient data
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('model, trim')
    .not('sold_date', 'is', null)
    .in('model', ['911', '718', 'cayman', 'boxster'])
    .limit(100);

  if (listingsError) {
    console.error('❌ Error checking listings:', listingsError.message);
    process.exit(1);
  }

  // Count occurrences
  const counts = new Map<string, number>();
  listings?.forEach(item => {
    const key = `${item.model}_${item.trim || 'base'}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  console.log(`✅ Found ${listings?.length || 0} listings to analyze`);
  console.log(`✅ Unique model/trim combinations: ${counts.size}`);

  // Show top combinations
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  console.log('\nTop model/trim combinations:');
  sorted.slice(0, 5).forEach(([key, count]) => {
    const [model, trim] = key.split('_');
    console.log(`  - ${model} ${trim}: ${count} listings`);
  });

  console.log('\n✅ Setup verification complete!');
}

test().catch(console.error);