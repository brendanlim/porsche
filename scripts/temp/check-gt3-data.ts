import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGT3Data() {
  console.log('=== Checking GT3 Data and Narratives ===\n');

  // 1. Check what GT3 generations exist in the database
  console.log('1. GT3 data by generation:');
  const { data: gt3Data } = await supabase
    .from('listings')
    .select('generation, model, trim')
    .eq('model', '911')
    .ilike('trim', '%gt3%')
    .not('sold_date', 'is', null);

  const generationCounts = new Map<string, number>();
  gt3Data?.forEach(item => {
    const key = `${item.generation || 'NO_GEN'} - ${item.trim}`;
    generationCounts.set(key, (generationCounts.get(key) || 0) + 1);
  });

  console.log('\nGT3 listings by generation and trim:');
  Array.from(generationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([gen, count]) => {
      console.log(`  ${gen}: ${count} listings`);
    });

  // 2. Check what's in market_narratives
  console.log('\n2. Market narratives for GT3:');
  const { data: narratives } = await supabase
    .from('market_narratives')
    .select('model, trim, generation, summary, trends_data, updated_at')
    .eq('model', '911')
    .ilike('trim', '%gt3%');

  narratives?.forEach(n => {
    console.log(`\n  ${n.generation} ${n.model} ${n.trim}:`);
    console.log(`    Summary: ${n.summary}`);
    console.log(`    Trends: ${JSON.stringify(n.trends_data)}`);
    console.log(`    Updated: ${n.updated_at}`);
  });

  // 3. Check recent GT3 sales
  console.log('\n3. Recent GT3 sales (last 10):');
  const { data: recentSales } = await supabase
    .from('listings')
    .select('model, trim, generation, price, sold_date, year')
    .eq('model', '911')
    .ilike('trim', '%gt3%')
    .not('sold_date', 'is', null)
    .order('sold_date', { ascending: false })
    .limit(10);

  recentSales?.forEach(sale => {
    console.log(`  ${sale.sold_date}: ${sale.year} ${sale.generation || 'NO_GEN'} ${sale.trim} - $${sale.price?.toLocaleString()}`);
  });

  // 4. Check for 996 specifically
  console.log('\n4. Checking for 996 generation GT3 specifically:');
  const { data: gen996, count } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('model', '911')
    .eq('trim', 'gt3')
    .eq('generation', '996');

  console.log(`  Total 996 GT3 listings (including unsold): ${count}`);

  // Check with different trim variations
  console.log('\n5. Checking different GT3 trim variations:');
  const trimVariations = ['gt3', 'GT3', 'Gt3', 'GT3 RS', 'gt3 rs', 'GT3RS', 'gt3rs'];

  for (const trim of trimVariations) {
    const { count: trimCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('model', '911')
      .eq('trim', trim)
      .eq('generation', '996');

    if (trimCount && trimCount > 0) {
      console.log(`  996 with trim="${trim}": ${trimCount} listings`);
    }
  }

  // 6. Check what generations are stored for model=911 trim=gt3
  console.log('\n6. All generations for model=911 trim=gt3:');
  const { data: allGens } = await supabase
    .from('listings')
    .select('generation')
    .eq('model', '911')
    .eq('trim', 'gt3')
    .not('generation', 'is', null);

  const uniqueGens = new Set(allGens?.map(g => g.generation));
  console.log(`  Unique generations: ${Array.from(uniqueGens).join(', ')}`);
}

checkGT3Data().catch(console.error);