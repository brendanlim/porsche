import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function main() {
  console.log('\nChecking for GT4 RS listings in database...\n');
  
  // Check for GT4 RS listings
  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('model', '718 cayman')
    .eq('trim', 'GT4 RS')
    .order('scraped_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${listings?.length || 0} GT4 RS listings in database`);
  
  if (listings && listings.length > 0) {
    console.log('\nSample listings:');
    listings.slice(0, 5).forEach(l => {
      console.log(`  - Year: ${l.year || 'N/A'}, Price: $${l.price?.toLocaleString() || 'N/A'}, Mileage: ${l.mileage?.toLocaleString() || 'N/A'}, Color: ${l.exterior_color || 'N/A'}`);
      console.log(`    Scraped: ${l.scraped_at}, Source: ${l.source}`);
    });
    
    // Check price range
    const prices = listings.map(l => l.price).filter(p => p > 0);
    if (prices.length > 0) {
      console.log('\nPrice statistics:');
      console.log(`  - Min: $${Math.min(...prices).toLocaleString()}`);
      console.log(`  - Max: $${Math.max(...prices).toLocaleString()}`);
      console.log(`  - Avg: $${Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toLocaleString()}`);
    }
    
    // Check year distribution
    const years = listings.map(l => l.year).filter(y => y > 0);
    const yearCounts: Record<number, number> = {};
    years.forEach(y => {
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    });
    
    console.log('\nYear distribution:');
    Object.entries(yearCounts).sort(([a], [b]) => Number(b) - Number(a)).forEach(([year, count]) => {
      console.log(`  - ${year}: ${count} listings`);
    });
  }

  // Also check for any 718 cayman listings
  const { data: allCayman } = await supabaseAdmin
    .from('listings')
    .select('trim')
    .eq('model', '718 cayman');

  const trimCounts: Record<string, number> = {};
  allCayman?.forEach(l => {
    trimCounts[l.trim] = (trimCounts[l.trim] || 0) + 1;
  });

  console.log('\n718 Cayman trims in database:');
  Object.entries(trimCounts).sort(([,a], [,b]) => b - a).forEach(([trim, count]) => {
    console.log(`  - ${trim}: ${count} listings`);
  });
}

main().catch(console.error);