#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reparseGT4RSColors() {
  console.log('🔍 Finding GT4 RS listings without colors...\n');

  // Get all GT4 RS listings without exterior colors
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, source_url, source, year, model, trim, exterior_color, interior_color')
    .ilike('trim', '%GT4 RS%')
    .is('exterior_color', null);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings?.length || 0} GT4 RS listings without colors\n`);

  if (!listings || listings.length === 0) {
    console.log('No listings to process');
    return;
  }

  // Group by source for better reporting
  const bySource: Record<string, typeof listings> = {};
  listings.forEach(listing => {
    const source = listing.source || 'unknown';
    if (!bySource[source]) bySource[source] = [];
    bySource[source].push(listing);
  });

  console.log('Listings by source:');
  Object.entries(bySource).forEach(([source, sourceListings]) => {
    console.log(`  ${source}: ${sourceListings.length} listings`);
  });
  console.log('');

  let totalUpdated = 0;
  let totalFailed = 0;

  // Process each listing
  for (const listing of listings) {
    console.log(`\n📋 Processing listing ${listing.id}:`);
    console.log(`   ${listing.year} ${listing.model} ${listing.trim}`);
    console.log(`   Source: ${listing.source}`);
    console.log(`   URL: ${listing.source_url}`);

    try {
      // Check if we have stored HTML in the raw-html bucket
      const htmlKey = `${listing.source}/${listing.source_url.split('/').pop()}.html`;

      const { data: htmlData, error: storageError } = await supabase
        .storage
        .from('raw-html')
        .download(htmlKey);

      if (storageError || !htmlData) {
        console.log(`   ⚠️  No stored HTML found (${storageError?.message || 'not found'})`);
        totalFailed++;
        continue;
      }

      console.log('   ✅ Found stored HTML');
      const html = await htmlData.text();

      // Parse the HTML based on the source
      let exteriorColor: string | undefined;
      let interiorColor: string | undefined;

      if (listing.source === 'bring-a-trailer') {
        // Parse BaT HTML using cheerio
        const $ = cheerio.load(html);

        // Extract exterior color
        const colorText = $('.essentials-item:contains("Exterior Color")').text() ||
                         $('dt:contains("Exterior")').next('dd').text() ||
                         $('.essentials-item:contains("Color")').text();

        if (colorText) {
          exteriorColor = colorText.replace(/.*:/, '').trim();
        }

        // Try to find color in the listing description
        if (!exteriorColor) {
          $('ul li').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('Paint-To-Sample') || text.includes('Paint')) {
              const match = text.match(/Paint-To-Sample\s+([\w\s]+?)(?:\s+Paint)?$/i) ||
                           text.match(/([\w\s]+?)\s+(?:Metallic\s+)?Paint$/i);
              if (match) {
                exteriorColor = match[1].trim();
                return false;
              }
            }
          });
        }

        // Extract interior color
        const interiorText = $('.essentials-item:contains("Interior Color")').text() ||
                            $('dt:contains("Interior")').next('dd').text();

        if (interiorText) {
          interiorColor = interiorText.replace(/.*:/, '').trim();
        }

        // Try to find interior color in description
        if (!interiorColor) {
          $('ul li').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('Upholstery') || text.includes('Leather') || text.includes('Race-Tex')) {
              const match = text.match(/^([\w\s]+?)\s+(?:Leather|Race-Tex|Upholstery)/i);
              if (match) {
                interiorColor = match[1].trim();
                return false;
              }
            }
          });
        }
      } else {
        console.log(`   ⚠️  Parser not implemented for source: ${listing.source}`);
        totalFailed++;
        continue;
      }

      if (exteriorColor || interiorColor) {
        console.log(`   🎨 Found colors:`);
        if (exteriorColor) console.log(`      Exterior: ${exteriorColor}`);
        if (interiorColor) console.log(`      Interior: ${interiorColor}`);

        // Update the listing with the new color data
        const updateData: any = {};
        if (exteriorColor) updateData.exterior_color = exteriorColor;
        if (interiorColor) updateData.interior_color = interiorColor;

        const { error: updateError } = await supabase
          .from('listings')
          .update(updateData)
          .eq('id', listing.id);

        if (updateError) {
          console.error(`   ❌ Failed to update listing: ${updateError.message}`);
          totalFailed++;
        } else {
          console.log(`   ✅ Updated listing with color data`);
          totalUpdated++;
        }
      } else {
        console.log('   ⚠️  No color data found in parsed HTML');
        totalFailed++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      totalFailed++;
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${listings.length}`);
  console.log(`✅ Successfully updated: ${totalUpdated}`);
  console.log(`❌ Failed/skipped: ${totalFailed}`);
  console.log(`Success rate: ${((totalUpdated / listings.length) * 100).toFixed(1)}%`);

  // Verify the update by checking colors again
  console.log('\n🔍 Verifying color distribution after update...\n');

  const { data: updatedListings, error: verifyError } = await supabase
    .from('listings')
    .select('exterior_color')
    .ilike('trim', '%GT4 RS%')
    .not('exterior_color', 'is', null);

  if (!verifyError && updatedListings) {
    const colorCounts: Record<string, number> = {};
    updatedListings.forEach(listing => {
      const color = listing.exterior_color || 'Unknown';
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });

    console.log('Updated GT4 RS Color Distribution:');
    Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([color, count]) => {
        console.log(`  ${color}: ${count} listings (${((count / updatedListings.length) * 100).toFixed(1)}%)`);
      });

    // Check for Arctic Gray/Grey
    const arcticCount = Object.entries(colorCounts)
      .filter(([color]) => color.toLowerCase().includes('arctic'))
      .reduce((sum, [,count]) => sum + count, 0);

    if (arcticCount > 0) {
      console.log(`\n✅ Arctic Gray/Grey is now present: ${arcticCount} listings`);
    }
  }
}

// Run the script
reparseGT4RSColors().catch(console.error);