import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function checkSchema() {
  const { data } = await supabaseAdmin
    .from('listings')
    .select('*')
    .limit(1);
  
  if (data && data.length > 0) {
    console.log('Listing columns:', Object.keys(data[0]).join(', '));
    console.log('\nSample data:');
    console.log('  Title:', data[0].title);
    console.log('  Price:', data[0].price);
    console.log('  Source:', data[0].source);
  } else {
    console.log('No listings found');
  }
}

checkSchema().catch(console.error);