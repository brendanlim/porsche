#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import { BrightDataPuppeteer } from '../../lib/scrapers/bright-data-puppeteer';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function extractBaTColors(html: string): Promise<{ exterior?: string; interior?: string }> {
  const $ = cheerio.load(html);
  const colors: { exterior?: string; interior?: string } = {};

  // Try various selectors for exterior color
  $('.essentials-item').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('Exterior Color:')) {
      colors.exterior = text.replace('Exterior Color:', '').trim();
    }
    if (text.includes('Interior Color:')) {
      colors.interior = text.replace('Interior Color:', '').trim();
    }
  });

  // Alternative: Look in details section
  if (!colors.exterior) {
    $('dt').each((_, dt) => {
      const label = $(dt).text().trim();
      if (label.includes('Exterior')) {
        const value = $(dt).next('dd').text().trim();
        if (value) colors.exterior = value;
      }
      if (label.includes('Interior')) {
        const value = $(dt).next('dd').text().trim();
        if (value) colors.interior = value;
      }
    });
  }

  // Look in listing description for Paint-To-Sample colors
  if (!colors.exterior) {
    const description = $('.body-copy').text() || $('.listing-description').text();
    const ptsMatch = description.match(/Paint[- ]?To[- ]?Sample\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (ptsMatch) {
      colors.exterior = `Paint-To-Sample ${ptsMatch[1]}`;
    }
  }

  return colors;
}

async function fetchGT4RSColors() {
  console.log('🔍 Fetching GT4 RS BaT listings without colors...\n');

  // Get GT4 RS listings from BaT without colors
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, source_url, year, exterior_color')
    .ilike('trim', '%GT4 RS%')
    .eq('source', 'bring-a-trailer')
    .is('exterior_color', null);

  if (error || !listings) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings.length} GT4 RS BaT listings without colors\n`);

  if (listings.length === 0) {
    console.log('No listings to process');
    return;
  }

  const brightData = new BrightDataPuppeteer();
  let updated = 0;
  let failed = 0;

  for (const listing of listings) {
    console.log(`\n📋 Processing: ${listing.year} GT4 RS`);
    console.log(`   URL: ${listing.source_url}`);

    try {
      // Fetch the listing page
      console.log('   🌐 Fetching page...');
      const html = await brightData.fetchPage(listing.source_url);

      if (!html) {
        console.log('   ❌ Failed to fetch page');
        failed++;
        continue;
      }

      // Extract colors
      const colors = await extractBaTColors(html);

      if (colors.exterior || colors.interior) {
        console.log(`   🎨 Found colors:`);
        if (colors.exterior) console.log(`      Exterior: ${colors.exterior}`);
        if (colors.interior) console.log(`      Interior: ${colors.interior}`);

        // Update the listing
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            exterior_color: colors.exterior || null,
            interior_color: colors.interior || null,
          })
          .eq('id', listing.id);

        if (updateError) {
          console.error(`   ❌ Failed to update: ${updateError.message}`);
          failed++;
        } else {
          console.log('   ✅ Updated successfully');
          updated++;
        }
      } else {
        console.log('   ⚠️  No colors found in HTML');
        failed++;
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  await brightData.close();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${listings.length}`);
  console.log(`✅ Successfully updated: ${updated}`);
  console.log(`❌ Failed: ${failed}`);

  // Verify colors
  if (updated > 0) {
    const { data: colorData } = await supabase
      .from('listings')
      .select('exterior_color')
      .ilike('trim', '%GT4 RS%')
      .not('exterior_color', 'is', null);

    const colorCounts: Record<string, number> = {};
    colorData?.forEach(l => {
      let color = l.exterior_color || 'Unknown';
      // Normalize Arctic Grey to Arctic Gray
      if (color === 'Arctic Grey') color = 'Arctic Gray';
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });

    console.log('\nTop GT4 RS Colors:');
    Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([color, count]) => {
        console.log(`  ${color}: ${count}`);
      });
  }
}

fetchGT4RSColors().catch(console.error);