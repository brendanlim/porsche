#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { CarsAndBidsPuppeteerScraper } from '../../lib/scrapers/carsandbids-puppeteer';
import { supabaseAdmin } from '../../lib/supabase/admin';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function scrapeGTModels() {
  console.log('Cars and Bids GT3 & GT4 RS Scraper');
  console.log('=' .repeat(60));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const scraper = new CarsAndBidsPuppeteerScraper();
  const allListings: any[] = [];

  try {
    // Scrape for general Porsche listings (since specific searches don't work well)
    console.log('Scraping Cars and Bids for Porsche listings...\n');

    const listings = await scraper.scrapeListings({
      maxPages: 3, // Get more pages to find GT models
      onlySold: true // Focus on sold cars for price data
    });

    console.log(`Found ${listings.length} total listings\n`);

    // Filter for GT3 and GT4 RS
    const gt3Listings = listings.filter(l =>
      l.trim?.toLowerCase().includes('gt3') ||
      l.title?.toLowerCase().includes('gt3')
    );

    const gt4rsListings = listings.filter(l =>
      l.trim?.toLowerCase().includes('gt4 rs') ||
      l.title?.toLowerCase().includes('gt4 rs') ||
      l.title?.toLowerCase().includes('gt4rs')
    );

    const gt4Listings = listings.filter(l =>
      (l.trim?.toLowerCase().includes('gt4') ||
       l.title?.toLowerCase().includes('gt4')) &&
      !l.title?.toLowerCase().includes('gt4 rs') &&
      !l.title?.toLowerCase().includes('gt4rs')
    );

    console.log('GT Model Breakdown:');
    console.log(`  - GT3 (including GT3 RS): ${gt3Listings.length}`);
    console.log(`  - GT4 RS: ${gt4rsListings.length}`);
    console.log(`  - GT4 (non-RS): ${gt4Listings.length}\n`);

    // Combine GT listings
    const gtListings = [...gt3Listings, ...gt4rsListings, ...gt4Listings];

    if (gtListings.length === 0) {
      console.log('No GT models found in current listings');
      return;
    }

    // Display found listings
    console.log('Found GT Models:');
    console.log('-'.repeat(60));

    gtListings.forEach(listing => {
      console.log(`\n${listing.title}`);
      console.log(`  Model: ${listing.model}, Trim: ${listing.trim}`);
      console.log(`  Year: ${listing.year || 'N/A'}`);
      console.log(`  Price: ${listing.price ? `$${listing.price.toLocaleString()}` : 'N/A'}`);
      console.log(`  Mileage: ${listing.mileage ? `${listing.mileage.toLocaleString()} miles` : 'N/A'}`);
      console.log(`  Status: ${listing.status}`);
      console.log(`  URL: ${listing.url}`);
      if (listing.vin) {
        console.log(`  VIN: ${listing.vin}`);
      }
      if (listing.sold_date) {
        console.log(`  Sold Date: ${listing.sold_date}`);
      }
    });

    // Save to database
    console.log('\n' + '='.repeat(60));
    console.log('Saving to database...\n');

    let savedCount = 0;
    let skippedCount = 0;

    for (const listing of gtListings) {
      // Skip if no price or VIN
      if (!listing.price || listing.price === 0) {
        console.log(`⚠️ Skipping ${listing.title} - no price`);
        skippedCount++;
        continue;
      }

      // Prepare database record
      const dbRecord = {
        vin: listing.vin || `CAB-${listing.url?.split('/').pop()}`, // Use URL as fallback ID
        title: listing.title,
        price: listing.price,
        sold_price: listing.status === 'Sold' ? listing.price : null,
        mileage: listing.mileage,
        year: listing.year,
        make: 'Porsche',
        model: listing.model,
        trim: listing.trim,
        exterior_color: listing.exterior_color,
        interior_color: listing.interior_color,
        transmission: listing.transmission,
        engine: listing.engine,
        drivetrain: listing.drivetrain,
        location_city: listing.location?.city,
        location_state: listing.location?.state,
        location_zip: listing.location?.zip,
        seller_location: listing.seller_location,
        images: listing.images || [],
        url: listing.url,
        source: 'carsandbids',
        status: listing.status,
        sold_date: listing.sold_date,
        scraped_at: new Date().toISOString()
      };

      try {
        // Upsert to database (update if exists, insert if new)
        const { data, error } = await supabaseAdmin
          .from('listings')
          .upsert(dbRecord, {
            onConflict: 'vin',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ Failed to save ${listing.title}:`, error.message);
        } else {
          console.log(`✅ Saved ${listing.title}`);
          savedCount++;
        }
      } catch (error) {
        console.error(`❌ Error saving ${listing.title}:`, error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`  Total GT models found: ${gtListings.length}`);
    console.log(`  Saved to database: ${savedCount}`);
    console.log(`  Skipped (no price): ${skippedCount}`);
    console.log(`\nCompleted at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('Scraping failed:', error);
    process.exit(1);
  }
}

// Run the scraper
scrapeGTModels().catch(console.error);