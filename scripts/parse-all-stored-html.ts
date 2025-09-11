#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { BaTScraper } from '../lib/scrapers/bat';

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
          
          // Parse the listing - BaTScraper doesn't have parseDetailPage, 
          // so we need to extract the data manually
          const $ = require('cheerio').load(html);
          
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
          
          // Extract mileage
          let mileage = undefined;
          const mileageMatch = $.html().match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles|mi\b)/i);
          if (mileageMatch) {
            mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
          }
          
          // Normalize model/trim
          const { normalizeModelTrim } = await import('../lib/services/model-trim-normalizer');
          const normalized = await normalizeModelTrim(title);
          
          // Extract color
          const colorMatch = $.html().match(/(?:finished in|painted in|exterior:?)\s*([^,\.<]+)/i);
          const exterior_color = colorMatch ? colorMatch[1].trim() : undefined;
          
          // Extract options
          const optionsSection = $('.essentials-value').filter((i: number, el: any) => 
            $(el).text().includes('•') || $(el).text().includes(',')
          ).text();
          
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
            options_text: optionsSection || undefined,
            vin: undefined,
            interior_color: undefined,
            dealer_name: 'Private Party',
            location: undefined,
            description: undefined,
            sold_date: undefined,
          };
          
          if (!listing || !listing.price || !listing.model) {
            skippedCount++;
            continue;
          }
          
          // Check if listing already exists
          let existingId = null;
          
          if (listing.source_url) {
            const { data: existing } = await supabase
              .from('listings')
              .select('id')
              .eq('source_url', listing.source_url)
              .single();
            
            if (existing) existingId = existing.id;
          }
          
          if (existingId) {
            // Update existing
            const { error } = await supabase
              .from('listings')
              .update({
                price: listing.price,
                mileage: listing.mileage,
                sold_date: listing.sold_date,
                exterior_color: listing.exterior_color,
                options_text: listing.options_text,
                year: listing.year,
                model: listing.model,
                trim: listing.trim,
                generation: listing.generation,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingId);
            
            if (!error) {
              updatedCount++;
              if (updatedCount % 10 === 0) {
                console.log(`   Updated ${updatedCount} listings...`);
              }
            }
          } else {
            // Insert new
            const { error } = await supabase
              .from('listings')
              .insert({
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
              });
            
            if (!error) {
              savedCount++;
              console.log(`✅ Saved: ${listing.year || '?'} ${listing.model} ${listing.trim || ''} - $${listing.price.toLocaleString()}`);
            } else if (error.message.includes('duplicate')) {
              updatedCount++;
            } else {
              console.error(`❌ Error saving:`, error.message);
              errorCount++;
            }
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