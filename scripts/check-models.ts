import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function checkModels() {
  const { data } = await supabaseAdmin
    .from('listings')
    .select('title, model, trim, source')
    .limit(15);
  
  console.log('Sample listings showing model/trim parsing:');
  console.log('='.repeat(60));
  data?.forEach(row => {
    console.log(`Title: ${row.title}`);
    console.log(`  Model: ${row.model || 'NULL'}`);
    console.log(`  Trim: ${row.trim || 'NULL'}`);
    console.log(`  Source: ${row.source}`);
    console.log('');
  });
}

checkModels().catch(console.error);