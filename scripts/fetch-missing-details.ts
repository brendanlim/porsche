#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { BaTScraperPuppeteer } from '../lib/scrapers/bat-puppeteer';
import { processListingOptions } from '../lib/services/options-manager';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchMissingDetails(args: string[]) {
  // Parse command line arguments
  const batchSize = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '50');
  const source = args.find(a => a.startsWith('--source='))?.split('=')[1] || 'bring-a-trailer';
  const forceRefetch = args.includes('--force-refetch');
  
  console.log('================================================================================');
  console.log('FETCHING MISSING DETAIL PAGES');
  console.log('================================================================================');
  console.log(`Source: ${source}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Force refetch: ${forceRefetch}`);
  console.log('================================================================================\n');
  
  // Get listings missing critical data (VIN or options)
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, source_url, title, vin, options_text')
    .eq('source', source)
    .or('vin.is.null,options_text.is.null')
    .limit(batchSize);
  
  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }
  
  const missingVin = listings?.filter(l => !l.vin) || [];
  const missingOptions = listings?.filter(l => !l.options_text) || [];
  
  console.log(`Found ${listings?.length || 0} listings missing data:`);
  console.log(`  - ${missingVin.length} missing VIN`);
  console.log(`  - ${missingOptions.length} missing options`);
  console.log();
  
  if (!listings || listings.length === 0) {
    console.log('✅ All listings have complete data!');
    return;
  }
  
  const scraper = new BaTScraperPuppeteer();
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    let existingFile: Blob | null = null;
    
    try {
      console.log(`[${i + 1}/${listings.length}] Processing: ${listing.source_url}`);
      console.log(`  Current data: VIN=${listing.vin ? '✓' : '✗'}, Options=${listing.options_text ? '✓' : '✗'}`);
      
      // First check if we already have this detail page stored
      const { HTMLStorageService } = await import('../lib/services/html-storage');
      const htmlStorage = new HTMLStorageService();
      
      // Generate search pattern for this listing (without hash suffix)
      // The stored files have format: bringatrailer_com_listing_SLUG_HASH.html
      const urlParts = listing.source_url.match(/bringatrailer\.com\/listing\/([^\/]+)/);
      const listingSlug = urlParts ? urlParts[1] : '';
      const searchPrefix = `bringatrailer_com_listing_${listingSlug}`;
      
      // Try to find the file in various date folders
      const { data: folders } = await supabase.storage
        .from('raw-html')
        .list('bring-a-trailer', { limit: 100 });
      
      existingFile = null;
      let foundPath = '';
      
      // Check each date folder for the file (unless force-refetch is enabled)
      if (!forceRefetch && folders && listingSlug) {
        for (const folder of folders) {
          if (folder.name.match(/^\d{8}$/)) { // Date folder like 20250912
            // List files in unknown/detail folder
            const { data: detailFiles } = await supabase.storage
              .from('raw-html')
              .list(`bring-a-trailer/${folder.name}/unknown/detail`, { limit: 1000 });
            
            // Find file that matches our search prefix
            const matchingFile = detailFiles?.find(f => f.name.startsWith(searchPrefix));
            
            if (matchingFile) {
              const fullPath = `bring-a-trailer/${folder.name}/unknown/detail/${matchingFile.name}`;
              const { data: file } = await supabase.storage
                .from('raw-html')
                .download(fullPath);
              
              if (file) {
                existingFile = file;
                foundPath = fullPath;
                break;
              }
            }
          }
        }
      }
      let detailData: any = {};
      
      if (existingFile && !forceRefetch) {
        // We already have this page stored
        console.log(`  ✓ Found stored detail page: ${foundPath}`);
        detailData.html = await existingFile.text();
      } else {
        // Need to fetch the page
        if (forceRefetch && existingFile) {
          console.log(`  🔄 Force refetching (stored page exists)...`);
        } else {
          console.log(`  🌐 Fetching detail page from web...`);
        }
        detailData = await scraper.puppeteerScraper.scrapeListingPage(listing.source_url);
      }
      
      if (detailData.html) {
        // Parse the detail page using BaTScraper methods
        const parsed = await scraper.parseListing(detailData.html, listing.source_url);
        
        if (parsed) {
          // Update the listing with new data
          const updates: any = {};
          
          if (!listing.vin && parsed.vin) {
            updates.vin = parsed.vin;
            console.log(`  ✓ Found VIN: ${parsed.vin}`);
          }
          
          if (!listing.options_text && parsed.options_text) {
            updates.options_text = parsed.options_text;
            console.log(`  ✓ Found options: ${parsed.options_text.substring(0, 50)}...`);
          }
          
          if (parsed.sold_date) {
            updates.sold_date = parsed.sold_date;
            console.log(`  ✓ Found sold date: ${parsed.sold_date}`);
          }
          
          if (parsed.mileage && parsed.mileage > 0) {
            updates.mileage = parsed.mileage;
            console.log(`  ✓ Found mileage: ${parsed.mileage.toLocaleString()}`);
          }
          
          if (Object.keys(updates).length > 0) {
            // Check if VIN already exists in another listing
            if (updates.vin) {
              const { data: existingListing } = await supabase
                .from('listings')
                .select('id, source_url, sold_date, price, mileage, options_text')
                .eq('vin', updates.vin)
                .neq('id', listing.id)
                .single();
              
              if (existingListing) {
                console.log(`  ⚠️  VIN ${updates.vin} already exists for listing ${existingListing.source_url}`);
                
                // Check if it's the same sale (same sold_date) or a relisting
                const isSameSale = existingListing.sold_date && updates.sold_date && 
                  new Date(existingListing.sold_date).toDateString() === new Date(updates.sold_date).toDateString();
                
                if (isSameSale) {
                  console.log(`  ⚠️  Same sold date - this is a duplicate listing, merging...`);
                  
                  // Merge data into the existing listing, preferring non-null values
                  const mergedUpdates: any = {};
                  if (!existingListing.price && parsed.price) mergedUpdates.price = parsed.price;
                  if (!existingListing.mileage && parsed.mileage) mergedUpdates.mileage = parsed.mileage;
                  if (!existingListing.options_text && parsed.options_text) mergedUpdates.options_text = parsed.options_text;
                  
                  if (Object.keys(mergedUpdates).length > 0) {
                    await supabase
                      .from('listings')
                      .update(mergedUpdates)
                      .eq('id', existingListing.id);
                    
                    console.log(`  ✓ Merged data into existing listing`);
                    
                    // Process options if we just added them
                    if (mergedUpdates.options_text) {
                      await processListingOptions(existingListing.id, mergedUpdates.options_text);
                    }
                  }
                  
                  // Delete the duplicate listing
                  await supabase
                    .from('listings')
                    .delete()
                    .eq('id', listing.id);
                  
                  successCount++;
                  console.log(`  ✓ Removed duplicate listing`);
                } else {
                  console.log(`  ⚠️  Different sold dates - this is a relisted car, keeping both records`);
                  
                  // Don't update the VIN since it would cause a duplicate
                  delete updates.vin;
                  
                  // Still update the current listing with other data (options, mileage, etc)
                  if (Object.keys(updates).length > 0) {
                    const { error: updateError } = await supabase
                      .from('listings')
                      .update(updates)
                      .eq('id', listing.id);
                    
                    if (updateError) {
                      console.error(`  ✗ Error updating listing: ${updateError.message}`);
                      errorCount++;
                    } else {
                      successCount++;
                      console.log(`  ✓ Updated listing with new data (except VIN)`);
                      
                      // Process options if we just added them
                      if (updates.options_text) {
                        await processListingOptions(listing.id, updates.options_text);
                      }
                    }
                  } else {
                    console.log(`  ℹ No new data to update (VIN already exists elsewhere)`);
                  }
                }
              } else {
                // Normal update for non-duplicate VINs
                const { error: updateError } = await supabase
                  .from('listings')
                  .update(updates)
                  .eq('id', listing.id);
                
                if (updateError) {
                  console.error(`  ✗ Error updating database: ${updateError.message}`);
                  errorCount++;
                } else {
                  successCount++;
                  
                  // Process options if we just added them
                  if (updates.options_text) {
                    await processListingOptions(listing.id, updates.options_text);
                  }
                }
              }
            } else {
              // No VIN in updates, do normal update
              const { error: updateError } = await supabase
                .from('listings')
                .update(updates)
                .eq('id', listing.id);
              
              if (updateError) {
                console.error(`  ✗ Error updating database: ${updateError.message}`);
                errorCount++;
              } else {
                successCount++;
                
                // Process options if we just added them
                if (updates.options_text) {
                  await processListingOptions(listing.id, updates.options_text);
                }
              }
            }
          } else {
            console.log(`  ℹ No new data found`);
          }
        }
        
        // Store the detail page HTML if we fetched it fresh (or force-refetched)
        if ((!existingFile || forceRefetch) && detailData.html) {
          const storageResult = await htmlStorage.storeScrapedHTML({
            source: 'bring-a-trailer',
            url: listing.source_url,
            html: detailData.html,
            type: 'detail',
            model: parsed?.model || 'unknown',  // Use 'unknown' instead of undefined
            trim: parsed?.trim || '',
          });
          
          if (storageResult) {
            console.log(`  ✓ Stored detail page: ${storageResult.path}`);
          }
        }
      }
      
      // Rate limit: 3 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error: any) {
      console.error(`  ✗ Error: ${error.message}`);
      errorCount++;
      
      // Longer delay after error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successfully updated: ${successCount} listings`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${listings.length}`);
  
  // Check remaining
  const { count } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('source', source)
    .or('vin.is.null,options_text.is.null');
  
  console.log(`\n📋 Remaining listings missing data: ${count || 0}`);
  
  if (count && count > 0) {
    console.log(`   Run again to fetch next batch of ${Math.min(batchSize, count)} listings`);
  }
}

// Run the script
fetchMissingDetails(process.argv.slice(2)).catch(console.error);