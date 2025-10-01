import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data: allSales } = await supabase
    .from('listings')
    .select('price, sold_date, year, vin')
    .eq('model', '911')
    .ilike('trim', 'GT3')
    .eq('generation', '996')
    .not('sold_date', 'is', null)
    .order('sold_date', { ascending: false })
    .limit(50);

  console.log('ALL 996 GT3 sales (most recent first):');
  allSales?.forEach(s => {
    const date = new Date(s.sold_date);
    const monthsAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
    console.log(`${s.sold_date} (${monthsAgo.toFixed(1)} months ago): $${s.price.toLocaleString()} - ${s.year}`);
  });

  console.log('\nTotal sales:', allSales?.length);
}

check().catch(console.error);
