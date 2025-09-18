#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { BaTScraper } from '../lib/scrapers/bat';
import { processListingOptions } from '../lib/services/options-manager';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Supabase clients
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

async function parseAndSaveFiles(basePath: string) {
  const scraper = new BaTScraper();
  let savedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  // Recursively list and process files
  async function processPath(path: string) {
    const { data: items } = await supabase.storage
      .from('raw-html')
      .list(path, { limit: 1000 });
    
    for (const item of items || []) {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      
      if (item.name.endsWith('.html')) {
        // Process HTML file
        // Skip search pages, only process detail pages
        if (!fullPath.includes('/detail/')) {
          skippedCount++;
          continue;
        }
        
        try {
          // Download the HTML
          const { data: htmlData, error: downloadError } = await supabase
            .storage
            .from('raw-html')
            .download(fullPath);
          
          if (downloadError) {
            console.error(`Error downloading ${fullPath}:`, downloadError.message);
            errorCount++;
            continue;
          }
          
          // Convert blob to text
          const html = await htmlData.text();
          
          // Extract URL from filename
          const urlMatch = item.name.match(/([^/]+)\.html$/);
          if (!urlMatch) continue;
          
          const encoded = urlMatch[1].replace(/__[a-f0-9]+$/, '');
          const url = `https://${encoded.replace(/_/g, '/')}`;
          
          // Use BaTScraper's extraction methods for complete data extraction
          const batScraper = new BaTScraper();
          const $ = require('cheerio').load(html);
          const pageText = $('body').text();
          
          // Extract basic info
          const title = $('h1.listing-title').text().trim() || 
                       $('h1').first().text().trim();
          
          // Extract year from title
          const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
          const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
          
          // Extract price
          let price = 0;
          const priceText = $('.listing-available-info').text() || $.html();
          const priceMatch = priceText.match(/\$([0-9,]+)/);
          if (priceMatch) {
            price = parseInt(priceMatch[1].replace(/,/g, ''));
          }
          
          // Extract mileage - check title first (more reliable)
          let mileage = undefined;
          
          // Try to extract from title first
          const titlePatterns = [
            /([\d,]+)[kK]-[Mm]ile/,  // 13k-Mile
            /([\d,]+)-[Mm]ile/,      // 3,100-Mile
            /([\d,]+)\s+[Mm]iles?\b/, // 13,000 Miles
            /([\d,]+)[kK]\s+[Mm]iles?\b/, // 13k Miles
          ];
          
          for (const pattern of titlePatterns) {
            const match = title.match(pattern);
            if (match) {
              let mileageStr = match[1].replace(/,/g, '');
              mileage = parseInt(mileageStr);
              
              // Handle 'k' notation
              if (match[0].toLowerCase().includes('k-mile') || 
                  match[0].toLowerCase().includes('k mile')) {
                mileage = mileage * 1000;
              }
              
              if (mileage > 0 && mileage < 500000) {
                break;
              } else {
                mileage = undefined;
              }
            }
          }
          
          // Fallback to HTML search if not found in title
          if (!mileage) {
            const mileageMatch = $.html().match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles|mi\b)/i);
            if (mileageMatch) {
              mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
            }
          }
          
          // Try OpenAI normalization first, with fallback parsing
          let normalized: any = { model: null, trim: null, generation: null };
          
          try {
            // Try OpenAI if API key is available
            if (process.env.OPENAI_API_KEY) {
              const { normalizeModelTrim } = await import('../lib/services/model-trim-normalizer');
              normalized = await normalizeModelTrim(title);
            }
          } catch (error) {
            console.log('OpenAI normalization failed, using fallback');
          }
          
          // If OpenAI didn't work or didn't provide results, use fallback parsing
          if (!normalized.model || !normalized.generation) {
            normalized = fallbackParse(title, year);
          }
          
          // Add small delay to avoid overwhelming OpenAI API
          if (savedCount % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay every 5 listings
          }
          
          // Extract VIN using BaTScraper's method
          const vin = (batScraper as any).extractVIN($);
          
          // Extract colors using BaTScraper's methods
          const exterior_color = (batScraper as any).extractExteriorColor($) || 
                                  (() => {
                                    const colorMatch = $.html().match(/(?:finished in|painted in|exterior:?)\s*([^,\.<]+)/i);
                                    return colorMatch ? colorMatch[1].trim() : undefined;
                                  })();
          const interior_color = (batScraper as any).extractInteriorColor($);
          
          // Extract options using BaTScraper's method for comprehensive extraction
          const options_text = (batScraper as any).extractOptions($);
          
          // Extract location and sold date using BaTScraper's methods
          const locationData = (batScraper as any).extractLocation($);
          const location = locationData ? `${locationData.city || ''}, ${locationData.state || ''}`.trim() : undefined;
          const sold_date = (batScraper as any).extractSoldDate($, pageText);
          
          const listing = {
            source_url: url,
            title,
            year,
            model: normalized.model,
            trim: normalized.trim,
            generation: normalized.generation,
            price,
            mileage,
            exterior_color,
            options_text,
            vin,
            interior_color,
            dealer_name: 'Private Party',
            location,
            description: undefined,
            sold_date,
          };
          
          if (!listing || !listing.price || !listing.model) {
            skippedCount++;
            continue;
          }
          
          // If VIN exists, check for duplicates
          if (listing.vin) {
            const { data: existingWithVin } = await supabase
              .from('listings')
              .select('id, source_url, sold_date, price, mileage, options_text')
              .eq('vin', listing.vin)
              .single();
            
            if (existingWithVin && existingWithVin.source_url !== listing.source_url) {
              // Check if it's the same sale (same sold_date) or a relisting
              const isSameSale = existingWithVin.sold_date && listing.sold_date && 
                new Date(existingWithVin.sold_date).toDateString() === new Date(listing.sold_date).toDateString();
              
              if (isSameSale) {
                console.log(`   ⚠️  VIN ${listing.vin} - same sold date, merging duplicate listings`);
                
                // Merge data into the existing listing, preferring non-null values
                const mergedUpdates: any = {};
                if (!existingWithVin.price && listing.price) mergedUpdates.price = listing.price;
                if (!existingWithVin.mileage && listing.mileage) mergedUpdates.mileage = listing.mileage;
                if (!existingWithVin.options_text && listing.options_text) mergedUpdates.options_text = listing.options_text;
                if (listing.exterior_color) mergedUpdates.exterior_color = listing.exterior_color;
                if (listing.interior_color) mergedUpdates.interior_color = listing.interior_color;
                if (listing.location) mergedUpdates.location = listing.location;
                
                if (Object.keys(mergedUpdates).length > 0) {
                  const { error: updateError } = await supabase
                    .from('listings')
                    .update({
                      ...mergedUpdates,
                      scraped_at: new Date().toISOString()
                    })
                    .eq('id', existingWithVin.id);
                  
                  if (!updateError) {
                    updatedCount++;
                    console.log(`   ✓ Merged data into existing listing`);
                    // Process options if we just added them
                    if (mergedUpdates.options_text) {
                      await processListingOptions(existingWithVin.id, mergedUpdates.options_text);
                    }
                  }
                }
                continue; // Skip the upsert below since we're merging
              } else {
                console.log(`   ⚠️  VIN ${listing.vin} - different sold dates, this is a relisted car`);
                // Continue with normal upsert, which will handle the duplicate VIN constraint
              }
            }
          }
          
          // Use upsert to insert or update based on source_url
          const { data: upsertedListing, error } = await supabase
            .from('listings')
            .upsert({
              source: 'bring-a-trailer',
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
            }, {
              onConflict: 'source_url',
              ignoreDuplicates: false  // Update existing records
            })
            .select('id')
            .single();
          
          if (!error && upsertedListing) {
            savedCount++;
            console.log(`✅ Saved: ${listing.year || '?'} ${listing.model} ${listing.trim || ''} - $${listing.price.toLocaleString()}`);
            
            // Process options for the listing
            if (listing.options_text) {
              await processListingOptions(upsertedListing.id, listing.options_text);
            }
          } else if (error) {
            console.error(`❌ Error saving:`, error.message);
            errorCount++;
          }
        } catch (err) {
          console.error(`Error processing ${fullPath}:`, err);
          errorCount++;
        }
      } else {
        // It's a folder, recurse into it
        await processPath(fullPath);
      }
    }
  }
  
  // Start processing
  await processPath(basePath);
  
  return { savedCount, updatedCount, errorCount, skippedCount };
}

