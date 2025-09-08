import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function check() {
  // Count listings by source
  const { data: counts } = await supabaseAdmin
    .from('listings')
    .select('source')
    .order('scraped_at', { ascending: false })
    .limit(100);
  
  const sourceCounts: Record<string, number> = {};
  counts?.forEach(l => {
    sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1;
  });
  
  console.log('Recent listings by source:');
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}`);
  });
  
  // Check most recent listings
  const { data: recent } = await supabaseAdmin
    .from('listings')
    .select('source, model, trim, price, scraped_at')
    .order('scraped_at', { ascending: false })
    .limit(5);
  
  console.log('\nMost recent listings:');
  recent?.forEach(l => {
    const date = new Date(l.scraped_at).toLocaleString();
    console.log(`  [${l.source}] ${l.model} ${l.trim || ''}: $${l.price?.toLocaleString()} - ${date}`);
  });
  
  // Total count
  const { count } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nTotal listings in database: ${count}`);
  
  // Count by model
  const { data: models } = await supabaseAdmin
    .from('listings')
    .select('model');
  
  const modelCounts: Record<string, number> = {};
  models?.forEach(l => {
    if (l.model) {
      modelCounts[l.model] = (modelCounts[l.model] || 0) + 1;
    }
  });
  
  console.log('\nListings by model:');
  Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([model, count]) => {
      console.log(`  ${model}: ${count}`);
    });
}

check().catch(console.error);