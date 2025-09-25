#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Enhanced VIN extraction function
 * Tries multiple patterns and locations
 */
function extractVINFromHTML(html: string, source: string): string | null {
  const $ = cheerio.load(html);

  // Try multiple VIN patterns
  const vinPatterns = [
    /WP[01][A-HJ-NPR-Z0-9]{14}/g,  // Standard Porsche VIN
    /VIN[:\s]+([A-HJ-NPR-Z0-9]{17})/i,  // VIN: format
    /Chassis[:\s]+([A-HJ-NPR-Z0-9]{17})/i,  // Chassis: format
  ];

  // Method 1: Look for VIN in specific elements (BaT)
  if (source === 'bring-a-trailer' || source === 'bat') {
    // Check BaT Essentials list
    let vin: string | null = null;

    // Multiple selectors for BaT's various formats
    const selectors = [
      'ul li',
      '.essentials-item',
      '.listing-essentials li',
      '.es-data',
      'dt:contains("Chassis") + dd',
      'dt:contains("VIN") + dd'
    ];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();

        // Look for Chassis or VIN labels
        if (text.includes('Chassis:') || text.includes('VIN:') || text.match(/WP[01]/)) {
          for (const pattern of vinPatterns) {
            const matches = text.match(pattern);
            if (matches) {
              vin = matches[0].startsWith('VIN') || matches[0].startsWith('Chassis')
                ? matches[1] || matches[0]
                : matches[0];
              return false; // Break loop
            }
          }
        }
      });

      if (vin) break;
    }

    if (vin) return vin;

    // Check description or body text
    const bodyText = $('body').text();
    for (const pattern of vinPatterns) {
      const matches = bodyText.match(pattern);
      if (matches) {
        const potentialVin = matches[0].startsWith('VIN') || matches[0].startsWith('Chassis')
          ? matches[1] || matches[0]
          : matches[0];

        // Validate it's a Porsche VIN
        if (potentialVin && potentialVin.startsWith('WP')) {
          return potentialVin;
        }
      }
    }
  }

  // Generic extraction for other sources
  const fullText = $.text();
  for (const pattern of vinPatterns) {
    const matches = fullText.match(pattern);
    if (matches) {
      const potentialVin = matches[0].startsWith('VIN') || matches[0].startsWith('Chassis')
        ? matches[1] || matches[0]
        : matches[0];

      if (potentialVin && potentialVin.startsWith('WP')) {
        return potentialVin;
      }
    }
  }

  return null;
}

async function reparseVINsFromCache() {
  console.log('🔍 Re-parsing VINs from raw_html_cache table...\n');

  // Get listings without VINs that we might have HTML for
  const { data: noVinListings, error } = await supabase
    .from('listings')
    .select('id, source, source_url, year, model, trim, generation')
    .or('vin.is.null,vin.eq.')
    .in('source', ['bring-a-trailer', 'bat'])  // Focus on BaT first
    .not('source_url', 'is', null)
    .limit(500);  // Process in batches

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${noVinListings?.length || 0} listings without VINs to process\n`);

  if (!noVinListings || noVinListings.length === 0) {
    return;
  }

  let updated = 0;
  let failed = 0;
  let noHtml = 0;

  for (const listing of noVinListings) {
    try {
      // Look for cached HTML for this URL
      const { data: cachedHtml, error: cacheError } = await supabase
        .from('raw_html_cache')
        .select('html, created_at')
        .eq('url', listing.source_url)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cacheError || !cachedHtml) {
        noHtml++;
        continue;  // No HTML cached for this listing
      }

      // Extract VIN from HTML
      const vin = extractVINFromHTML(cachedHtml.html, listing.source);

      if (vin) {
        // Validate VIN with our decoder
        const decoded = decodePorscheVIN(vin);

        if (decoded.valid) {
          // Update the listing with the VIN and decoded info
          const updateData: any = { vin };

          // Only update if VIN decoder has high confidence
          if (decoded.confidence === 'high') {
            if (!listing.year && decoded.modelYear) {
              updateData.year = decoded.modelYear;
            }
            if (!listing.model && decoded.model) {
              updateData.model = decoded.model;
            }
            if (!listing.trim && decoded.engineType) {
              updateData.trim = decoded.engineType;
            }
            if (!listing.generation && decoded.generation) {
              updateData.generation = decoded.generation;
            }
          }

          const { error: updateError } = await supabase
            .from('listings')
            .update(updateData)
            .eq('id', listing.id);

          if (!updateError) {
            console.log(`✅ Updated ${listing.year || decoded.modelYear} ${listing.model || decoded.model} ${listing.trim || decoded.engineType || ''}: ${vin}`);
            if (decoded.confidence === 'high' && Object.keys(updateData).length > 1) {
              console.log(`   🔍 Also updated from VIN decoder: ${Object.keys(updateData).filter(k => k !== 'vin').join(', ')}`);
            }
            updated++;
          } else {
            console.error(`❌ Failed to update listing ${listing.id}:`, updateError);
            failed++;
          }
        } else {
          console.log(`⚠️  Invalid VIN found for ${listing.year} ${listing.model} ${listing.trim}: ${vin}`);
          failed++;
        }
      } else {
        // No VIN found in HTML
        failed++;
      }
    } catch (error) {
      console.error(`Error processing listing ${listing.id}:`, error);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Updated: ${updated} listings`);
  console.log(`❌ Failed to extract VIN: ${failed} listings`);
  console.log(`📄 No HTML cached: ${noHtml} listings`);
  console.log(`📝 Total processed: ${noVinListings.length}`);

  if (updated > 0) {
    console.log('\n🎉 Successfully extracted VINs from cached HTML!');
    console.log('Consider running VIN decoder on all listings to ensure data quality.');
  }
}

reparseVINsFromCache().catch(console.error);