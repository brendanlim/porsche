#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { BaTScraperPuppeteer } from '../../lib/scrapers/bat-puppeteer';

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

// Fallback parsing function
function parseListingDetails(listing: any): any {
  const title = listing.title || '';
  let year = listing.year;
  let model = listing.model;
  let trim = listing.trim;
  let generation = listing.generation;
  
  // Extract year from title if not set
  if (!year) {
    const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) {
      year = parseInt(yearMatch[1]);
    }
  }
  
  // Determine model if not set
  if (!model || model === 'Unknown') {
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
  
  // Parse trim for 911
  if (model === '911' && (!trim || trim === 'Unknown')) {
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
    }
    
    // Add body style modifiers
    if (trim && title.includes('Targa')) {
      trim = trim + ' Targa';
    } else if (trim && (title.includes('Cabriolet') || title.includes('Cabrio'))) {
      trim = trim + ' Cabriolet';
    }
  } else if (model?.includes('718')) {
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
    }
  }
  
  // Infer generation from year
  if (!generation && year) {
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
    } else if (model?.includes('718') || model?.includes('Cayman') || model?.includes('Boxster')) {
      if (year >= 2016) generation = '982';
      else if (year >= 2013) generation = '981';
      else if (year >= 2009) generation = '987.2';
      else if (year >= 2005) generation = '987.1';
      else if (year >= 1997) generation = '986';
    }
  }
  
  return {
    ...listing,
    year,
    model,
    trim,
    generation
  };
}

