import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGenerations() {
  console.log('=== Checking 996 GT3 Generation Codes ===\n');

  // Check all generation values for 996-era GT3s
  const { data: gt3s } = await supabase
    .from('listings')
    .select('generation, year, price, sold_date')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .gte('year', 1999)
    .lte('year', 2005)  // 996 production years
    .not('sold_date', 'is', null)
    .order('sold_date', { ascending: false });

  // Group by generation
  const generationMap = new Map<string, number>();
  gt3s?.forEach(car => {
    const gen = car.generation || 'NO_GENERATION';
    generationMap.set(gen, (generationMap.get(gen) || 0) + 1);
  });

  console.log('Generation codes found for 996-era GT3s (1999-2005):');
  Array.from(generationMap.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([gen, count]) => {
      console.log(`  "${gen}": ${count} listings`);
    });

  // Check specifically for different 996 variations
  console.log('\nChecking specific 996 variations:');
  const variations = ['996', '996.1', '996.2'];

  for (const gen of variations) {
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('model', '911')
      .eq('trim', 'GT3')
      .eq('generation', gen);

    console.log(`  generation="${gen}": ${count} total listings`);

    // Check with sold_date filter
    const { count: soldCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('model', '911')
      .eq('trim', 'GT3')
      .eq('generation', gen)
      .not('sold_date', 'is', null);

    console.log(`    with sold_date: ${soldCount} sold listings`);
  }

  // Check what the narrative table has
  console.log('\nMarket narratives for 996 variations:');
  const { data: narratives } = await supabase
    .from('market_narratives')
    .select('generation, trends_data, summary')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .or('generation.eq.996,generation.eq.996.1,generation.eq.996.2');

  narratives?.forEach(n => {
    console.log(`\n  generation="${n.generation}":`);
    console.log(`    Summary: ${n.summary}`);
    console.log(`    Trends: ${JSON.stringify(n.trends_data)}`);
  });

  // Show some recent 996-era GT3 sales with their generation codes
  console.log('\nRecent 996-era GT3 sales with generation codes:');
  const recentSales = gt3s?.slice(0, 10);
  recentSales?.forEach(sale => {
    console.log(`  ${sale.sold_date}: Year ${sale.year}, Gen="${sale.generation || 'NULL'}" - $${sale.price?.toLocaleString()}`);
  });
}

checkGenerations().catch(console.error);