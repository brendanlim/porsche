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

function parseListingDetails(title: string, currentModel: string | null, currentTrim: string | null): {
  year: number | null;
  model: string;
  trim: string | null;
  generation: string | null;
} {
  let year: number | null = null;
  let model = currentModel || '911';
  let trim = currentTrim;
  let generation: string | null = null;
  
  // Extract year
  const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  }
  
  // Determine model if not set
  if (!currentModel || currentModel === 'Unknown') {
    if (title.includes('Cayman')) {
      model = '718 Cayman';
    } else if (title.includes('Boxster')) {
      model = '718 Boxster';
    } else if (title.includes('Spyder')) {
      model = '718 Spyder';
    } else if (title.includes('911') || title.includes('GT3') || title.includes('GT2') || 
               title.includes('Turbo') || title.includes('Carrera')) {
      model = '911';
    }
  }
  
  // Parse trim based on model
  if (model === '911') {
    // GT models (check these first as they're most specific)
    if (title.includes('GT3 RS') || title.includes('GT3RS')) {
      trim = 'GT3 RS';
    } else if (title.includes('GT3 Touring')) {
      trim = 'GT3 Touring';
    } else if (title.includes('GT3 Cup')) {
      trim = 'GT3 Cup';
    } else if (title.includes('GT3')) {
      trim = 'GT3';
    } else if (title.includes('GT2 RS') || title.includes('GT2RS')) {
      trim = 'GT2 RS';
    } else if (title.includes('GT2')) {
      trim = 'GT2';
    }
    // Turbo models
    else if (title.includes('Turbo S')) {
      trim = 'Turbo S';
    } else if (title.includes('Turbo')) {
      trim = 'Turbo';
    }
    // Carrera variants
    else if (title.includes('Carrera 4S')) {
      trim = 'Carrera 4S';
    } else if (title.includes('Carrera 4')) {
      trim = 'Carrera 4';
    } else if (title.includes('Carrera S')) {
      trim = 'Carrera S';
    } else if (title.includes('Carrera GTS')) {
      trim = 'Carrera GTS';
    } else if (title.includes('Carrera T')) {
      trim = 'Carrera T';
    } else if (title.includes('Carrera')) {
      trim = 'Carrera';
    }
    // Special models
    else if (title.includes('S/T')) {
      trim = 'S/T';
    } else if (title.includes('Sport Classic')) {
      trim = 'Sport Classic';
    } else if (title.includes('Speedster')) {
      trim = 'Speedster';
    } else if (title.includes('Dakar')) {
      trim = 'Dakar';
    } else if (title.includes('R')) {
      trim = 'R';
    }
    
    // Add body style modifiers
    if (trim && title.includes('Targa')) {
      trim = trim + ' Targa';
    } else if (trim && (title.includes('Cabriolet') || title.includes('Cabrio'))) {
      trim = trim + ' Cabriolet';
    }
  } else if (model.includes('718')) {
    // 718 models
    if (title.includes('GT4 RS') || title.includes('GT4RS')) {
      trim = 'GT4 RS';
    } else if (title.includes('GT4')) {
      trim = 'GT4';
    } else if (title.includes('Spyder RS')) {
      trim = 'Spyder RS';
    } else if (title.includes('Spyder')) {
      trim = 'Spyder';
    } else if (title.includes('GTS 4.0')) {
      trim = 'GTS 4.0';
    } else if (title.includes('GTS')) {
      trim = 'GTS';
    } else if (title.includes(' S ') || title.includes(' S')) {
      trim = 'S';
    } else if (title.includes('Style Edition')) {
      trim = 'Style Edition';
    } else if (title.includes('Base')) {
      trim = 'Base';
    }
  }
  
  // Infer generation from year
  if (year) {
    if (model === '911') {
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
      else if (year >= 1978) generation = 'SC';
      else if (year >= 1974) generation = 'G-Series';
    } else if (model.includes('718') || model.includes('Cayman') || model.includes('Boxster')) {
      if (year >= 2016) generation = '982';
      else if (year >= 2013) generation = '981';
      else if (year >= 2009) generation = '987.2';
      else if (year >= 2005) generation = '987.1';
      else if (year >= 1997) generation = '986';
    }
  }
  
  // Also check for explicit generation in title
  const genPatterns = ['992.2', '992.1', '992', '991.2', '991.1', '991', '997.2', '997.1', '997', '996', '993', '964', '982', '981', '987.2', '987.1', '986'];
  for (const gen of genPatterns) {
    if (title.includes(gen)) {
      generation = gen;
      break;
    }
  }
  
  return { year, model, trim, generation };
}

