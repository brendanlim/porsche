#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check996GT3s() {
  console.log('🔍 Checking for 996 GT3s in database...\n');

  // Query for 996 GT3s
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, year, model, trim, generation, price, mileage, sold_date, source, source_url')
    .eq('model', '911')
    .in('generation', ['996', '996.1', '996.2'])
    .ilike('trim', '%GT3%')
    .order('sold_date', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error querying database:', error);
    return;
  }

  console.log(`Found ${listings?.length || 0} 996 GT3s:\n`);

  if (listings && listings.length > 0) {
    // Group by generation
    const by996_1 = listings.filter(l => l.generation === '996' || l.generation === '996.1');
    const by996_2 = listings.filter(l => l.generation === '996.2');

    console.log(`996.1 GT3s: ${by996_1.length}`);
    console.log(`996.2 GT3s: ${by996_2.length}`);
    console.log('');

    // Show recent listings
    console.log('Recent 996 GT3 listings:');
    listings.slice(0, 10).forEach(listing => {
      const soldInfo = listing.sold_date ? `SOLD ${listing.sold_date.slice(0, 10)}` : 'FOR SALE';
      const vinLast8 = listing.vin ? listing.vin.slice(-8) : 'NO VIN';
      console.log(`  ${listing.year} GT3 (${listing.generation}) - ${vinLast8} - $${listing.price?.toLocaleString() || 'N/A'} - ${listing.mileage?.toLocaleString() || '?'}mi - ${soldInfo} [${listing.source}]`);
    });
  }

  // Also check for any potential misclassified GT3s
  console.log('\n🔍 Checking for potential misclassified GT3s (by VIN pattern)...\n');

  const { data: vinPatterns, error: vinError } = await supabase
    .from('listings')
    .select('id, vin, year, model, trim, generation')
    .eq('model', '911')
    .not('vin', 'is', null)
    .in('year', [1999, 2000, 2001, 2002, 2003, 2004, 2005])
    .limit(500);

  if (!vinError && vinPatterns) {
    const gt3Patterns = vinPatterns.filter(l =>
      l.vin && (
        l.vin.includes('AC299') || // Common GT3 pattern
        l.vin.includes('AC2A9')    // Another GT3 pattern
      ) && !l.trim?.includes('GT3')
    );

    if (gt3Patterns.length > 0) {
      console.log(`Found ${gt3Patterns.length} potential GT3s that might be misclassified:`);
      gt3Patterns.forEach(l => {
        console.log(`  ${l.year} ${l.model} ${l.trim || 'Unknown'} (${l.generation}) - VIN: ${l.vin?.slice(-8)}`);
      });
    } else {
      console.log('No misclassified GT3s found based on VIN patterns.');
    }
  }
}

check996GT3s().catch(console.error);