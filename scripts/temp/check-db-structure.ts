import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  // First check total count
  const { count } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });

  console.log('Total listings:', count);

  // Get sample listing
  const { data: sample } = await supabase
    .from('listings')
    .select('*')
    .limit(1);

  if (sample && sample.length > 0) {
    console.log('\nSample listing columns:', Object.keys(sample[0]));
    console.log('\nSample data:', JSON.stringify(sample[0], null, 2));
  }

  // Count listings with VINs
  const { count: vinCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .not('vin', 'is', null);

  console.log('\nListings with VINs:', vinCount);

  // Count by model
  const { data: models, error } = await supabase
    .from('listings')
    .select('model')
    .not('vin', 'is', null)
    .not('model', 'is', null);

  if (models) {
    const modelCounts = {};
    for (const row of models) {
      const model = row.model;
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    }

    console.log('\nModel distribution:');
    const sorted = Object.entries(modelCounts).sort((a, b) => (b[1] as number) - (a[1] as number));
    for (const [model, count] of sorted.slice(0, 10)) {
      console.log(`  ${model}: ${count}`);
    }
  }
}

checkData().catch(console.error);