async function fixAllListings() {
  console.log('Fixing all listings with missing year/generation/trim...\n');
  
  // Get all listings that need fixing - no limit!
  // Supabase has a default limit of 1000, so we need to paginate
  let allListings: any[] = [];
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data: batch, error } = await supabase
      .from('listings')
      .select('id, title, model, trim, year, generation')
      .or('year.is.null,generation.is.null')
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching listings:', error);
      break;
    }
    
    if (!batch || batch.length === 0) break;
    
    allListings = allListings.concat(batch);
    console.log(`Fetched ${allListings.length} listings so far...`);
    
    if (batch.length < limit) break; // Last batch
    offset += limit;
  }
  
  const listings = allListings;
  
  if (!listings || listings.length === 0) {
    console.log('No listings found that need fixing');
    return;
  }
  
  console.log(`Found ${listings.length} listings to check\n`);
  
  const updates: Array<{
    id: string;
    year: number | null;
    model: string;
    trim: string | null;
    generation: string | null;
    oldData: any;
  }> = [];
  
  // Parse all listings
  for (const listing of listings) {
    if (!listing.title) continue;
    
    const parsed = parseListingDetails(listing.title, listing.model, listing.trim);
    
    // Only update if we found improvements
    const hasImprovement = 
      (parsed.year && !listing.year) ||
      (parsed.generation && !listing.generation) ||
      (parsed.trim && parsed.trim !== listing.trim) ||
      (parsed.model && parsed.model !== listing.model);
    
    if (hasImprovement) {
      updates.push({
        id: listing.id,
        year: parsed.year || listing.year,
        model: parsed.model || listing.model,
        trim: parsed.trim || listing.trim,
        generation: parsed.generation || listing.generation,
        oldData: {
          year: listing.year,
          model: listing.model,
          trim: listing.trim,
          generation: listing.generation,
          title: listing.title
        }
      });
    }
  }
  
  console.log(`Found ${updates.length} listings with improvements\n`);
  
  // Group updates by type for reporting
  const gt3Updates = updates.filter(u => u.oldData.title?.includes('GT3'));
  const gt2Updates = updates.filter(u => u.oldData.title?.includes('GT2'));
  const turboUpdates = updates.filter(u => u.oldData.title?.includes('Turbo'));
  const caymanUpdates = updates.filter(u => u.oldData.title?.includes('Cayman'));
  const boxsterUpdates = updates.filter(u => u.oldData.title?.includes('Boxster'));
  
  console.log('Updates by type:');
  console.log(`  GT3 listings: ${gt3Updates.length}`);
  console.log(`  GT2 listings: ${gt2Updates.length}`);
  console.log(`  Turbo listings: ${turboUpdates.length}`);
  console.log(`  Cayman listings: ${caymanUpdates.length}`);
  console.log(`  Boxster listings: ${boxsterUpdates.length}`);
  console.log();
  
  // Show sample GT3 updates
  if (gt3Updates.length > 0) {
    console.log('Sample GT3 updates:');
    gt3Updates.slice(0, 5).forEach(u => {
      console.log(`  "${u.oldData.title?.substring(0, 50)}..."`);
      console.log(`    Before: Year: ${u.oldData.year}, Gen: ${u.oldData.generation}, Trim: ${u.oldData.trim}`);
      console.log(`    After:  Year: ${u.year}, Gen: ${u.generation}, Trim: ${u.trim}`);
    });
    console.log();
  }
  
  // Apply updates
  console.log('Applying updates...');
  let successCount = 0;
  let errorCount = 0;
  
  for (const update of updates) {
    const { error } = await supabase
      .from('listings')
      .update({
        year: update.year,
        model: update.model,
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
  
  // Show final distribution
  console.log('\n📊 Final model/trim distribution:');
  const { data: finalDist } = await supabase
    .from('listings')
    .select('model, trim, generation');
  
  const distCounts: Record<string, number> = {};
  finalDist?.forEach(l => {
    const key = `${l.model || 'Unknown'} ${l.trim || ''} (${l.generation || 'Unknown'})`.trim();
    distCounts[key] = (distCounts[key] || 0) + 1;
  });
  
  Object.entries(distCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .forEach(([key, count]) => {
      console.log(`  ${count.toString().padStart(4)} ${key}`);
    });
    
  // Show GT3 specific distribution
  console.log('\n📊 GT3 Distribution:');
  const gt3Counts: Record<string, number> = {};
  finalDist?.filter(l => l.trim?.includes('GT3')).forEach(l => {
    const key = `${l.generation || 'Unknown'} ${l.trim}`;
    gt3Counts[key] = (gt3Counts[key] || 0) + 1;
  });
  
  Object.entries(gt3Counts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([key, count]) => {
      console.log(`  ${count.toString().padStart(3)} ${key}`);
    });
}

fixAllListings().catch(console.error);