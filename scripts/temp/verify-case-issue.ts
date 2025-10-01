import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCaseIssue() {
  console.log('=== Verifying Case Sensitivity Issue ===\n');

  // Check 996 GT3 with different case combinations
  console.log('1. Checking 996 GT3 with different cases:');

  // lowercase
  const { data: lowercase, count: lowerCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('model', '911')
    .eq('trim', 'gt3')
    .eq('generation', '996');

  console.log(`  trim="gt3" (lowercase): ${lowerCount} listings`);

  // uppercase
  const { data: uppercase, count: upperCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('generation', '996');

  console.log(`  trim="GT3" (uppercase): ${upperCount} listings`);

  // Check what the narrative update script would find
  console.log('\n2. What the narrative update script calculates for 996 GT3:');

  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // With lowercase (what the script uses)
  const { data: scriptData } = await supabase
    .from('listings')
    .select('price')
    .eq('model', '911')
    .eq('trim', 'gt3')  // lowercase - what script uses
    .eq('generation', '996')
    .not('sold_date', 'is', null)
    .gte('sold_date', oneYearAgo.toISOString());

  console.log(`  With trim="gt3" (lowercase): ${scriptData?.length || 0} sales in last year`);

  // With uppercase (what's actually in the database)
  const { data: actualData } = await supabase
    .from('listings')
    .select('price')
    .eq('model', '911')
    .eq('trim', 'GT3')  // uppercase - what's in DB
    .eq('generation', '996')
    .not('sold_date', 'is', null)
    .gte('sold_date', oneYearAgo.toISOString());

  console.log(`  With trim="GT3" (uppercase): ${actualData?.length || 0} sales in last year`);

  if (actualData && actualData.length > 0) {
    const avgPrice = actualData.reduce((sum, d) => sum + d.price, 0) / actualData.length;
    console.log(`    Average price: $${avgPrice.toLocaleString()}`);
  }

  // Check what's stored in market_narratives
  console.log('\n3. Checking market_narratives table:');
  const { data: narrative } = await supabase
    .from('market_narratives')
    .select('model, trim, generation, trends_data')
    .eq('model', '911')
    .eq('trim', 'gt3')  // lowercase
    .eq('generation', '996');

  if (narrative && narrative.length > 0) {
    console.log(`  Found narrative with trim="gt3": ${JSON.stringify(narrative[0].trends_data)}`);
  } else {
    console.log(`  No narrative found with lowercase trim="gt3"`);
  }

  // Check with uppercase
  const { data: narrativeUpper } = await supabase
    .from('market_narratives')
    .select('model, trim, generation, trends_data')
    .eq('model', '911')
    .eq('trim', 'GT3')  // uppercase
    .eq('generation', '996');

  if (narrativeUpper && narrativeUpper.length > 0) {
    console.log(`  Found narrative with trim="GT3": ${JSON.stringify(narrativeUpper[0].trends_data)}`);
  } else {
    console.log(`  No narrative found with uppercase trim="GT3"`);
  }

  // Check how narratives are generated vs how they're queried
  console.log('\n4. Understanding the mismatch:');
  console.log('  - update-market-narratives.ts saves with trim="gt3" (lowercase)');
  console.log('  - But the actual listings have trim="GT3" (uppercase)');
  console.log('  - So when calculating trends, it finds 0 sales (wrong case)');
  console.log('  - But the narrative might be using old/cached data or different logic');

  // Check if there are multiple case variations
  console.log('\n5. All unique trim values for GT3 models:');
  const { data: allTrims } = await supabase
    .from('listings')
    .select('trim')
    .eq('model', '911')
    .ilike('trim', '%gt3%')
    .not('trim', 'is', null);

  const uniqueTrims = new Set(allTrims?.map(t => t.trim));
  console.log(`  Unique GT3 trim values: ${Array.from(uniqueTrims).join(', ')}`);
}

verifyCaseIssue().catch(console.error);