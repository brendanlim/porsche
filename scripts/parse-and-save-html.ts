#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { HTMLStorageService } from '../lib/services/html-storage';
import { BaTScraper } from '../lib/scrapers/bat';
import { ClassicScraper } from '../lib/scrapers/classic';
import { CarsAndBidsScraper } from '../lib/scrapers/carsandbids';
import { EdmundsScraper } from '../lib/scrapers/edmunds';
import { CarsScraper } from '../lib/scrapers/cars';
import { ScrapedListing } from '../lib/types/scraper';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Supabase client
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

// Save listings to database
async function saveListings(listings: ScrapedListing[], source: string): Promise<number> {
  let savedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const listing of listings) {
    try {
      // Skip if no price or model
      if (!listing.price || !listing.model) {
        skippedCount++;
        continue;
      }
      
      // Check if listing already exists by source_url
      let existingId = null;
      
      if (listing.source_url) {
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('source_url', listing.source_url)
          .single();
        
        if (existing) existingId = existing.id;
      }
      
      // If not found by URL, check by VIN
      if (!existingId && listing.vin) {
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('vin', listing.vin)
          .single();
        
        if (existing) existingId = existing.id;
      }
      
      if (existingId) {
        // Update existing listing
        const { error } = await supabase
          .from('listings')
          .update({
            price: listing.price,
            mileage: listing.mileage,
            sold_date: listing.sold_date,
            year: listing.year,
            model: listing.model,
            trim: listing.trim,
            generation: listing.generation,
            exterior_color: listing.exterior_color,
            options_text: listing.options_text,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingId);
        
        if (!error) {
          updatedCount++;
        } else {
          console.error(`Failed to update listing: ${error.message}`);
        }
      } else {
        // Insert new listing
        const { error } = await supabase
          .from('listings')
          .insert({
            source,
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
          });
        
        if (!error) {
          savedCount++;
        } else if (error.message.includes('duplicate')) {
          // Duplicate key error - listing exists
          updatedCount++;
        } else {
          console.error(`Failed to save listing: ${error.message}`);
        }
      }
    } catch (err) {
      console.error('Error saving listing:', err);
    }
  }
  
  console.log(`   ✅ Saved ${savedCount} new, updated ${updatedCount} existing, skipped ${skippedCount} invalid`);
  return savedCount + updatedCount;
}

async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find(arg => arg.startsWith('--date='));
  const sourceArg = args.find(arg => arg.startsWith('--source='));
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  
  const date = dateArg ? dateArg.split('=')[1] : new Date().toISOString().split('T')[0].replace(/-/g, '');
  const sourceFilter = sourceArg ? sourceArg.split('=')[1] : null;
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
  
  console.log('='.repeat(80));
  console.log('PARSING STORED HTML AND SAVING TO DATABASE');
  console.log('='.repeat(80));
  console.log(`Date: ${date}`);
  if (sourceFilter) console.log(`Source filter: ${sourceFilter}`);
  if (limit) console.log(`Limit: ${limit} files`);
  console.log('='.repeat(80) + '\n');
  
  const htmlStorage = new HTMLStorageService();
  
  // Map of scrapers
  const scrapers = {
    'bring-a-trailer': new BaTScraper(),
    'bat': new BaTScraper(),
    'classic': new ClassicScraper(),
    'carsandbids': new CarsAndBidsScraper(),
    'cars-and-bids': new CarsAndBidsScraper(),
    'edmunds': new EdmundsScraper(),
    'cars': new CarsScraper(),
  };
  
  let totalParsed = 0;
  let totalSaved = 0;
  let filesProcessed = 0;
  
  // Get all stored HTML files
  const pattern = {
    source: sourceFilter || undefined,
    date: date,
    type: 'detail' // Focus on detail pages which have the full listing data
  };
  
  console.log(`Searching for HTML files with pattern:`, pattern);
  const files = await htmlStorage.listStoredHtml(pattern);
  
  const filesToProcess = limit ? files.slice(0, limit) : files;
  console.log(`Found ${files.length} files, processing ${filesToProcess.length}\n`);
  
  // Group files by source
  const filesBySource = new Map<string, string[]>();
  for (const file of filesToProcess) {
    // Extract source from path (e.g., "bring-a-trailer/20250910/...")
    const parts = file.split('/');
    const source = parts[0];
    
    if (!filesBySource.has(source)) {
      filesBySource.set(source, []);
    }
    filesBySource.get(source)!.push(file);
  }
  
  // Process each source
  for (const [source, sourceFiles] of filesBySource) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Processing ${source}: ${sourceFiles.length} files`);
    console.log('='.repeat(50));
    
    const scraper = scrapers[source];
    if (!scraper) {
      console.warn(`⚠️ No scraper found for source: ${source}`);
      continue;
    }
    
    const listings: ScrapedListing[] = [];
    
    for (const file of sourceFiles) {
      try {
        // Download HTML
        const html = await htmlStorage.downloadHtml(file);
        if (!html) {
          console.warn(`⚠️ Could not download: ${file}`);
          continue;
        }
        
        // Parse based on source
        let listing: ScrapedListing | null = null;
        
        if (source === 'bring-a-trailer' || source === 'bat') {
          // Extract URL from filename
          const urlMatch = file.match(/([^/]+)\.html$/);
          if (urlMatch) {
            const encoded = urlMatch[1].replace(/__[a-f0-9]+$/, '');
            const url = `https://${encoded.replace(/_/g, '/')}`;
            listing = (scraper as BaTScraper).parseDetailPage(html, url);
          }
        } else {
          // For other scrapers, we need the parseDetailPage method
          // Most don't have it, so we skip for now
          console.warn(`⚠️ Parser not implemented for ${source} detail pages`);
          continue;
        }
        
        if (listing && listing.price && listing.model) {
          listings.push(listing);
          totalParsed++;
          filesProcessed++;
          
          if (filesProcessed % 10 === 0) {
            console.log(`   Processed ${filesProcessed}/${filesToProcess.length} files...`);
          }
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
    
    // Save all listings for this source
    if (listings.length > 0) {
      console.log(`\n📊 Parsed ${listings.length} valid listings from ${source}`);
      const saved = await saveListings(listings, source);
      totalSaved += saved;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('PARSING COMPLETE');
  console.log('='.repeat(80));
  console.log(`Files processed: ${filesProcessed}`);
  console.log(`Listings parsed: ${totalParsed}`);
  console.log(`Listings saved/updated: ${totalSaved}`);
  
  if (totalSaved === 0 && totalParsed > 0) {
    console.log('\n⚠️ Parsed listings but none were saved. They may already exist in the database.');
  } else if (totalSaved > 0) {
    console.log('\n✅ Successfully saved listings to database!');
  }
}

main().catch(console.error);