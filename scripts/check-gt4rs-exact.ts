import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function main() {
  // Check exact model/trim values for GT4 RS
  const { data } = await supabaseAdmin
    .from('listings')
    .select('model, trim, year, price')
    .ilike('trim', '%GT4%RS%');
  
  console.log(`Found ${data?.length || 0} GT4 RS listings`);
  console.log('\nExact model/trim values:');
  data?.forEach(l => {
    console.log(`  Model: '${l.model}', Trim: '${l.trim}', Year: ${l.year}, Price: $${l.price?.toLocaleString()}`);
  });
  
  // Check what the API is searching for
  console.log('\nAPI searches for:');
  console.log("  Model: '718 cayman' (from URL: 718-cayman)");
  console.log("  Trim: 'GT4 RS' (from URL: gt4-rs)");
}

main().catch(console.error);