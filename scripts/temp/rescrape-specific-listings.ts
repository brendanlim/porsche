#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import { BrightDataPuppeteer } from '../../lib/scrapers/bright-data-puppeteer';
import { BaTScraperPuppeteer } from '../../lib/scrapers/bat-puppeteer';
import { HTMLStorageService } from '../../lib/services/html-storage';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function rescrapeSpecificListings() {
  console.log('🔍 Finding GT4 RS listings without colors...\n');

  // Get GT4 RS listings from BaT without colors
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, source, source_url, year, model, trim')
    .ilike('trim', '%GT4 RS%')
    .eq('source', 'bring-a-trailer')
    .is('exterior_color', null);

  if (error || !listings) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings.length} GT4 RS BaT listings without colors:\n`);

  if (listings.length === 0) {
    console.log('No listings to process');
    return;
  }

  // Display the listings we'll process
  listings.forEach((listing, idx) => {
    console.log(`  ${idx + 1}. ${listing.year} ${listing.model} ${listing.trim}`);
    console.log(`     VIN: ${listing.vin || 'N/A'}`);
    console.log(`     URL: ${listing.source_url}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('Starting re-scrape of individual listings...');
  console.log('='.repeat(70));

  // Initialize services
  const brightDataScraper = new BrightDataPuppeteer();
  const batScraper = new BaTScraperPuppeteer();
  const htmlStorage = new HTMLStorageService();

  // Process each listing individually
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`\n[${i + 1}/${listings.length}] Processing ${listing.year} GT4 RS`);
    console.log(`  URL: ${listing.source_url}`);

    try {
      // Fetch the detail page HTML using BrightData
      const pageData = await brightDataScraper.scrapeListingPage(listing.source_url);

      if (pageData && pageData.html) {
        console.log('  ✅ Successfully fetched page');

        // Store the HTML
        await htmlStorage.storeScrapedHTML({
          source: 'bring-a-trailer',
          url: listing.source_url,
          html: pageData.html,
          type: 'detail',
          model: listing.model || 'unknown',
          trim: listing.trim || '',
        });

        // Parse the detail page for data
        const parsed = await batScraper.parseListing(pageData.html, listing.source_url);

        if (parsed) {
          // Update the listing with parsed data
          const updateData: any = {};

          if (parsed.exterior_color) {
            updateData.exterior_color = parsed.exterior_color;
            console.log(`  🎨 Exterior color: ${parsed.exterior_color}`);
          }
          if (parsed.interior_color) {
            updateData.interior_color = parsed.interior_color;
            console.log(`  🎨 Interior color: ${parsed.interior_color}`);
          }
          if (parsed.mileage) {
            updateData.mileage = parsed.mileage;
          }

          // Handle VIN separately to check for duplicates
          if (parsed.vin && !listing.vin) {
            // Check if this VIN already exists in another listing
            const { data: existingVin } = await supabase
              .from('listings')
              .select('id')
              .eq('vin', parsed.vin)
              .single();

            if (!existingVin) {
              updateData.vin = parsed.vin;
              console.log(`  🔑 VIN: ${parsed.vin}`);
            } else {
              console.log(`  ⚠️  VIN ${parsed.vin} already exists in another listing`);
            }
          }

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('listings')
              .update(updateData)
              .eq('id', listing.id);

            if (updateError) {
              console.error(`  ❌ Failed to update: ${updateError.message}`);
              failureCount++;
            } else {
              console.log('  ✅ Updated listing in database');
              successCount++;
            }
          } else {
            console.log('  ⚠️  No new data to update');
            failureCount++;
          }
        } else {
          console.log('  ⚠️  Failed to parse listing data');
          failureCount++;
        }
      } else {
        console.log('  ❌ Failed to fetch page');
        failureCount++;
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failureCount++;
    }
  }

  // Clean up
  await brightDataScraper.close();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${listings.length}`);
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);

  // Show updated color distribution
  console.log('\n🔍 Verifying GT4 RS color distribution...\n');

  const { data: allGT4RS } = await supabase
    .from('listings')
    .select('exterior_color')
    .ilike('trim', '%GT4 RS%')
    .not('exterior_color', 'is', null);

  if (allGT4RS) {
    const colorCounts: Record<string, number> = {};
    allGT4RS.forEach(l => {
      let color = l.exterior_color || 'Unknown';
      // Normalize Arctic Grey to Arctic Gray
      if (color === 'Arctic Grey') color = 'Arctic Gray';
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });

    console.log('GT4 RS Color Distribution:');
    Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([color, count]) => {
        const percentage = ((count / allGT4RS.length) * 100).toFixed(1);
        console.log(`  ${color}: ${count} listings (${percentage}%)`);
      });

    // Check coverage
    const { count: totalCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .ilike('trim', '%GT4 RS%');

    const coverage = totalCount ? ((allGT4RS.length / totalCount) * 100).toFixed(1) : 0;
    console.log(`\n📊 Color data coverage: ${allGT4RS.length}/${totalCount} (${coverage}%)`);
  }
}

rescrapeSpecificListings().catch(console.error);