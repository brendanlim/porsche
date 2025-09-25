#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

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
  if (source === 'bring-a-trailer') {
    // Check BaT Essentials list
    let vin: string | null = null;

    $('ul li, .essentials-item, .listing-essentials li').each((_, el) => {
      const text = $(el).text().trim();

      // Look for Chassis or VIN labels
      if (text.includes('Chassis:') || text.includes('VIN:')) {
        for (const pattern of vinPatterns) {
          const matches = text.match(pattern);
          if (matches) {
            vin = matches[0].startsWith('VIN') || matches[0].startsWith('Chassis')
              ? matches[1]
              : matches[0];
            return false; // Break loop
          }
        }
      }
    });

    if (vin) return vin;

    // Check description or body text
    const bodyText = $('body').text();
    for (const pattern of vinPatterns) {
      const matches = bodyText.match(pattern);
      if (matches) {
        const potentialVin = matches[0].startsWith('VIN') || matches[0].startsWith('Chassis')
          ? matches[1]
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
        ? matches[1]
        : matches[0];

      if (potentialVin && potentialVin.startsWith('WP')) {
        return potentialVin;
      }
    }
  }

  return null;
}

async function reparseVINsFromHTML() {
  console.log('🔍 Re-parsing VINs from stored HTML...\n');

  // Get listings without VINs
  const { data: noVinListings, error } = await supabase
    .from('listings')
    .select('id, source, source_url, year, model, trim')
    .or('vin.is.null,vin.eq.')
    .eq('source', 'bring-a-trailer')  // Focus on BaT first
    .limit(100);  // Process in batches

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

  for (const listing of noVinListings) {
    try {
      // Try to find stored HTML
      // We need to search the bucket for files related to this listing
      const urlParts = listing.source_url?.split('/') || [];
      const listingSlug = urlParts[urlParts.length - 1];

      if (!listingSlug) {
        console.log(`❌ No URL slug for listing ${listing.id}`);
        failed++;
        continue;
      }

      // List files in the bucket that might match this listing
      const { data: files, error: listError } = await supabase.storage
        .from('raw-html')
        .list('bring-a-trailer', {
          search: listingSlug,
          limit: 10
        });

      if (listError || !files || files.length === 0) {
        // Try a broader search with just date folders
        const { data: dateFolders } = await supabase.storage
          .from('raw-html')
          .list('bring-a-trailer');

        if (!dateFolders) {
          console.log(`❌ No HTML found for ${listing.year} ${listing.model} ${listing.trim} (${listingSlug})`);
          failed++;
          continue;
        }

        // Search recent date folders
        let htmlFound = false;
        for (const folder of dateFolders.slice(0, 5)) {  // Check last 5 days
          if (!folder.name.match(/^\d{8}$/)) continue;  // Skip non-date folders

          const { data: modelFolders } = await supabase.storage
            .from('raw-html')
            .list(`bring-a-trailer/${folder.name}`);

          if (!modelFolders) continue;

          for (const modelFolder of modelFolders) {
            const { data: trimFolders } = await supabase.storage
              .from('raw-html')
              .list(`bring-a-trailer/${folder.name}/${modelFolder.name}`);

            if (!trimFolders) continue;

            for (const trimFolder of trimFolders) {
              const { data: typeFiles } = await supabase.storage
                .from('raw-html')
                .list(`bring-a-trailer/${folder.name}/${modelFolder.name}/${trimFolder.name}/detail`, {
                  search: listingSlug
                });

              if (typeFiles && typeFiles.length > 0) {
                // Found the HTML file!
                const htmlPath = `bring-a-trailer/${folder.name}/${modelFolder.name}/${trimFolder.name}/detail/${typeFiles[0].name}`;

                const { data: htmlContent } = await supabase.storage
                  .from('raw-html')
                  .download(htmlPath);

                if (htmlContent) {
                  const html = await htmlContent.text();
                  const vin = extractVINFromHTML(html, 'bring-a-trailer');

                  if (vin) {
                    // Update the listing with the VIN
                    const { error: updateError } = await supabase
                      .from('listings')
                      .update({ vin })
                      .eq('id', listing.id);

                    if (!updateError) {
                      console.log(`✅ Updated VIN for ${listing.year} ${listing.model} ${listing.trim}: ${vin}`);
                      updated++;
                    } else {
                      console.error(`❌ Failed to update listing ${listing.id}:`, updateError);
                      failed++;
                    }
                  } else {
                    console.log(`⚠️  No VIN found in HTML for ${listing.year} ${listing.model} ${listing.trim}`);
                    failed++;
                  }

                  htmlFound = true;
                  break;
                }
              }
            }
            if (htmlFound) break;
          }
          if (htmlFound) break;
        }

        if (!htmlFound) {
          console.log(`❌ No HTML found for ${listing.year} ${listing.model} ${listing.trim} after deep search`);
          failed++;
        }
      }
    } catch (error) {
      console.error(`Error processing listing ${listing.id}:`, error);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Updated: ${updated} listings`);
  console.log(`❌ Failed: ${failed} listings`);
  console.log(`📝 Total processed: ${updated + failed}`);
}

reparseVINsFromHTML().catch(console.error);