async function saveListings(listings: any[], source: string): Promise<number> {
  let savedCount = 0;
  let updatedCount = 0;
  
  for (const listing of listings) {
    try {
      // Parse listing details
      const parsed = parseListingDetails(listing);
      
      // Skip non-sports cars
      if (parsed.model?.includes('Cayenne') || parsed.model?.includes('Macan') || 
          parsed.model?.includes('Panamera') || parsed.model?.includes('Taycan')) {
        continue;
      }
      
      // Check if listing already exists by source URL
      let existingId = null;
      if (listing.source_url || listing.url) {
        const url = listing.source_url || listing.url;
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('source_url', url)
          .single();
        
        if (existing) existingId = existing.id;
      }
      
      if (existingId) {
        // Update existing listing
        const { error } = await supabase
          .from('listings')
          .update({
            price: parsed.price,
            year: parsed.year,
            model: parsed.model,
            trim: parsed.trim,
            generation: parsed.generation,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingId);
        
        if (!error) {
          updatedCount++;
        }
      } else {
        // Insert new listing
        const { error } = await supabase
          .from('listings')
          .insert({
            source,
            source_url: listing.source_url || listing.url,
            title: listing.title,
            year: parsed.year,
            model: parsed.model,
            trim: parsed.trim,
            generation: parsed.generation,
            price: parsed.price,
            mileage: parsed.mileage,
            exterior_color: parsed.exterior_color,
            interior_color: parsed.interior_color,
            location: parsed.location,
            description: parsed.description,
            options_text: parsed.options_text,
            sold_date: parsed.sold_date,
            status: listing.status || 'sold',
            scraped_at: new Date().toISOString()
          });
        
        if (!error) {
          savedCount++;
        } else {
          console.error(`Failed to save: ${error.message}`);
        }
      }
    } catch (err) {
      console.error('Error saving listing:', err);
    }
  }
  
  console.log(`   📝 Saved ${savedCount} new, updated ${updatedCount} existing listings`);
  return savedCount + updatedCount;
}

async function main() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE 90-DAY BAT SCRAPER');
  console.log('='.repeat(80));
  console.log('Fetching all Porsche listings from the last 90 days');
  console.log('This will include ALL models and trims');
  console.log('='.repeat(80) + '\n');
  
  const startTime = Date.now();
  
  try {
    // Initialize scraper
    console.log('🚀 Initializing BaT scraper with Puppeteer...\n');
    const scraper = new BaTScraperPuppeteer();
    
    // Configuration for comprehensive scraping
    const config = {
      maxPages: 50,  // Fetch many pages to get all listings
      onlySold: true,  // Only get sold listings for price data
      models: [
        // 911 variants
        { name: '911', searchPath: '911', trim: null },
        { name: '911', searchPath: '911-gt3', trim: 'GT3' },
        { name: '911', searchPath: '911-gt3-rs', trim: 'GT3 RS' },
        { name: '911', searchPath: '911-gt2', trim: 'GT2' },
        { name: '911', searchPath: '911-gt2-rs', trim: 'GT2 RS' },
        { name: '911', searchPath: '911-turbo', trim: 'Turbo' },
        { name: '911', searchPath: '911-turbo-s', trim: 'Turbo S' },
        { name: '911', searchPath: '911-carrera', trim: 'Carrera' },
        { name: '911', searchPath: '911-carrera-s', trim: 'Carrera S' },
        { name: '911', searchPath: '911-carrera-4s', trim: 'Carrera 4S' },
        { name: '911', searchPath: '911-targa', trim: 'Targa' },
        { name: '911', searchPath: '911-speedster', trim: 'Speedster' },
        { name: '911', searchPath: '911-s-t', trim: 'S/T' },
        { name: '911', searchPath: '911-dakar', trim: 'Dakar' },
        
        // 718/Cayman/Boxster variants
        { name: '718 Cayman', searchPath: 'cayman', trim: null },
        { name: '718 Cayman', searchPath: 'cayman-gt4', trim: 'GT4' },
        { name: '718 Cayman', searchPath: 'cayman-gt4-rs', trim: 'GT4 RS' },
        { name: '718 Cayman', searchPath: 'cayman-gts', trim: 'GTS' },
        { name: '718 Cayman', searchPath: 'cayman-s', trim: 'S' },
        { name: '718 Boxster', searchPath: 'boxster', trim: null },
        { name: '718 Boxster', searchPath: 'boxster-spyder', trim: 'Spyder' },
        { name: '718 Boxster', searchPath: 'boxster-gts', trim: 'GTS' },
        { name: '718 Boxster', searchPath: 'boxster-s', trim: 'S' },
        
        // Classic models
        { name: '911', searchPath: '912', trim: '912' },
        { name: '911', searchPath: '914', trim: '914' },
        { name: '911', searchPath: '944', trim: '944' },
        { name: '911', searchPath: '968', trim: '968' },
        { name: '911', searchPath: '928', trim: '928' },
        { name: '911', searchPath: 'carrera-gt', trim: 'Carrera GT' },
        { name: '918', searchPath: '918-spyder', trim: 'Spyder' },
      ]
    };
    
    console.log(`📋 Searching for ${config.models.length} model variants\n`);
    
    // Process each model variant
    const allListings: any[] = [];
    for (const modelConfig of config.models) {
      console.log(`\n🔍 Searching: ${modelConfig.searchPath}`);
      
      try {
        const results = await scraper.scrapeListings({
          model: modelConfig.searchPath,
          maxPages: config.maxPages,
          onlySold: config.onlySold
        });
        
        // Add model/trim info to each listing
        const enrichedResults = results.map(r => ({
          ...r,
          model: modelConfig.name,
          trim: modelConfig.trim || r.trim
        }));
        
        allListings.push(...enrichedResults);
        console.log(`   ✅ Found ${results.length} listings`);
        
        // Rate limit between searches
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`SCRAPING COMPLETE - Found ${allListings.length} total listings`);
    console.log('='.repeat(80) + '\n');
    
    // Remove duplicates based on URL
    const uniqueListings = Array.from(
      new Map(allListings.map(item => [item.url || item.source_url, item])).values()
    );
    
    console.log(`After deduplication: ${uniqueListings.length} unique listings\n`);
    
    // Save to database
    if (uniqueListings.length > 0) {
      console.log('💾 Saving to database...\n');
      const saved = await saveListings(uniqueListings, 'bring-a-trailer');
      console.log(`\n✅ Database operation complete: ${saved} listings processed`);
    }
    
    // Final stats
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log('\n' + '='.repeat(80));
    console.log('FINAL STATISTICS');
    console.log('='.repeat(80));
    console.log(`⏱️  Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`📊 Total listings found: ${allListings.length}`);
    console.log(`📊 Unique listings: ${uniqueListings.length}`);
    
    // Show distribution
    const modelCounts: Record<string, number> = {};
    uniqueListings.forEach(l => {
      const key = `${l.model} ${l.trim || ''}`.trim();
      modelCounts[key] = (modelCounts[key] || 0) + 1;
    });
    
    console.log('\nTop models/trims:');
    Object.entries(modelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .forEach(([model, count]) => {
        console.log(`  ${count.toString().padStart(4)} ${model}`);
      });
      
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);