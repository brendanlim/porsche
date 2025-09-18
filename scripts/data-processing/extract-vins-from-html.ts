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

async function extractVINs() {
  console.log('Starting VIN extraction from stored HTML...\n');
  
  let processedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  
  // Recursively process all HTML files in storage
  async function processPath(path: string) {
    const { data: items } = await supabase.storage
      .from('raw-html')
      .list(path, { limit: 1000 });
    
    for (const item of items || []) {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      
      if (item.name.endsWith('.html')) {
        // Skip search pages, only process detail pages
        if (!fullPath.includes('/detail/')) {
          continue;
        }
        
        processedCount++;
        if (processedCount % 100 === 0) {
          console.log(`Processed ${processedCount} files, updated ${updatedCount} VINs...`);
        }
        
        try {
          // Download the HTML
          const { data: htmlData, error: downloadError } = await supabase
            .storage
            .from('raw-html')
            .download(fullPath);
          
          if (downloadError) {
            errorCount++;
            continue;
          }
          
          const html = await htmlData.text();
          const $ = cheerio.load(html);
          
          // Extract VIN using multiple patterns
          let vin: string | null = null;
          const pageText = $('body').text();
          
          // Try multiple VIN patterns
          const vinPatterns = [
            /\bVIN[:\s]+([A-HJ-NPR-Z0-9]{17})\b/i,
            /VIN#[:\s]*([A-HJ-NPR-Z0-9]{17})\b/i,
            /Vehicle\s+Identification\s+Number[:\s]+([A-HJ-NPR-Z0-9]{17})\b/i,
          ];
          
          for (const pattern of vinPatterns) {
            const vinMatch = pageText.match(pattern);
            if (vinMatch) {
              const potentialVin = vinMatch[1];
              // Validate VIN (17 chars, no I, O, Q)
              if (potentialVin.length === 17 && !/[IOQ]/.test(potentialVin)) {
                vin = potentialVin;
                break;
              }
            }
          }
          
          // If no VIN found with context, try to find standalone 17-char code
          if (!vin) {
            const standalonePattern = /\b([A-HJ-NPR-Z0-9]{17})\b/g;
            const matches = pageText.matchAll(standalonePattern);
            for (const match of matches) {
              const potentialVin = match[1];
              // Check if it looks like a VIN (starts with WP for Porsche)
              if (potentialVin.startsWith('WP') && !/[IOQ]/.test(potentialVin)) {
                vin = potentialVin;
                break;
              }
            }
          }
          
          if (vin) {
            // Extract URL from the filename to match with database
            // Files are stored like: bringatrailer_com_listing_2023-porsche-911-gt3-rs.html
            const urlMatch = item.name.match(/([^/]+)\.html$/);
            if (!urlMatch) continue;
            
            const encoded = urlMatch[1];
            // Reconstruct the URL
            const reconstructedUrl = 'https://' + encoded.replace(/_/g, '/').replace('/com/', '.com/');
            
            // Update the listing with the VIN
            const { data: existingListing } = await supabase
              .from('listings')
              .select('id, vin')
              .eq('source_url', reconstructedUrl)
              .single();
            
            if (existingListing && !existingListing.vin) {
              const { error: updateError } = await supabase
                .from('listings')
                .update({ 
                  vin: vin,
                  raw_html_path: fullPath // Save the path for future reference
                })
                .eq('id', existingListing.id);
              
              if (!updateError) {
                updatedCount++;
                console.log(`  ✅ Updated VIN for ${reconstructedUrl.substring(0, 50)}... => ${vin}`);
              } else {
                errorCount++;
              }
            }
          }
          
        } catch (error: any) {
          errorCount++;
        }
      } else if (!item.name.includes('.')) {
        // It's a folder, recurse into it
        await processPath(fullPath);
      }
    }
  }
  
  // Start processing from BAT folders
  console.log('Processing BAT HTML files...');
  await processPath('bat');
  await processPath('bring-a-trailer');
  
  console.log(`\n✅ VIN extraction complete!`);
  console.log(`   Processed: ${processedCount} HTML files`);
  console.log(`   Updated: ${updatedCount} VINs`);
  console.log(`   Errors: ${errorCount}`);
  
  // Show final stats
  const { count: vinCount } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .not('vin', 'is', null);
  
  const { count: totalCount } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true });
  
  console.log(`\nFinal database stats:`);
  console.log(`  Total listings: ${totalCount}`);
  console.log(`  Listings with VINs: ${vinCount} (${Math.round(vinCount!/totalCount! * 100)}%)`);
}

extractVINs().catch(console.error);