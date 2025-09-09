import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function main() {
  console.log('\nChecking ALL listings in database...\n');
  
  // Get total count
  const { count: totalCount } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total listings in database: ${totalCount || 0}`);
  
  // Check 911 GT3 specifically
  const { data: gt3Listings, error: gt3Error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .order('scraped_at', { ascending: false });

  if (gt3Error) {
    console.error('Error fetching GT3:', gt3Error);
  } else {
    console.log(`\n911 GT3 listings: ${gt3Listings?.length || 0}`);
    if (gt3Listings && gt3Listings.length > 0) {
      console.log('Sample GT3 listings:');
      gt3Listings.slice(0, 3).forEach(l => {
        console.log(`  - Year: ${l.year || 'N/A'}, Price: $${l.price?.toLocaleString() || 'N/A'}, Mileage: ${l.mileage?.toLocaleString() || 'N/A'}`);
      });
    }
  }
  
  // Get all unique model/trim combinations
  const { data: allListings } = await supabaseAdmin
    .from('listings')
    .select('model, trim');
  
  const modelTrimCounts: Record<string, number> = {};
  allListings?.forEach(l => {
    const key = `${l.model} - ${l.trim}`;
    modelTrimCounts[key] = (modelTrimCounts[key] || 0) + 1;
  });
  
  console.log('\nTop model/trim combinations:');
  Object.entries(modelTrimCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15)
    .forEach(([key, count]) => {
      console.log(`  ${key}: ${count} listings`);
    });
  
  // Check sources
  const { data: sources } = await supabaseAdmin
    .from('listings')
    .select('source');
  
  const sourceCounts: Record<string, number> = {};
  sources?.forEach(s => {
    sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
  });
  
  console.log('\nListings by source:');
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`  ${source}: ${count} listings`);
  });
}

main().catch(console.error);