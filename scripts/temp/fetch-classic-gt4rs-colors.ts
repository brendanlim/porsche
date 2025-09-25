#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Simple fetch with user-agent
async function fetchClassicPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

function extractColors(html: string): { exterior?: string; interior?: string } {
  const $ = cheerio.load(html);
  const colors: { exterior?: string; interior?: string } = {};

  // Look for color information in various places
  // Classic.com typically shows colors in the specs section

  // Method 1: Look for "Ext. Color Group" and "Int. Color Group" pattern
  const allText = $('body').text();

  // Try to find exterior color
  const extColorMatch = allText.match(/Ext\.\s*Color\s*Group\s*([A-Za-z\s]+?)(?:Int\.|$)/i);
  if (extColorMatch) {
    colors.exterior = extColorMatch[1].trim();
  }

  // Try to find interior color
  const intColorMatch = allText.match(/Int\.\s*Color\s*Group\s*([A-Za-z\s]+?)(?:Year|Make|Model|$)/i);
  if (intColorMatch) {
    colors.interior = intColorMatch[1].trim();
  }

  // Method 2: Look in definition lists or spec tables
  $('dt, dd').each((i, elem) => {
    const text = $(elem).text().trim();
    const nextElem = $(elem).next();

    if (text.includes('Ext. Color Group') || text.includes('Exterior Color')) {
      if (nextElem.length) {
        colors.exterior = nextElem.text().trim();
      }
    }
    if (text.includes('Int. Color Group') || text.includes('Interior Color')) {
      if (nextElem.length) {
        colors.interior = nextElem.text().trim();
      }
    }
  });

  // Method 3: Look in divs with specific patterns
  $('div').each((i, elem) => {
    const text = $(elem).text().trim();

    // Look for patterns like "Ext. Color Group Gray"
    if (text.startsWith('Ext. Color Group')) {
      const color = text.replace('Ext. Color Group', '').trim();
      if (color && !color.includes('Int.')) {
        colors.exterior = color;
      }
    }
    if (text.startsWith('Int. Color Group')) {
      const color = text.replace('Int. Color Group', '').trim();
      if (color) {
        colors.interior = color;
      }
    }
  });

  // Clean up the colors
  if (colors.exterior) {
    // Remove any trailing text that might have been captured
    colors.exterior = colors.exterior.split(/\n|\r|Year|Make|Model|Int\./)[0].trim();
  }
  if (colors.interior) {
    // Remove any trailing text
    colors.interior = colors.interior.split(/\n|\r|Year|Make|Model|Vehicle|Body/)[0].trim();
  }

  return colors;
}

async function fetchClassicColors() {
  console.log('🔍 Finding Classic.com GT4 RS listings without colors...\n');

  // Get Classic.com GT4 RS listings without colors
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, source_url, year, price')
    .ilike('trim', '%GT4 RS%')
    .eq('source', 'classic')
    .is('exterior_color', null);

  if (error || !listings) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings.length} Classic.com GT4 RS listings without colors:\n`);

  if (listings.length === 0) {
    console.log('No listings to process');
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`\n[${i + 1}/${listings.length}] Processing ${listing.year} GT4 RS`);
    console.log(`  VIN: ${listing.vin}`);
    console.log(`  URL: ${listing.source_url}`);

    try {
      // Fetch the page
      console.log('  🌐 Fetching page...');
      const html = await fetchClassicPage(listing.source_url);

      if (!html) {
        console.log('  ❌ Failed to fetch page');
        failureCount++;
        continue;
      }

      console.log('  ✅ Page fetched successfully');

      // Extract colors
      const colors = extractColors(html);

      if (colors.exterior || colors.interior) {
        console.log('  🎨 Found colors:');
        if (colors.exterior) console.log(`     Exterior: ${colors.exterior}`);
        if (colors.interior) console.log(`     Interior: ${colors.interior}`);

        // Update the listing
        const updateData: any = {};
        if (colors.exterior) updateData.exterior_color = colors.exterior;
        if (colors.interior) updateData.interior_color = colors.interior;

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
        console.log('  ⚠️  No colors found in HTML');
        failureCount++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failureCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${listings.length}`);
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);

  // Verify final color coverage
  const { count: totalGT4RS } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('trim', '%GT4 RS%');

  const { count: withColor } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .ilike('trim', '%GT4 RS%')
    .not('exterior_color', 'is', null);

  console.log(`\n📊 GT4 RS Color Coverage:`);
  console.log(`  Total listings: ${totalGT4RS}`);
  console.log(`  With colors: ${withColor}`);
  console.log(`  Coverage: ${withColor && totalGT4RS ? ((withColor / totalGT4RS) * 100).toFixed(1) : 0}%`);
}

fetchClassicColors().catch(console.error);