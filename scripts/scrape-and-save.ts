#!/usr/bin/env npx tsx
// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ScrapedListing } from '../lib/types/scraper';
import { processListingOptions } from '../lib/services/options-manager';

// Only load .env.local if it exists (for local development)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Loaded environment variables from .env.local');
} else {
  console.log('Using environment variables from system/GitHub Actions');
}

// Validate required environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(key => console.error(`   - ${key}`));
  console.error('\nPlease set these in GitHub Secrets or .env.local');
  process.exit(1);
}

// Create Supabase client
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

// Fallback parsing function when fields are missing
function parseListingDetails(listing: ScrapedListing): ScrapedListing {
  // If we already have year and generation, return as-is
  if (listing.year && listing.generation) {
    return listing;
  }
  
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
  
  // Parse trim if not properly set
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
    } else if (title.includes('Carrera')) {
      trim = 'Carrera';
    }
  }
  
  // Infer generation from year if not set
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

// Function to save listings to database
async function saveListings(listings: ScrapedListing[], source: string): Promise<number> {
  let savedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  console.log(`   Processing ${listings.length} listings from ${source}...`);
  
  for (const listing of listings) {
    try {
      // Parse listing details
      const parsed = parseListingDetails(listing);
      
      // If VIN exists, check for duplicates
      if (listing.vin) {
        const { data: existingWithVin } = await supabase
          .from('listings')
          .select('id, source_url, sold_date, price, mileage, options_text')
          .eq('vin', listing.vin)
          .single();
        
        if (existingWithVin && existingWithVin.source_url !== listing.source_url) {
          // Check if it's the same sale (same sold_date) or a relisting
          const isSameSale = existingWithVin.sold_date && listing.sold_date && 
            new Date(existingWithVin.sold_date).toDateString() === new Date(listing.sold_date).toDateString();
          
          if (isSameSale) {
            console.log(`   ⚠️  VIN ${listing.vin} - same sold date, merging duplicate listings`);
            
            // Merge data into the existing listing, preferring non-null values
            const mergedUpdates: any = {};
            if (!existingWithVin.price && listing.price) mergedUpdates.price = listing.price;
            if (!existingWithVin.mileage && listing.mileage) mergedUpdates.mileage = listing.mileage;
            if (!existingWithVin.options_text && listing.options_text) mergedUpdates.options_text = listing.options_text;
            if (listing.exterior_color) mergedUpdates.exterior_color = listing.exterior_color;
            if (listing.interior_color) mergedUpdates.interior_color = listing.interior_color;
            
            if (Object.keys(mergedUpdates).length > 0) {
              const { error: updateError } = await supabase
                .from('listings')
                .update({
                  ...mergedUpdates,
                  scraped_at: new Date().toISOString()
                })
                .eq('id', existingWithVin.id);
              
              if (!updateError) {
                updatedCount++;
                console.log(`   ✓ Merged data into existing listing`);
                // Process options if we just added them
                if (mergedUpdates.options_text) {
                  await processListingOptions(existingWithVin.id, mergedUpdates.options_text);
                }
              }
            }
            continue; // Skip the upsert below since we're merging
          } else {
            console.log(`   ⚠️  VIN ${listing.vin} - different sold dates, this is a relisted car`);
            // Continue with normal upsert, which will handle the duplicate VIN constraint
          }
        }
      }
      
      // First check if this listing already exists
      const { data: existingListing } = await supabase
        .from('listings')
        .select('id, created_at, scraped_at, vin, price, mileage')
        .eq('source_url', listing.source_url)
        .single();
      
      const isExisting = !!existingListing;
      let operation = isExisting ? '🔄 UPDATE' : '✨ INSERT';
      
      // Use upsert to insert or update based on source_url
      const { data: upsertedListing, error } = await supabase
        .from('listings')
        .upsert({
          source,
          source_url: listing.source_url,
          vin: listing.vin,
          year: parsed.year,
          model: parsed.model,
          trim: parsed.trim,
          generation: parsed.generation,
          price: listing.price,
          mileage: listing.mileage,
          exterior_color: listing.exterior_color,
          interior_color: listing.interior_color,
          dealer_name: listing.dealer_name,
          location: listing.location,
          title: listing.title,
          description: listing.description,
          options_text: listing.options_text,
          sold_date: listing.sold_date,
          scraped_at: new Date().toISOString()
        }, {
          onConflict: 'source_url',
          ignoreDuplicates: false  // Update existing records
        })
        .select('id')
        .single();
      
      if (!error && upsertedListing) {
        const carInfo = `${parsed.year || ''} ${parsed.model || ''} ${parsed.trim || ''}`.trim();
        const vinInfo = listing.vin ? ` VIN: ${listing.vin}` : '';
        
        if (isExisting) {
          updatedCount++;
          // Show what changed
          const changes = [];
          if (existingListing.price !== listing.price) changes.push(`price: $${existingListing.price} → $${listing.price}`);
          if (existingListing.mileage !== listing.mileage) changes.push(`miles: ${existingListing.mileage} → ${listing.mileage}`);
          if (!existingListing.vin && listing.vin) changes.push(`added VIN: ${listing.vin}`);
          
          const changesStr = changes.length > 0 ? ` | Changes: ${changes.join(', ')}` : '';
          console.log(`   ${operation}: ${carInfo}${vinInfo}${changesStr}`);
        } else {
          savedCount++;
          console.log(`   ${operation}: ${carInfo}${vinInfo} | Price: $${listing.price} | Miles: ${listing.mileage || 'N/A'}`);
        }
        
        // Process options for the listing
        if (listing.options_text) {
          try {
            await processListingOptions(upsertedListing.id, listing.options_text);
          } catch (optionsError) {
            console.error(`   ⚠️  Error processing options: ${optionsError.message}`);
          }
        }
      } else {
        errorCount++;
        console.error(`   ❌ ERROR: Failed to save listing - ${error?.message}`);
      }
    } catch (err) {
      errorCount++;
      console.error(`   ❌ EXCEPTION: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Log partial listing info for debugging
      console.error(`      Listing: ${listing.title?.substring(0, 50) || 'Unknown'} - ${listing.source_url || 'No URL'}`);
    }
  }
  
  // Summary
  console.log(`   📊 Summary: ${savedCount} new, ${updatedCount} updated, ${errorCount} errors`);
  
  // Return total successful saves/updates
  return savedCount + updatedCount;
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const modelArg = args.find(arg => arg.startsWith('--model='));
  const trimArg = args.find(arg => arg.startsWith('--trim='));
  const maxPagesArg = args.find(arg => arg.startsWith('--max-pages='));
  const saveOnly = args.includes('--save-only');
  
  const source = sourceArg ? sourceArg.split('=')[1].toLowerCase() : null;
  const model = modelArg ? modelArg.split('=')[1].toLowerCase() : null;
  const trim = trimArg ? trimArg.split('=')[1].toLowerCase() : null;
  const maxPagesOverride = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : null;
  
  // Available sources
  const availableSources = ['bat', 'classic', 'carsandbids', 'edmunds', 'cars'];
  
  if (source && !availableSources.includes(source)) {
    console.error(`Invalid source: ${source}`);
    console.log('Available sources:', availableSources.join(', '));
    process.exit(1);
  }
  
  // Display configuration
  console.log('='.repeat(80));
  console.log('PORSCHE TRENDS - COMPREHENSIVE SCRAPER WITH DATABASE SAVE');
  console.log('='.repeat(80));
  if (source) {
    console.log(`Source filter: ${source}`);
  } else {
    console.log('Sources: All (BaT, Classic, Cars&Bids, Edmunds, Cars.com)');
  }
  if (model) {
    console.log(`Model filter: ${model}`);
  }
  if (trim) {
    console.log(`Trim filter: ${trim}`);
  }
  if (maxPagesOverride) {
    console.log(`Max pages override: ${maxPagesOverride} (for all scrapers)`);
  }
  console.log('='.repeat(80));
  console.log('Golden Rule: Storage is cheap, scraping is not');
  console.log('Organization: source/model/trim/date/type/');
  console.log('='.repeat(80) + '\n');
  
  // Import scrapers after dotenv is loaded
  const { BaTScraperPuppeteer } = await import('../lib/scrapers/bat-puppeteer');
  const { ClassicScraper } = await import('../lib/scrapers/classic');
  const { CarsAndBidsScraper } = await import('../lib/scrapers/carsandbids');
  const { EdmundsScraper } = await import('../lib/scrapers/edmunds');
  const { CarsScraper } = await import('../lib/scrapers/cars');
  
  const results = {
    bat: 0,
    classic: 0,
    carsAndBids: 0,
    edmunds: 0,
    cars: 0,
    total: 0,
    saved: 0
  };

  // Run only specific source if specified
  if (source === 'bat' || !source) {
    // Run Bring a Trailer scraper (PRIORITY - best data)
    console.log('='.repeat(50));
    console.log('1. Scraping Bring a Trailer (Priority Source)...');
    console.log('   Using Puppeteer to click "Show More" button');
    console.log('='.repeat(50));
    try {
      // Use Puppeteer version for BaT to handle dynamic loading
      const batScraper = new BaTScraperPuppeteer();
      const batResults = await batScraper.scrapeListings({
        model: model || undefined,
        maxPages: maxPagesOverride !== null ? maxPagesOverride : (model && trim ? 1 : 5),  // Use override if provided
        onlySold: true
      });
      results.bat = batResults.length;
      console.log(`✅ Bring a Trailer: ${batResults.length} sold listings`);
      
      // Save to database
      if (batResults.length > 0) {
        const saved = await saveListings(batResults, 'bring-a-trailer');
        results.saved += saved;
      }
      console.log();
    } catch (error) {
      console.error('❌ Bring a Trailer failed:', error);
    }
  }

  if (source === 'classic' || !source) {
    // Run Classic.com scraper
    console.log('='.repeat(50));
    console.log('2. Scraping Classic.com...');
    console.log('='.repeat(50));
    try {
      const classicScraper = new ClassicScraper();
      const classicResults = await classicScraper.scrapeListings({
        model: model || undefined,
        maxPages: maxPagesOverride !== null ? maxPagesOverride : (model && trim ? 2 : 5),
        onlySold: true
      });
      results.classic = classicResults.length;
      console.log(`✅ Classic.com: ${classicResults.length} sold listings`);
      
      // Save to database
      if (classicResults.length > 0) {
        const saved = await saveListings(classicResults, 'classic');
        results.saved += saved;
      }
      console.log();
    } catch (error) {
      console.error('❌ Classic.com failed:', error);
    }
  }

  if (source === 'carsandbids' || !source) {
    // Run Cars and Bids scraper
    console.log('='.repeat(50));
    console.log('3. Scraping Cars and Bids...');
    console.log('='.repeat(50));
    try {
      const carsAndBidsScraper = new CarsAndBidsScraper();
      const carsAndBidsResults = await carsAndBidsScraper.scrapeListings({
        model: model || undefined,
        maxPages: maxPagesOverride !== null ? maxPagesOverride : (model && trim ? 2 : 5),
        onlySold: true
      });
      results.carsAndBids = carsAndBidsResults.length;
      console.log(`✅ Cars and Bids: ${carsAndBidsResults.length} sold listings`);
      
      // Save to database
      if (carsAndBidsResults.length > 0) {
        const saved = await saveListings(carsAndBidsResults, 'carsandbids');
        results.saved += saved;
      }
      console.log();
    } catch (error) {
      console.error('❌ Cars and Bids failed:', error);
    }
  }

  if (source === 'edmunds' || !source) {
    // Run Edmunds scraper
    console.log('='.repeat(50));
    console.log('4. Scraping Edmunds...');
    console.log('='.repeat(50));
    try {
      const edmundsScraper = new EdmundsScraper();
      const edmundsResults = await edmundsScraper.scrapeListings({
        model: model || undefined,
        maxPages: maxPagesOverride !== null ? maxPagesOverride : (model && trim ? 2 : 5),
        onlySold: true
      });
      results.edmunds = edmundsResults.length;
      console.log(`✅ Edmunds: ${edmundsResults.length} sold listings`);
      
      // Save to database
      if (edmundsResults.length > 0) {
        const saved = await saveListings(edmundsResults, 'edmunds');
        results.saved += saved;
      }
      console.log();
    } catch (error) {
      console.error('❌ Edmunds failed:', error);
    }
  }

  if (source === 'cars' || !source) {
    // Run Cars.com scraper
    console.log('='.repeat(50));
    console.log('5. Scraping Cars.com...');
    console.log('='.repeat(50));
    try {
      const carsScraper = new CarsScraper();
      const carsResults = await carsScraper.scrapeListings({
        model: model || undefined,
        maxPages: maxPagesOverride !== null ? maxPagesOverride : (model && trim ? 2 : 5),
        onlySold: true
      });
      results.cars = carsResults.length;
      console.log(`✅ Cars.com: ${carsResults.length} sold listings`);
      
      // Save to database
      if (carsResults.length > 0) {
        const saved = await saveListings(carsResults, 'cars');
        results.saved += saved;
      }
      console.log();
    } catch (error) {
      console.error('❌ Cars.com failed:', error);
    }
  }

  // Summary
  results.total = results.bat + results.classic + results.carsAndBids + results.edmunds + results.cars;
  
  console.log('='.repeat(50));
  console.log('SCRAPING COMPLETE');
  console.log('='.repeat(50));
  console.log(`Total listings scraped: ${results.total}`);
  console.log(`  - Bring a Trailer: ${results.bat}`);
  console.log(`  - Classic.com: ${results.classic}`);
  console.log(`  - Cars and Bids: ${results.carsAndBids}`);
  console.log(`  - Edmunds: ${results.edmunds}`);
  console.log(`  - Cars.com: ${results.cars}`);
  console.log('\nDatabase Summary:');
  console.log(`  ✅ Total saved/updated: ${results.saved}`);
  
  if (results.total === 0) {
    console.log('\n⚠️ No listings were scraped. Check scraper configurations.');
  } else if (results.saved === 0) {
    console.log('\n⚠️ No listings were saved to database. Check database connection.');
  } else {
    console.log('\n✅ Data successfully stored in database!');
  }
}

// Global error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:');
  console.error(error);
  console.error('\nAttempting graceful shutdown...');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  console.error('\nAttempting graceful shutdown...');
  process.exit(1);
});

// Handle SIGINT (Ctrl+C) and SIGTERM gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️ Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run main with error handling
main().catch((error) => {
  console.error('❌ FATAL ERROR in main:');
  console.error(error);
  process.exit(1);
});