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

async function updateGT4RSColors() {
  console.log('🔍 Finding GT4 RS listings without colors...\n');

  // Get ALL GT4 RS listings without colors (not just BaT)
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, source, source_url, year, model, trim')
    .ilike('trim', '%GT4 RS%')
    .is('exterior_color', null);

  if (error || !listings) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings.length} GT4 RS listings without colors\n`);

  // Group by source
  const bySource: Record<string, typeof listings> = {};
  listings.forEach(l => {
    if (!bySource[l.source]) bySource[l.source] = [];
    bySource[l.source].push(l);
  });

  console.log('By source:');
  Object.entries(bySource).forEach(([source, items]) => {
    console.log(`  • ${source}: ${items.length} listings`);
  });

  // Focus on BaT listings first since we have a scraper for them
  const batListings = bySource['bring-a-trailer'] || [];

  if (batListings.length === 0) {
    console.log('\nNo BaT listings to process');
    return;
  }

  console.log(`\n${batListings.length} BaT listings to process:\n`);
  batListings.forEach((listing, idx) => {
    console.log(`  ${idx + 1}. ${listing.year} ${listing.model} ${listing.trim}`);
    console.log(`     VIN: ${listing.vin || 'N/A'}`);
    console.log(`     URL: ${listing.source_url}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('Fetching color data from BaT listings...');
  console.log('='.repeat(70));

  // Initialize services
  const brightDataScraper = new BrightDataPuppeteer();
  const batScraper = new BaTScraperPuppeteer();
  const htmlStorage = new HTMLStorageService();

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < batListings.length; i++) {
    const listing = batListings[i];
    console.log(`\n[${i + 1}/${batListings.length}] Processing ${listing.year} GT4 RS`);
    console.log(`  URL: ${listing.source_url}`);

    try {
      // Fetch the detail page HTML
      const pageData = await brightDataScraper.scrapeListingPage(listing.source_url);

      if (pageData && pageData.html) {
        console.log('  ✅ Successfully fetched page');

        // Store the HTML for future reference
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
          // Only update color data and mileage, NOT VIN (to avoid duplicates)
          const updateData: any = {};

          if (parsed.exterior_color) {
            updateData.exterior_color = parsed.exterior_color;
            console.log(`  🎨 Exterior color: ${parsed.exterior_color}`);
          }
          if (parsed.interior_color) {
            updateData.interior_color = parsed.interior_color;
            console.log(`  🎨 Interior color: ${parsed.interior_color}`);
          }
          if (parsed.mileage && parsed.mileage > 0) {
            updateData.mileage = parsed.mileage;
            console.log(`  📏 Mileage: ${parsed.mileage.toLocaleString()}`);
          }

          // Found VIN but not updating it to avoid duplicates
          if (parsed.vin && !listing.vin) {
            console.log(`  🔑 Found VIN: ${parsed.vin} (not updating to avoid duplicates)`);
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
              console.log('  ✅ Updated listing with color data');
              successCount++;
            }
          } else {
            console.log('  ⚠️  No color data found to update');
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
  console.log(`Total processed: ${batListings.length}`);
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

updateGT4RSColors().catch(console.error);