// Fallback parsing function when OpenAI is not available or fails
function fallbackParse(title: string, year?: number): { model: string | null; trim: string | null; generation: string | null } {
  let model: string | null = null;
  let trim: string | null = null;
  let generation: string | null = null;
  
  // Determine model
  if (title.includes('Cayman')) {
    model = '718 Cayman';
  } else if (title.includes('Boxster')) {
    model = '718 Boxster';
  } else if (title.includes('Spyder')) {
    model = '718 Spyder';
  } else if (title.includes('911') || title.includes('GT3') || title.includes('GT2') || 
             title.includes('Turbo') || title.includes('Carrera')) {
    model = '911';
  }
  
  // Parse trim for 911
  if (model === '911') {
    // GT models (check these first as they're most specific)
    if (title.includes('GT3 RS') || title.includes('GT3RS')) {
      trim = 'GT3 RS';
    } else if (title.includes('GT3 Touring')) {
      trim = 'GT3 Touring';
    } else if (title.includes('GT3 Cup')) {
      trim = 'GT3 Cup';
    } else if (title.includes('GT3')) {
      trim = 'GT3';
    } else if (title.includes('GT2 RS') || title.includes('GT2RS')) {
      trim = 'GT2 RS';
    } else if (title.includes('GT2')) {
      trim = 'GT2';
    }
    // Turbo models
    else if (title.includes('Turbo S')) {
      trim = 'Turbo S';
    } else if (title.includes('Turbo')) {
      trim = 'Turbo';
    }
    // Carrera variants
    else if (title.includes('Carrera 4S')) {
      trim = 'Carrera 4S';
    } else if (title.includes('Carrera 4')) {
      trim = 'Carrera 4';
    } else if (title.includes('Carrera S')) {
      trim = 'Carrera S';
    } else if (title.includes('Carrera GTS')) {
      trim = 'Carrera GTS';
    } else if (title.includes('Carrera T')) {
      trim = 'Carrera T';
    } else if (title.includes('Carrera')) {
      trim = 'Carrera';
    }
    // Special models
    else if (title.includes('S/T')) {
      trim = 'S/T';
    } else if (title.includes('Sport Classic')) {
      trim = 'Sport Classic';
    } else if (title.includes('Speedster')) {
      trim = 'Speedster';
    } else if (title.includes('Dakar')) {
      trim = 'Dakar';
    }
    
    // Add body style modifiers
    if (trim && title.includes('Targa')) {
      trim = trim + ' Targa';
    } else if (trim && (title.includes('Cabriolet') || title.includes('Cabrio'))) {
      trim = trim + ' Cabriolet';
    }
  } else if (model?.includes('718')) {
    // 718 models
    if (title.includes('GT4 RS') || title.includes('GT4RS')) {
      trim = 'GT4 RS';
    } else if (title.includes('GT4')) {
      trim = 'GT4';
    } else if (title.includes('Spyder RS')) {
      trim = 'Spyder RS';
    } else if (title.includes('Spyder')) {
      trim = 'Spyder';
    } else if (title.includes('GTS 4.0')) {
      trim = 'GTS 4.0';
    } else if (title.includes('GTS')) {
      trim = 'GTS';
    } else if (title.includes(' S ') || title.includes(' S')) {
      trim = 'S';
    }
  }
  
  // Infer generation from year
  if (year) {
    if (model === '911') {
      if (year >= 2024) generation = '992.2';
      else if (year >= 2019) generation = '992.1';
      else if (year >= 2016) generation = '991.2';
      else if (year >= 2012) generation = '991.1';
      else if (year >= 2009) generation = '997.2';
      else if (year >= 2005) generation = '997.1';
      else if (year >= 1999) generation = '996';
      else if (year >= 1995) generation = '993';
      else if (year >= 1989) generation = '964';
    } else if (model?.includes('718') || model?.includes('Cayman') || model?.includes('Boxster')) {
      if (year >= 2016) generation = '982';
      else if (year >= 2013) generation = '981';
      else if (year >= 2009) generation = '987.2';
      else if (year >= 2005) generation = '987.1';
      else if (year >= 1997) generation = '986';
    }
  }
  
  // Also check for explicit generation in title
  const genPatterns = ['992.2', '992.1', '992', '991.2', '991.1', '991', '997.2', '997.1', '997', '996', '993', '964', '982', '981', '987.2', '987.1', '986'];
  for (const gen of genPatterns) {
    if (title.includes(gen)) {
      generation = gen;
      break;
    }
  }
  
  return { model, trim, generation };
}

