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

async function fixGT4RSColors() {
  console.log('='.repeat(80));
  console.log('FIXING GT4 RS COLOR DATA');
  console.log('='.repeat(80));
  
  // 1. Get all unique colors for GT4 RS
  const { data: gt4rsListings, error: fetchError } = await supabase
    .from('listings')
    .select('id, vin, color, source_url')
    .eq('trim', 'GT4 RS');
  
  if (fetchError) {
    console.error('Error fetching GT4 RS listings:', fetchError);
    return;
  }
  
  console.log(`Found ${gt4rsListings?.length || 0} GT4 RS listings`);
  
  // Count distinct colors
  const colorCounts = new Map<string, number>();
  gt4rsListings?.forEach(listing => {
    if (listing.color) {
      const count = colorCounts.get(listing.color) || 0;
      colorCounts.set(listing.color, count + 1);
    }
  });
  
  console.log('\nCurrent colors in database:');
  Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([color, count]) => {
      console.log(`  ${color}: ${count} listings`);
    });
  
  // 2. Fix known bad color values
  const badColors = [
    '-8-07604-scaled',
    'Satin Neodyme are mounted',
    'Satin Neodym',
    'Satin Neodyme'
  ];
  
  let fixed = 0;
  
  for (const listing of gt4rsListings || []) {
    let needsUpdate = false;
    let newColor = listing.color;
    
    // Check for bad color patterns
    if (listing.color && badColors.some(bad => listing.color.includes(bad))) {
      console.log(`\n❌ Bad color for VIN ${listing.vin}: "${listing.color}"`);
      
      // These are likely parsing errors - set to null to be re-scraped
      newColor = null;
      needsUpdate = true;
    } else if (listing.color && listing.color.includes('scaled')) {
      // This looks like an image filename, not a color
      console.log(`\n❌ Image filename as color for VIN ${listing.vin}: "${listing.color}"`);
      newColor = null;
      needsUpdate = true;
    } else if (listing.color && listing.color.includes('mounted')) {
      // This is wheel description text, not a color
      console.log(`\n❌ Wheel description as color for VIN ${listing.vin}: "${listing.color}"`);
      newColor = null;
      needsUpdate = true;
    }
    
    // Fix "Satin Neodym" variations to proper color name
    if (listing.color === 'Satin Neodym' || listing.color === 'Satin Neodyme') {
      // This should probably be "Satin Neodyme" which is a real Porsche wheel finish
      // But it's NOT a paint color - it's a wheel finish
      console.log(`\n⚠️ Wheel finish as color for VIN ${listing.vin}: "${listing.color}"`);
      newColor = null; // Clear it since it's not a paint color
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('listings')
        .update({ color: newColor })
        .eq('id', listing.id);
      
      if (!updateError) {
        console.log(`  ✅ Fixed: set color to ${newColor === null ? 'null (to be re-scraped)' : newColor}`);
        fixed++;
      } else {
        console.error(`  ❌ Error updating listing ${listing.id}:`, updateError);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('COMPLETE');
  console.log('='.repeat(80));
  console.log(`✅ Fixed ${fixed} listings with incorrect color data`);
  
  // 3. Show updated color distribution
  const { data: updatedListings } = await supabase
    .from('listings')
    .select('color')
    .eq('trim', 'GT4 RS')
    .not('color', 'is', null);
  
  const updatedColorCounts = new Map<string, number>();
  updatedListings?.forEach(listing => {
    if (listing.color) {
      const count = updatedColorCounts.get(listing.color) || 0;
      updatedColorCounts.set(listing.color, count + 1);
    }
  });
  
  console.log('\nUpdated color distribution:');
  Array.from(updatedColorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([color, count]) => {
      console.log(`  ${color}: ${count} listings`);
    });
  
  // Count how many need re-scraping
  const { count: nullColorCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('trim', 'GT4 RS')
    .is('color', null);
  
  console.log(`\n⚠️ ${nullColorCount} GT4 RS listings need color data (will be re-scraped)`);
}

fixGT4RSColors().catch(console.error);