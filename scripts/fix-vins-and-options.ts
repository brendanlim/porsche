#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

dotenv.config({ path: '.env.local' });

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

async function fixVinsAndOptions() {
  console.log('Starting VIN and options extraction from stored HTML...\n');
  
  // Get all listings without VINs
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, source_url, source, vin')
    .is('vin', null)
    .eq('source', 'bring-a-trailer')
    .limit(100); // Process in batches
  
  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }
  
  console.log(`Found ${listings?.length || 0} BaT listings missing VINs\n`);
  
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const listing of listings || []) {
    try {
      // Construct the storage path from the URL
      const urlParts = new URL(listing.source_url);
      const pathParts = urlParts.pathname.split('/').filter(p => p);
      
      // BaT URLs are like: /listing/2023-porsche-911-gt3-rs-123
      if (pathParts.length < 2) continue;
      
      // Convert URL to storage path
      const filename = urlParts.hostname.replace(/\./g, '_') + 
                      urlParts.pathname.replace(/\//g, '_') + '.html';
      
      // Try different possible paths where the HTML might be stored
      const possiblePaths = [
        `bring-a-trailer/detail/${filename}`,
        `bat/detail/${filename}`,
        `bring-a-trailer/${filename}`,
        `bat/${filename}`
      ];
      
      let html = null;
      let foundPath = null;
      
      for (const path of possiblePaths) {
        try {
          const { data, error } = await supabase.storage
            .from('raw-html')
            .download(path);
          
          if (!error && data) {
            html = await data.text();
            foundPath = path;
            break;
          }
        } catch (e) {
          // Try next path
        }
      }
      
      if (!html) {
        console.log(`  ❌ No HTML found for ${listing.source_url.substring(0, 50)}...`);
        errorCount++;
        continue;
      }
      
      const $ = cheerio.load(html);
      const updates: any = {};
      
      // Extract VIN (always try to extract, as field might be empty string)
      {
        // Try multiple VIN patterns
        const vinPatterns = [
          /\bVIN[:\s]+([A-HJ-NPR-Z0-9]{17})\b/i,
          /\b([A-HJ-NPR-Z0-9]{17})\b/,
        ];
        
        const pageText = $('body').text();
        for (const pattern of vinPatterns) {
          const vinMatch = pageText.match(pattern);
          if (vinMatch) {
            const vin = vinMatch[1];
            // Validate VIN (17 chars, no I, O, Q)
            if (vin.length === 17 && !/[IOQ]/.test(vin)) {
              updates.vin = vin;
              break;
            }
          }
        }
      }
      
      // We'll handle options extraction in a separate script
      // For now, just focus on VINs
      
      // Update the listing if we found new data
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('listings')
          .update(updates)
          .eq('id', listing.id);
        
        if (updateError) {
          console.error(`  Error updating ${listing.id}:`, updateError.message);
          errorCount++;
        } else {
          updatedCount++;
          console.log(`  ✅ Updated ${listing.id.substring(0, 8)}: VIN = ${updates.vin}`);
        }
      }
      
    } catch (error: any) {
      console.error(`  Error processing ${listing.source_url}:`, error.message);
      errorCount++;
    }
    
    // Add small delay to avoid overwhelming the system
    if (updatedCount % 10 === 0 && updatedCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`\n✅ Completed: ${updatedCount} updated, ${errorCount} errors`);
  
  // Show final stats
  const { count: vinCount } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .not('vin', 'is', null);
  
  const { count: totalCount } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true });
  
  console.log(`\nFinal stats:`);
  console.log(`  Total listings: ${totalCount}`);
  console.log(`  Listings with VINs: ${vinCount} (${Math.round(vinCount!/totalCount! * 100)}%)`);
}

fixVinsAndOptions().catch(console.error);