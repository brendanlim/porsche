#!/usr/bin/env npx tsx
// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ScrapedListing } from '../../lib/types/scraper';
import { processListingOptions } from '../../lib/services/options-manager';

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
  
  // Parse trim if not properly set for 718/Cayman models
  if ((model?.includes('718') || model?.includes('Cayman')) && (!trim || trim === 'Unknown' || trim === 'GT4')) {
    // Check GT4 RS FIRST (more specific)
    if (title.includes('GT4 RS') || title.includes('GT4RS')) {
      trim = 'GT4 RS';
    } else if (title.includes('GT4 Clubsport')) {
      trim = 'GT4 Clubsport';
    } else if (title.includes('GT4') && !title.includes('RS')) {
      // Only set GT4 if RS is NOT in the title
      trim = 'GT4';
    } else if (title.includes('GTS 4.0')) {
      trim = 'GTS 4.0';
    } else if (title.includes('GTS')) {
      trim = 'GTS';
    } else if (title.includes('Spyder')) {
      trim = 'Spyder';
    } else if (title.includes(' S ') || title.includes(' S')) {
      trim = 'S';
    }
  }

  // Parse trim if not properly set for 911 models
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

  console.log(`\n📊 Processing ${listings.length} listings from ${source}`);
  console.log('─'.repeat(60));

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

        if (existingWithVin) {
          if (existingWithVin.source_url === listing.source_url) {
            // Same URL, this is an update to existing listing
            // Continue to the upsert below which will update it
          } else {
            // Different URL but same VIN - this is either a duplicate or relisted car
            const isSameSale = existingWithVin.sold_date && listing.sold_date &&
              new Date(existingWithVin.sold_date).toDateString() === new Date(listing.sold_date).toDateString();

            if (isSameSale) {
              // Same VIN, same sold date, different URL = duplicate listing of same sale
              // Merge data into existing listing
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
                  console.log(`  🔀 MERGE: VIN ${listing.vin.slice(-8)} (duplicate listing)`);
                  // Process options if we just added them
                  if (mergedUpdates.options_text) {
                    await processListingOptions(existingWithVin.id, mergedUpdates.options_text);
                  }
                }
              } else {
                skippedCount++;
                console.log(`  ⏭️  SKIP: VIN ${listing.vin.slice(-8)} (duplicate, no new data)`);
              }
              continue; // Skip the upsert below since we handled the duplicate
            } else {
              // Different sold dates = relisted car
              // Update the existing record with the new listing URL and data
              const { error: updateError } = await supabase
                .from('listings')
                .update({
                  source_url: listing.source_url,
                  price: listing.price,
                  sold_date: listing.sold_date,
                  mileage: listing.mileage || existingWithVin.mileage,
                  options_text: listing.options_text || existingWithVin.options_text,
                  exterior_color: listing.exterior_color,
                  interior_color: listing.interior_color,
                  scraped_at: new Date().toISOString()
                })
                .eq('vin', listing.vin);

              if (!updateError) {
                updatedCount++;
                const priceDiff = listing.price - existingWithVin.price;
                const priceChange = priceDiff > 0 ? `+$${priceDiff.toLocaleString()}` : `-$${Math.abs(priceDiff).toLocaleString()}`;
                console.log(`  🔄 RELIST: VIN ${listing.vin.slice(-8)} | ${priceChange}`);
              } else {
                errorCount++;
                console.error(`  ❌ ERROR: Failed to update relisted VIN ${listing.vin.slice(-8)}`);
              }
              continue; // Skip the upsert below since we handled the relisting
            }
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
          list_date: listing.list_date,
          scraped_at: new Date().toISOString()
        }, {
          onConflict: 'source_url',
          ignoreDuplicates: false  // Update existing records
        })
        .select('id')
        .single();

      if (!error && upsertedListing) {
        const carInfo = `${parsed.year || ''} ${parsed.model || ''} ${parsed.trim || ''}`.trim();
        const vinDisplay = listing.vin ? listing.vin.slice(-8) : 'NO-VIN';

        if (isExisting) {
          updatedCount++;
          // Only show significant changes
          const changes = [];
          if (existingListing.price !== listing.price && listing.price) {
            const priceDiff = Math.abs(listing.price - existingListing.price);
            if (priceDiff > 100) { // Only show price changes > $100
              changes.push(`$${existingListing.price?.toLocaleString() || '0'}→$${listing.price.toLocaleString()}`);
            }
          }
          if (!existingListing.vin && listing.vin) changes.push(`+VIN`);
          if (existingListing.mileage !== listing.mileage && listing.mileage) {
            const mileDiff = Math.abs((listing.mileage || 0) - (existingListing.mileage || 0));
            if (mileDiff > 10) { // Only show mile changes > 10
              changes.push(`${existingListing.mileage?.toLocaleString() || '?'}→${listing.mileage.toLocaleString()}mi`);
            }
          }

          if (changes.length > 0) {
            console.log(`  🔄 UPDATE: ${carInfo} [${vinDisplay}] | ${changes.join(', ')}`);
          } else {
            // Silent update if no significant changes
            updatedCount--; // Don't count as an update if nothing changed
            skippedCount++;
          }
        } else {
          savedCount++;
          const details = [];
          if (listing.price) details.push(`$${listing.price.toLocaleString()}`);
          if (listing.mileage) details.push(`${listing.mileage.toLocaleString()}mi`);
          console.log(`  ✅ NEW: ${carInfo} [${vinDisplay}] | ${details.join(' | ')}`);
        }

        // Process options for the listing
        if (listing.options_text) {
          try {
            await processListingOptions(upsertedListing.id, listing.options_text);
            // Silent success - don't log unless there's an error
          } catch (optionsError) {
            console.error(`     ⚠️  Options error: ${optionsError.message}`);
          }
        }
      } else {
        errorCount++;
        const errorMsg = error?.message?.includes('duplicate key')
          ? 'Duplicate VIN conflict'
          : error?.message || 'Unknown error';
        console.error(`  ❌ ERROR: ${errorMsg}`);
      }
    } catch (err) {
      errorCount++;
      console.error(`   ❌ EXCEPTION: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Log partial listing info for debugging
      console.error(`      Listing: ${listing.title?.substring(0, 50) || 'Unknown'} - ${listing.source_url || 'No URL'}`);
    }
  }
  
  // Summary
  console.log('─'.repeat(60));
  const totalProcessed = savedCount + updatedCount + skippedCount;
  console.log(`📊 Summary: ${savedCount} new | ${updatedCount} updated | ${skippedCount} skipped | ${errorCount} errors`);
  if (totalProcessed > 0) {
    const successRate = Math.round(((savedCount + updatedCount) / totalProcessed) * 100);
    console.log(`✨ Success rate: ${successRate}% (${savedCount + updatedCount}/${totalProcessed} processed)`);
  }

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
  const typeArg = args.find(arg => arg.startsWith('--type='));
  const saveOnly = args.includes('--save-only');
  
  const source = sourceArg ? sourceArg.split('=')[1].toLowerCase() : null;
  const model = modelArg ? modelArg.split('=')[1].toLowerCase() : null;
  const trim = trimArg ? trimArg.split('=')[1].toLowerCase() : null;
  const maxPagesOverride = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : null;
  const type = typeArg ? typeArg.split('=')[1].toLowerCase() : 'both'; // 'sold', 'active', or 'both'
  
  // Available sources
  const availableSources = ['bat', 'classic', 'carsandbids', 'edmunds', 'cars', 'autotrader'];
  
  if (source && !availableSources.includes(source)) {
    console.error(`Invalid source: ${source}`);
    console.log('Available sources:', availableSources.join(', '));
    process.exit(1);
  }
  
  // Display configuration
  console.log('\n' + '█'.repeat(80));
  console.log(' '.repeat(10) + 'PORSCHE TRENDS - COMPREHENSIVE SCRAPER WITH DATABASE SAVE');
  console.log('█'.repeat(80));
  console.log('\n📋 CONFIGURATION:');
  console.log('─'.repeat(40));
  if (source) {
    console.log(`  • Source filter: ${source}`);
  } else {
    const sources = type === 'active'
      ? 'Cars.com, AutoTrader'
      : type === 'sold'
      ? 'BaT, Classic, Cars&Bids'
      : 'All sources';
    console.log(`  • Sources: ${sources}`);
  }
  console.log(`  • Listing type: ${type.toUpperCase()}`);
  if (model) console.log(`  • Model filter: ${model}`);
  if (trim) console.log(`  • Trim filter: ${trim}`);
  if (maxPagesOverride) console.log(`  • Max pages: ${maxPagesOverride}`);
  console.log('─'.repeat(40));
  
  // Import scrapers after dotenv is loaded
  const { BaTScraperPuppeteer } = await import('../../lib/scrapers/bat-puppeteer');
  const { ClassicScraper } = await import('../../lib/scrapers/classic');
  const { CarsAndBidsScraper } = await import('../../lib/scrapers/carsandbids');
  const { EdmundsScraper } = await import('../../lib/scrapers/edmunds');
  const { CarsScraper } = await import('../../lib/scrapers/cars');
  const { AutoTraderScraper } = await import('../../lib/scrapers/autotrader');
  
  const results = {
    bat: 0,
    classic: 0,
    carsAndBids: 0,
    edmunds: 0,
    cars: 0,
    autotrader: 0,
    total: 0,
    saved: 0
  };

  // SOLD LISTINGS SCRAPERS
  if (type === 'sold' || type === 'both') {
    console.log('\n' + '▓'.repeat(80));
    console.log(' '.repeat(25) + '📋 SCRAPING SOLD LISTINGS');
    console.log('▓'.repeat(80));
    
    // Run only specific source if specified
    if (source === 'bat' || (!source && type !== 'active')) {
      // Run Bring a Trailer scraper (PRIORITY - best data)
      console.log('\n' + '═'.repeat(60));
      console.log('🎯 [1/6] BRING A TRAILER');
      console.log('═'.repeat(60));

      try {
        // Use Puppeteer version for BaT to handle dynamic loading
        const batScraper = new BaTScraperPuppeteer();
        const batResults = await batScraper.scrapeListings({
          model: model || undefined,
          maxPages: maxPagesOverride !== null ? maxPagesOverride : 1,  // Default to 1 for daily scraper
          onlySold: true
        });
        results.bat = batResults.length;

        // Save to database
        if (batResults.length > 0) {
          const saved = await saveListings(batResults, 'bring-a-trailer');
          results.saved += saved;
        }
      } catch (error) {
        console.error('❌ Bring a Trailer failed:', error);
      }
    }

    if (source === 'classic' || (!source && type !== 'active')) {
      // Run Classic.com scraper
      console.log('\n' + '═'.repeat(60));
      console.log('🎯 [2/6] CLASSIC.COM');
      console.log('═'.repeat(60));

      try {
      const classicScraper = new ClassicScraper();
      const classicResults = await classicScraper.scrapeListings({
        model: model || undefined,
        maxPages: maxPagesOverride !== null ? maxPagesOverride : 1,  // Default to 1 for daily scraper
        onlySold: false  // Classic.com has auctions (status='auction') that we want to include
      });
      results.classic = classicResults.length;
        results.classic = classicResults.length;

        // Save to database
        if (classicResults.length > 0) {
          const saved = await saveListings(classicResults, 'classic');
          results.saved += saved;
        }
      } catch (error) {
        console.error('❌ Classic.com failed:', error);
      }
    }

    if (source === 'carsandbids' || !source) {
      // Run Cars and Bids scraper
      console.log('\n' + '═'.repeat(60));
      console.log('🎯 [3/6] CARS AND BIDS');
      console.log('═'.repeat(60));

      try {
      const carsAndBidsScraper = new CarsAndBidsScraper();
      const carsAndBidsResults = await carsAndBidsScraper.scrapeListings({
        model: model || undefined,
        maxPages: maxPagesOverride !== null ? maxPagesOverride : 1,  // Default to 1 for daily scraper
        onlySold: true
      });
      results.carsAndBids = carsAndBidsResults.length;
        results.carsAndBids = carsAndBidsResults.length;

        // Save to database
        if (carsAndBidsResults.length > 0) {
          const saved = await saveListings(carsAndBidsResults, 'carsandbids');
          results.saved += saved;
        }
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
        maxPages: maxPagesOverride !== null ? maxPagesOverride : 1,  // Default to 1 for daily scraper
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
        maxPages: maxPagesOverride !== null ? maxPagesOverride : 1,  // Default to 1 for daily scraper
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
  } // End sold listings section
  
  // ACTIVE LISTINGS SCRAPERS
  if (type === 'active' || type === 'both') {
    console.log('\n' + '▓'.repeat(80));
    console.log(' '.repeat(25) + '📋 SCRAPING ACTIVE LISTINGS');
    console.log('▓'.repeat(80));
    
    // Cars.com (Active listings)
    if (source === 'cars' || (!source && type !== 'sold')) {
      console.log('='.repeat(50));
      console.log('Cars.com - Active Listings...');
      console.log('='.repeat(50));
      try {
        const carsScraper = new CarsScraper();
        const carsResults = await carsScraper.scrapeListings(
          model || '911',
          trim,
          false // onlySold = false for active listings
        );
        results.cars = carsResults.length;
        console.log(`✅ Cars.com: ${carsResults.length} active listings`);
        
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
    
    // AutoTrader (Active listings only)
    if (source === 'autotrader' || (!source && type !== 'sold')) {
      console.log('='.repeat(50));
      console.log('AutoTrader - Active Listings...');
      console.log('='.repeat(50));
      try {
        const autotraderScraper = new AutoTraderScraper();
        const autotraderResults = await autotraderScraper.scrapeListings(
          model || '911',
          trim,
          false // onlySold = false (AutoTrader only has active)
        );
        results.autotrader = autotraderResults.length;
        console.log(`✅ AutoTrader: ${autotraderResults.length} active listings`);
        
        // Save to database
        if (autotraderResults.length > 0) {
          const saved = await saveListings(autotraderResults, 'autotrader');
          results.saved += saved;
        }
        console.log();
      } catch (error) {
        console.error('❌ AutoTrader failed:', error);
      }
    }
  } // End active listings section

  // Summary
  results.total = results.bat + results.classic + results.carsAndBids + results.edmunds + results.cars + results.autotrader;

  console.log('\n' + '█'.repeat(80));
  console.log(' '.repeat(30) + '🏁 SCRAPING COMPLETE');
  console.log('█'.repeat(80));
  console.log('\n📊 FINAL SUMMARY:');
  console.log('─'.repeat(40));
  console.log(`  Total listings scraped: ${results.total}`);
  if (type === 'sold' || type === 'both') {
    console.log('\n  Sold Listings:');
    if (results.bat > 0) console.log(`    • Bring a Trailer: ${results.bat}`);
    if (results.classic > 0) console.log(`    • Classic.com: ${results.classic}`);
    if (results.carsAndBids > 0) console.log(`    • Cars and Bids: ${results.carsAndBids}`);
    if (results.edmunds > 0) console.log(`    • Edmunds: ${results.edmunds}`);
  }
  if (type === 'active' || type === 'both') {
    console.log('\n  Active Listings:');
    if (results.cars > 0) console.log(`    • Cars.com: ${results.cars}`);
    if (results.autotrader > 0) console.log(`    • AutoTrader: ${results.autotrader}`);
  }
  console.log('\n  Database:');
  console.log(`    ✅ Total saved/updated: ${results.saved}`);
  console.log('─'.repeat(40));
  
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