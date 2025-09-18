#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixBadColors() {
  console.log('='.repeat(80));
  console.log('FIXING BAD COLOR DATA');
  console.log('='.repeat(80));
  
  // Define bad color patterns
  const badPatterns = [
    'scaled',     // Image filename endings
    'mounted',    // Wheel description text
    '.jpg',       // Image extensions
    '.png',       
    '.jpeg',
    'Satin Neodyme are',  // Specific bad text
    'Satin Neodym'        // Wheel finish, not paint color
  ];
  
  // Find all listings with bad color data
  const { data: listings, error: fetchError } = await supabase
    .from('listings')
    .select('id, vin, trim, exterior_color, source_url');
  
  if (fetchError) {
    console.error('Error fetching listings:', fetchError);
    return;
  }
  
  const badColorListings = listings?.filter(listing => {
    if (!listing.exterior_color) return false;
    
    // Check if color contains any bad patterns
    return badPatterns.some(pattern => 
      listing.exterior_color.toLowerCase().includes(pattern.toLowerCase())
    ) || 
    // Check for suspicious patterns like multiple dashes with numbers (image filenames)
    (listing.exterior_color.includes('-') && 
     /\d{5,}/.test(listing.exterior_color)); // Contains 5+ digit numbers
  }) || [];
  
  console.log(`Found ${badColorListings.length} listings with bad color data\n`);
  
  // Group by trim to see distribution
  const byTrim = new Map<string, number>();
  badColorListings.forEach(l => {
    byTrim.set(l.trim, (byTrim.get(l.trim) || 0) + 1);
  });
  
  console.log('Bad colors by trim:');
  Array.from(byTrim.entries()).forEach(([trim, count]) => {
    console.log(`  ${trim}: ${count} listings`);
  });
  
  // Fix the bad colors by setting to null
  let fixed = 0;
  let errors = 0;
  
  for (const listing of badColorListings) {
    console.log(`\n❌ Bad color for ${listing.trim} (VIN: ${listing.vin}): "${listing.exterior_color}"`);
    
    const { error: updateError } = await supabase
      .from('listings')
      .update({ exterior_color: null })
      .eq('id', listing.id);
    
    if (!updateError) {
      console.log('  ✅ Fixed: set to null for re-scraping');
      fixed++;
    } else {
      console.error('  ❌ Error updating:', updateError);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('COMPLETE');
  console.log('='.repeat(80));
  console.log(`✅ Fixed: ${fixed} listings`);
  console.log(`❌ Errors: ${errors}`);
  
  // Show summary of listings needing color data
  const { count: nullColorCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .is('exterior_color', null);
  
  console.log(`\n📊 Total listings needing color data: ${nullColorCount}`);
  console.log('These will be populated when the listings are re-scraped.');
}

fixBadColors().catch(console.error);