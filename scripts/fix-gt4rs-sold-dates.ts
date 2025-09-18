#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { BaTScraper } from '../lib/scrapers/bat';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixGT4RSSoldDates() {
  console.log('='.repeat(80));
  console.log('FIXING GT4 RS SOLD DATES FROM STORED HTML');
  console.log('='.repeat(80));
  
  // 1. Get GT4 RS listings without sold_date
  const { data: missingSoldDate } = await supabase
    .from('listings')
    .select('id, vin, title, source_url, price')
    .eq('trim', 'GT4 RS')
    .is('sold_date', null);
  
  console.log(`Found ${missingSoldDate?.length || 0} GT4 RS listings without sold_date`);
  
  if (!missingSoldDate || missingSoldDate.length === 0) {
    console.log('No listings to fix');
    return;
  }
  
  const scraper = new BaTScraper();
  let fixed = 0;
  let notFound = 0;
  let errors = 0;
  
  // 2. Process each listing
  for (const listing of missingSoldDate) {
    try {
      // Skip if no source_url
      if (!listing.source_url) {
        console.log(`⚠️ No source URL for ${listing.title} - cannot extract sold_date`);
        notFound++;
        continue;
      }
      
      // Convert URL to storage path
      // Example: https://bringatrailer.com/listing/2023-porsche-718-cayman-gt4-rs-weissach-19/
      const urlParts = new URL(listing.source_url);
      const pathParts = urlParts.pathname.split('/').filter(p => p);
      
      // Try to find the HTML file
      // Pattern: bring-a-trailer/YYYYMMDD/model/trim/detail/filename.html
      // We need to search through different dates
      
      const dates = ['20250910', '20250911', '20250912', '20250913', '20250914', '20250915', '20250916'];
      let htmlFound = false;
      
      for (const date of dates) {
        // Try different path combinations
        const paths = [
          `bring-a-trailer/${date}/718-cayman/gt4-rs/detail/${pathParts[pathParts.length - 1]}.html`,
          `bring-a-trailer/${date}/718-cayman/gt4 rs/detail/${pathParts[pathParts.length - 1]}.html`,
          `bring-a-trailer/${date}/718-cayman/GT4 RS/detail/${pathParts[pathParts.length - 1]}.html`,
        ];
        
        for (const path of paths) {
          try {
            const { data: htmlData, error } = await supabase
              .storage
              .from('raw-html')
              .download(path);
            
            if (!error && htmlData) {
              // Parse the HTML
              const html = await htmlData.text();
              const $ = require('cheerio').load(html);
              const pageText = $('body').text();
              
              // Extract sold_date using scraper method
              const sold_date = (scraper as any).extractSoldDate($, pageText);
              
              if (sold_date) {
                // Update the listing
                const { error: updateError } = await supabase
                  .from('listings')
                  .update({ sold_date })
                  .eq('id', listing.id);
                
                if (!updateError) {
                  console.log(`✓ Fixed sold_date for ${listing.title}: ${sold_date}`);
                  fixed++;
                } else {
                  console.error(`Error updating listing ${listing.id}:`, updateError);
                  errors++;
                }
              } else {
                console.log(`⚠️ No sold_date found in HTML for ${listing.title}`);
              }
              
              htmlFound = true;
              break;
            }
          } catch (err) {
            // Try next path
          }
        }
        
        if (htmlFound) break;
      }
      
      if (!htmlFound) {
        console.log(`❌ HTML not found for ${listing.title}`);
        notFound++;
        // NEVER use created_at as a fallback for sold_date
      }
    } catch (err) {
      console.error(`Error processing listing ${listing.id}:`, err);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('COMPLETE');
  console.log('='.repeat(80));
  console.log(`✅ Fixed: ${fixed} listings`);
  console.log(`❌ HTML not found: ${notFound} listings`);
  console.log(`⚠️ Errors: ${errors}`);
  
  // Check final status
  const { count } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('trim', 'GT4 RS')
    .not('sold_date', 'is', null);
  
  console.log(`\n📊 GT4 RS listings with sold_date: ${count} (was ${missingSoldDate.length - fixed} without)`);
}

fixGT4RSSoldDates().catch(console.error);