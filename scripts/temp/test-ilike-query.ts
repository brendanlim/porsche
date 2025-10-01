import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log('=== Testing ilike query for GT3 ===\n');

  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  // Test with exact match (what was in the DB before)
  console.log('1. With .eq("trim", "GT3"):');
  const { data: exactMatch, count: exactCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('generation', '996')
    .not('sold_date', 'is', null)
    .gte('sold_date', oneYearAgo.toISOString());

  console.log(`  Found: ${exactCount} sales in last year`);

  // Test with ilike (case insensitive)
  console.log('\n2. With .ilike("trim", "GT3"):');
  const { data: ilikeMatch, count: ilikeCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('model', '911')
    .ilike('trim', 'GT3')
    .eq('generation', '996')
    .not('sold_date', 'is', null)
    .gte('sold_date', oneYearAgo.toISOString());

  console.log(`  Found: ${ilikeCount} sales in last year`);

  // Check what the update script is getting
  console.log('\n3. Simulating update script getModelsWithSufficientData:');
  const { data: rawData } = await supabase
    .from('listings')
    .select('model, trim, generation')
    .not('sold_date', 'is', null)
    .not('generation', 'is', null)
    .eq('model', '911')
    .ilike('trim', '%gt3%')
    .eq('generation', '996');

  const uniqueCombos = new Set<string>();
  rawData?.forEach(item => {
    uniqueCombos.add(`${item.model}|${item.trim}|${item.generation}`);
  });

  console.log('  Unique model/trim/generation combos found:');
  Array.from(uniqueCombos).forEach(combo => {
    console.log(`    ${combo}`);
  });

  // The problem might be in how the narrative is stored vs queried
  console.log('\n4. Checking narrative storage:');
  const { data: narratives } = await supabase
    .from('market_narratives')
    .select('model, trim, generation')
    .eq('model', '911')
    .ilike('trim', '%gt3%')
    .eq('generation', '996');

  console.log('  Narratives found:');
  narratives?.forEach(n => {
    console.log(`    model="${n.model}", trim="${n.trim}", generation="${n.generation}"`);
  });
}

testQuery().catch(console.error);