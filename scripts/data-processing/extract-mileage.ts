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

function extractMileageFromTitle(title: string): number | null {
  if (!title) return null;
  
  // Patterns to match mileage in various formats
  const patterns = [
    // Matches: "13k-Mile", "13K-Mile", "13k-mile"
    /([\d,]+)[kK]-[Mm]ile/,
    // Matches: "3,100-Mile", "3100-Mile"
    /([\d,]+)-[Mm]ile/,
    // Matches: "13,000 Miles", "3100 miles"
    /([\d,]+)\s+[Mm]iles?\b/,
    // Matches: "13k Miles", "13K miles"
    /([\d,]+)[kK]\s+[Mm]iles?\b/,
    // Matches: "One-Owner 13,000-Kilometer" (convert km to miles)
    /([\d,]+)-[Kk]ilometer/,
    /([\d,]+)\s+[Kk]ilometers?\b/,
    /([\d,]+)[kK]\s+[Kk]ilometers?\b/,
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      let mileageStr = match[1].replace(/,/g, '');
      let mileage = parseInt(mileageStr);
      
      // Handle 'k' notation (13k = 13000)
      if (match[0].toLowerCase().includes('k-mile') || 
          match[0].toLowerCase().includes('k mile')) {
        mileage = mileage * 1000;
      }
      
      // Handle 'k' notation for kilometers
      if (match[0].toLowerCase().includes('k-kilometer') || 
          match[0].toLowerCase().includes('k kilometer')) {
        mileage = mileage * 1000;
      }
      
      // Convert kilometers to miles
      if (match[0].toLowerCase().includes('kilometer')) {
        mileage = Math.round(mileage * 0.621371);
      }
      
      // Sanity check - must be between 0 and 500,000 miles
      if (mileage > 0 && mileage < 500000) {
        return mileage;
      }
    }
  }
  
  return null;
}

async function extractAllMileage() {
  console.log('='.repeat(60));
  console.log('EXTRACTING MILEAGE FROM TITLES');
  console.log('='.repeat(60));
  
  // Get all listings without mileage
  console.log('Fetching listings without mileage...');
  
  let allListings: any[] = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data: batch, error } = await supabase
      .from('listings')
      .select('id, title, mileage, model, trim')
      .is('mileage', null)
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching listings:', error);
      break;
    }
    
    if (!batch || batch.length === 0) break;
    
    allListings = allListings.concat(batch);
    console.log(`Fetched ${allListings.length} listings so far...`);
    
    if (batch.length < limit) break;
    offset += limit;
  }
  
  console.log(`\nFound ${allListings.length} listings without mileage\n`);
  
  // Extract mileage from titles
  const updates: Array<{ id: string; mileage: number; title: string }> = [];
  const modelStats: Record<string, { total: number; extracted: number }> = {};
  
  for (const listing of allListings) {
    const modelKey = `${listing.model} ${listing.trim || ''}`.trim();
    if (!modelStats[modelKey]) {
      modelStats[modelKey] = { total: 0, extracted: 0 };
    }
    modelStats[modelKey].total++;
    
    const mileage = extractMileageFromTitle(listing.title);
    if (mileage !== null) {
      updates.push({ 
        id: listing.id, 
        mileage,
        title: listing.title 
      });
      modelStats[modelKey].extracted++;
    }
  }
  
  console.log(`Extracted mileage from ${updates.length} listings (${(updates.length/allListings.length*100).toFixed(1)}%)\n`);
  
  // Show extraction stats by model
  console.log('Extraction success by model/trim:');
  Object.entries(modelStats)
    .sort(([,a], [,b]) => b.total - a.total)
    .slice(0, 15)
    .forEach(([model, stats]) => {
      const percent = ((stats.extracted/stats.total)*100).toFixed(1);
      console.log(`  ${model}: ${stats.extracted}/${stats.total} (${percent}%)`);
    });
  
  // Show sample extractions
  console.log('\nSample extractions:');
  updates.slice(0, 10).forEach(update => {
    console.log(`  "${update.title.substring(0, 50)}..." → ${update.mileage.toLocaleString()} miles`);
  });
  
  // Apply updates
  if (updates.length > 0) {
    console.log(`\nUpdating database with ${updates.length} mileage values...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const { error } = await supabase
        .from('listings')
        .update({ mileage: update.mileage })
        .eq('id', update.id);
      
      if (error) {
        errorCount++;
        console.error(`Error updating ${update.id}:`, error.message);
      } else {
        successCount++;
        if (successCount % 100 === 0) {
          console.log(`  Updated ${successCount}/${updates.length}...`);
        }
      }
    }
    
    console.log(`\n✅ Successfully updated ${successCount} listings with mileage`);
    if (errorCount > 0) {
      console.log(`❌ Failed to update ${errorCount} listings`);
    }
  }
  
  // Final stats
  const { count: totalCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });
    
  const { count: hasMileage } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .not('mileage', 'is', null);
    
  console.log('\n' + '='.repeat(60));
  console.log('FINAL MILEAGE STATISTICS');
  console.log('='.repeat(60));
  console.log(`Total listings: ${totalCount}`);
  console.log(`With mileage: ${hasMileage} (${((hasMileage/totalCount)*100).toFixed(1)}%)`);
  console.log(`Without mileage: ${totalCount - hasMileage} (${(((totalCount - hasMileage)/totalCount)*100).toFixed(1)}%)`);
}

extractAllMileage().catch(console.error);
