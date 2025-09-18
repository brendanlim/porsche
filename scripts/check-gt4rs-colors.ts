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

async function checkGT4RSColors() {
  console.log('='.repeat(80));
  console.log('CHECKING GT4 RS COLOR DATA');
  console.log('='.repeat(80));
  
  // Get distinct exterior_color values for GT4 RS
  const { data: colorData, error } = await supabase
    .from('listings')
    .select('exterior_color')
    .eq('trim', 'GT4 RS')
    .not('exterior_color', 'is', null);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Count occurrences
  const colorCounts = new Map<string, number>();
  colorData?.forEach(row => {
    const color = row.exterior_color;
    colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
  });
  
  console.log(`\nFound ${colorCounts.size} unique colors in ${colorData?.length} listings:\n`);
  
  // Sort by count and display
  Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([color, count]) => {
      const isSuspicious = color.includes('scaled') || 
                          color.includes('mounted') || 
                          color.includes('.') ||
                          color.includes('-') && color.split('-').length > 3;
      
      console.log(`  ${isSuspicious ? '❌' : '✅'} "${color}": ${count} listings`);
    });
  
  // Show problematic entries
  const problems = Array.from(colorCounts.keys()).filter(color => 
    color.includes('scaled') || 
    color.includes('mounted') || 
    color.includes('.jpg') ||
    color.includes('.png') ||
    (color.includes('-') && color.split('-').length > 3)
  );
  
  if (problems.length > 0) {
    console.log('\n⚠️  PROBLEMATIC COLOR VALUES:');
    problems.forEach(p => console.log(`  - "${p}"`));
    
    console.log('\nThese appear to be parsing errors where the scraper grabbed:');
    console.log('  - Image filenames instead of color names');
    console.log('  - Wheel descriptions instead of paint colors');
    console.log('  - Random text from the page');
  }
}

checkGT4RSColors().catch(console.error);