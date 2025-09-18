#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { normalizeModelTrim } from '../lib/services/model-trim-normalizer';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function normalizeDatabase() {
  console.log('='.repeat(80));
  console.log('DATABASE NORMALIZATION');
  console.log('='.repeat(80));
  
  // 1. Fetch all listings
  console.log('\n1. Fetching all listings...');
  let allListings: any[] = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, vin, title, model, trim, generation, year, sold_date, created_at')
      .range(offset, offset + limit - 1)
      .order('id');
    
    if (error) {
      console.error('Error fetching listings:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allListings = allListings.concat(data);
    offset += limit;
    
    if (data.length < limit) break;
  }
  
  console.log(`Fetched ${allListings.length} listings`);
  
  // 2. Process and normalize each listing
  console.log('\n2. Normalizing listings...');
  let updated = 0;
  let needsSoldDate = 0;
  let errors = 0;
  
  for (const listing of allListings) {
    try {
      // Normalize model/trim/generation
      const normalized = await normalizeModelTrim(listing.title);
      
      const updates: any = {};
      let needsUpdate = false;
      
      // Check if model needs updating
      if (normalized.model && normalized.model !== listing.model) {
        updates.model = normalized.model;
        needsUpdate = true;
      }
      
      // Check if trim needs updating
      if (normalized.trim && normalized.trim !== listing.trim) {
        updates.trim = normalized.trim;
        needsUpdate = true;
      }
      
      // Check if generation needs updating
      if (normalized.generation && normalized.generation !== listing.generation) {
        updates.generation = normalized.generation;
        needsUpdate = true;
      }
      
      // Check if year needs updating (only if we don't have one)
      if (normalized.year && !listing.year) {
        updates.year = normalized.year;
        needsUpdate = true;
      }
      
      // NEVER use fallback for sold_date - must come from actual data
      // If sold_date is missing, it needs to be re-scraped
      // DO NOT use created_at or any other date as fallback
      
      // Update if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('listings')
          .update(updates)
          .eq('id', listing.id);
        
        if (updateError) {
          console.error(`Error updating listing ${listing.id}:`, updateError);
          errors++;
        } else {
          updated++;
          if (updated % 100 === 0) {
            console.log(`  Updated ${updated} listings...`);
          }
        }
      }
    } catch (err) {
      console.error(`Error processing listing ${listing.id}:`, err);
      errors++;
    }
  }
  
  console.log('\n3. Summary:');
  console.log(`  Total listings: ${allListings.length}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Added sold_date: ${needsSoldDate}`);
  console.log(`  Errors: ${errors}`);
  
  // 4. Fix specific known issues
  console.log('\n4. Fixing specific issues...');
  
  // Fix "Base" trim for 911s
  const { error: baseError } = await supabase
    .from('listings')
    .update({ trim: 'Carrera' })
    .eq('model', '911')
    .eq('trim', 'Base');
  
  if (!baseError) console.log('  ✓ Fixed 911 Base → Carrera');
  
  // Fix Carrera T Targa
  const { error: targaError } = await supabase
    .from('listings')
    .update({ trim: 'Carrera T' })
    .eq('trim', 'Carrera T Targa');
  
  if (!targaError) console.log('  ✓ Fixed Carrera T Targa → Carrera T');
  
  // Fix GT4/GT4 RS generations
  // GT4 should be 981, GT4 RS should be 982
  const { error: gt4Error } = await supabase
    .from('listings')
    .update({ generation: '981' })
    .eq('trim', 'GT4')
    .in('generation', ['981.1', '981.2']);
  
  if (!gt4Error) console.log('  ✓ Fixed GT4 generations to 981');
  
  console.log('\n✅ Database normalization complete!');
  process.exit(0);
}

// Run with error handling
normalizeDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});