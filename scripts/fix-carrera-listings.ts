#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

function parseCarreraListing(title: string): {
  year: number | null;
  trim: string;
  generation: string | null;
} {
  let year: number | null = null;
  let trim = 'Carrera';
  let generation: string | null = null;
  
  // Extract year
  const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  }
  
  // Extract specific Carrera trim
  if (title.includes('Carrera 4S')) {
    trim = 'Carrera 4S';
  } else if (title.includes('Carrera 4')) {
    trim = 'Carrera 4';
  } else if (title.includes('Carrera S')) {
    trim = 'Carrera S';
  } else if (title.includes('Carrera GTS')) {
    trim = 'Carrera GTS';
  } else if (title.includes('Carrera T')) {
    trim = 'Carrera T';
  }
  
  // Add Targa if present
  if (title.includes('Targa')) {
    trim = trim + ' Targa';
  }
  
  // Add Cabriolet if present
  if (title.includes('Cabriolet') || title.includes('Cabrio')) {
    trim = trim + ' Cabriolet';
  }
  
  // Infer generation from year
  if (year) {
    if (year >= 2024) generation = '992.2';
    else if (year >= 2019) generation = '992.1';
    else if (year >= 2016) generation = '991.2';
    else if (year >= 2012) generation = '991.1';
    else if (year >= 2009) generation = '997.2';
    else if (year >= 2005) generation = '997.1';
    else if (year >= 1999) generation = '996';
    else if (year >= 1995) generation = '993';
    else if (year >= 1989) generation = '964';
    else if (year >= 1984) generation = '3.2 Carrera';
  }
  
  return { year, trim, generation };
}

async function fixCarreraListings() {
  console.log('Fixing 911 Carrera listings with missing year/generation...\n');
  
  // Get all problematic listings
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, title, model, trim, year, generation')
    .eq('model', '911')
    .eq('trim', 'Carrera')
    .is('generation', null);
  
  if (error || !listings) {
    console.error('Error fetching listings:', error);
    return;
  }
  
  console.log(`Found ${listings.length} listings to fix\n`);
  
  const updates: Array<{
    id: string;
    year: number | null;
    trim: string;
    generation: string | null;
  }> = [];
  
  // Parse all listings
  for (const listing of listings) {
    if (!listing.title) continue;
    
    const parsed = parseCarreraListing(listing.title);
    
    // Only update if we found improvements
    if (parsed.year || parsed.generation || parsed.trim !== 'Carrera') {
      updates.push({
        id: listing.id,
        year: parsed.year,
        trim: parsed.trim,
        generation: parsed.generation
      });
    }
  }
  
  console.log(`Parsed ${updates.length} listings with improvements\n`);
  
  // Show sample of updates
  console.log('Sample updates:');
  updates.slice(0, 10).forEach(u => {
    const listing = listings.find(l => l.id === u.id);
    console.log(`  "${listing?.title?.substring(0, 50)}..."`);
    console.log(`    → Year: ${u.year}, Gen: ${u.generation}, Trim: ${u.trim}`);
  });
  console.log();
  
  // Apply updates
  console.log('Applying updates...');
  let successCount = 0;
  let errorCount = 0;
  
  for (const update of updates) {
    const { error } = await supabase
      .from('listings')
      .update({
        year: update.year,
        trim: update.trim,
        generation: update.generation
      })
      .eq('id', update.id);
    
    if (error) {
      console.error(`Error updating ${update.id}:`, error.message);
      errorCount++;
    } else {
      successCount++;
      if (successCount % 100 === 0) {
        console.log(`  Updated ${successCount}/${updates.length}...`);
      }
    }
  }
  
  console.log(`\n✅ Successfully updated ${successCount} listings`);
  if (errorCount > 0) {
    console.log(`❌ Failed to update ${errorCount} listings`);
  }
  
  // Show updated distribution
  console.log('\n📊 Updated 911 distribution:');
  const { data: updatedDist } = await supabase
    .from('listings')
    .select('trim, generation')
    .eq('model', '911');
  
  const distCounts: Record<string, number> = {};
  updatedDist?.forEach(l => {
    const key = `${l.trim || 'Unknown'} (${l.generation || 'Unknown'})`;
    distCounts[key] = (distCounts[key] || 0) + 1;
  });
  
  Object.entries(distCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15)
    .forEach(([key, count]) => {
      console.log(`  ${count.toString().padStart(4)} ${key}`);
    });
}

fixCarreraListings().catch(console.error);