async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find(arg => arg.startsWith('--date='));
  const date = dateArg ? dateArg.split('=')[1] : '20250910';
  
  console.log('='.repeat(80));
  console.log('PARSING ALL STORED HTML AND SAVING TO DATABASE');
  console.log('='.repeat(80));
  console.log(`Processing bring-a-trailer/${date}`);
  console.log('This will recursively process all HTML files in nested folders');
  console.log('='.repeat(80) + '\n');
  
  const startTime = Date.now();
  
  // Process all BaT files
  const results = await parseAndSaveFiles(`bring-a-trailer/${date}`);
  
  const duration = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n' + '='.repeat(80));
  console.log('COMPLETE');
  console.log('='.repeat(80));
  console.log(`✅ Saved: ${results.savedCount} new listings`);
  console.log(`📝 Updated: ${results.updatedCount} existing listings`);
  console.log(`⏭️ Skipped: ${results.skippedCount} (search pages or invalid)`);
  console.log(`❌ Errors: ${results.errorCount}`);
  console.log(`⏱️ Time: ${duration} seconds`);
  
  // Check total in database now
  const { count } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total listings in database: ${count}`);
  
  // Show sample of what was saved
  const { data: samples } = await supabase
    .from('listings')
    .select('year, model, trim, price, mileage')
    .eq('source', 'bring-a-trailer')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (samples && samples.length > 0) {
    console.log('\nRecent additions:');
    samples.forEach(s => {
      console.log(`  - ${s.year || '?'} ${s.model} ${s.trim || ''}: $${s.price?.toLocaleString()} (${s.mileage?.toLocaleString() || '?'} miles)`);
    });
  }
}

main().catch(console.error);