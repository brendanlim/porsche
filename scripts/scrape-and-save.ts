#!/usr/bin/env npx tsx
// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { ScrapedListing } from '../lib/types/scraper';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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

// Function to save listings to database
async function saveListings(listings: ScrapedListing[], source: string): Promise<number> {
  let savedCount = 0;
  let updatedCount = 0;
  
  for (const listing of listings) {
    try {
      // Check if listing already exists (by VIN or source_url)
      let existingId = null;
      
      if (listing.vin) {
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('vin', listing.vin)
          .single();
        
        if (existing) existingId = existing.id;
      }
      
      // If not found by VIN, check by source URL
      if (!existingId && listing.source_url) {
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('source_url', listing.source_url)
          .single();
        
        if (existing) existingId = existing.id;
      }
      
      if (existingId) {
        // Update existing listing
        const { error } = await supabase
          .from('listings')
          .update({
            price: listing.price,
            mileage: listing.mileage,
            sold_date: listing.sold_date,
            vin: listing.vin || undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingId);
        
        if (!error) {
          updatedCount++;
        } else {
          console.error(`Failed to update listing: ${error.message}`);
        }
      } else {
        // Insert new listing
        const { error } = await supabase
          .from('listings')
          .insert({
            source,
            source_url: listing.source_url,
            vin: listing.vin,
            year: listing.year,
            model: listing.model,
            trim: listing.trim,
            generation: listing.generation,
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
          });
        
        if (!error) {
          savedCount++;
        } else {
          console.error(`Failed to save listing: ${error.message}`);
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
  // Parse command line arguments
  const args = process.argv.slice(2);
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const modelArg = args.find(arg => arg.startsWith('--model='));
  const trimArg = args.find(arg => arg.startsWith('--trim='));
  const saveOnly = args.includes('--save-only');
  
  const source = sourceArg ? sourceArg.split('=')[1].toLowerCase() : null;
  const model = modelArg ? modelArg.split('=')[1].toLowerCase() : null;
  const trim = trimArg ? trimArg.split('=')[1].toLowerCase() : null;
  
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
        maxPages: model && trim ? 1 : 5,  // Just 1 page for specific model/trim
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
        maxPages: model && trim ? 2 : 5,
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
        maxPages: model && trim ? 2 : 5,
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
        maxPages: model && trim ? 2 : 5,
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
        maxPages: model && trim ? 2 : 5,
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

main().catch(console.error);