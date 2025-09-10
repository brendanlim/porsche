import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';
import { supabaseAdmin } from '../lib/supabase/admin';
import { BaTScraper } from '../lib/scrapers/bat';

const MODEL_PAGES = [
  'https://bringatrailer.com/porsche/718-cayman/',
  'https://bringatrailer.com/porsche/981-cayman/',
  'https://bringatrailer.com/porsche/cayman-gt4/',
  'https://bringatrailer.com/porsche/991-gt3/',
  'https://bringatrailer.com/porsche/992-gt3/',
  'https://bringatrailer.com/porsche/997-gt3/',
  'https://bringatrailer.com/porsche/996-gt3/',
  'https://bringatrailer.com/porsche/991-911/',
  'https://bringatrailer.com/porsche/992-911/',
];

async function parseBaTWithJSON() {
  const client = new BrightDataClient();
  const batScraper = new BaTScraper();
  const allSoldListings: any[] = [];
  
  console.log('🚀 Fetching BaT model pages and extracting embedded auction results...\n');
  
  for (const modelUrl of MODEL_PAGES) {
    console.log(`\n📄 Fetching: ${modelUrl}`);
    
    try {
      const html = await client.fetch(modelUrl);
      const $ = cheerio.load(html);
      
      // Find the script tag with auctionsCompletedInitialData
      let auctionData: any = null;
      
      $('script').each((i, el) => {
        const scriptContent = $(el).html() || '';
        
        // Look for the auctionsCompletedInitialData variable
        if (scriptContent.includes('var auctionsCompletedInitialData')) {
          // Extract the JSON data
          const match = scriptContent.match(/var auctionsCompletedInitialData = ({.*?});/s);
          if (match) {
            try {
              auctionData = JSON.parse(match[1]);
            } catch (e) {
              console.error('  ❌ Failed to parse JSON:', e);
            }
          }
        }
      });
      
      if (auctionData && auctionData.items) {
        const items = auctionData.items;
        console.log(`  ✅ Found ${items.length} auction results`);
        
        // Process each sold listing
        items.forEach((item: any) => {
          // Only process if it has a sold_text (indicates it's sold)
          if (item.sold_text && item.url) {
            const priceMatch = item.sold_text.match(/\$([0-9,]+)/);
            const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : item.current_bid;
            
            allSoldListings.push({
              url: item.url,
              title: item.title,
              price: price,
              sold_text: item.sold_text,
              year: item.year,
              id: item.id,
            });
            
            console.log(`    • ${item.title}: $${price.toLocaleString()}`);
          }
        });
      } else {
        console.log('  ⚠️ No auction data found in script tags');
      }
      
      // Store the HTML
      await storeHtml(html, modelUrl, 'model-page');
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`  ❌ Error: ${error}`);
    }
  }
  
  console.log(`\n\n✅ Total sold listings found: ${allSoldListings.length}`);
  
  if (allSoldListings.length > 0) {
    // Save the listings
    const fs = await import('fs');
    fs.writeFileSync('bat-sold-from-json.json', JSON.stringify(allSoldListings, null, 2));
    console.log('Saved to bat-sold-from-json.json');
    
    // Now fetch detail pages and save to database
    console.log('\n📥 Fetching detail pages...\n');
    
    for (const listing of allSoldListings) { // Fetch all listings
      console.log(`Fetching: ${listing.url}`);
      
      try {
        const html = await client.fetch(listing.url);
        const parsedListing = await batScraper.scrapeDetail(listing.url);
        
        if (parsedListing) {
          // Save to database
          const { error } = await supabaseAdmin
            .from('listings')
            .upsert({
              ...parsedListing,
              source: 'bring-a-trailer',
              scraped_at: new Date().toISOString(),
            }, {
              onConflict: 'url',
            });
          
          if (!error) {
            console.log(`  ✓ Saved: ${parsedListing.title} - $${parsedListing.price?.toLocaleString()}`);
          } else {
            console.error(`  ❌ Database error: ${error.message}`);
          }
        }
        
        await storeHtml(html, listing.url, 'detail');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`  ❌ Error: ${error}`);
      }
    }
  }
  
  console.log('\n✅ Done!');
}

async function storeHtml(html: string, url: string, type: string) {
  try {
    // Extract model and trim from URL
    // URLs are like: https://bringatrailer.com/porsche/718-cayman/
    // or: https://bringatrailer.com/listing/2022-porsche-718-cayman-gt4-rs/
    const urlParts = url.split('/');
    
    let model = 'unknown';
    let trim = 'base';
    let identifier = 'unknown';
    
    if (url.includes('/porsche/') && !url.includes('/listing/')) {
      // Model page URL
      model = urlParts[urlParts.length - 2] || 'unknown'; // e.g., "718-cayman", "991-gt3"
      
      // Extract trim from model if it includes it (e.g., "cayman-gt4" -> model: "cayman", trim: "gt4")
      if (model.includes('gt4') || model.includes('gt3') || model.includes('gt2')) {
        const parts = model.split('-');
        if (parts.length > 2) {
          trim = parts.slice(-1)[0]; // Last part is trim (gt4, gt3, etc)
          model = parts.slice(0, -1).join('-'); // Everything else is model
        }
      }
      identifier = model;
    } else if (url.includes('/listing/')) {
      // Detail page URL
      identifier = urlParts[urlParts.length - 2] || 'unknown';
      // Try to extract model from listing URL or title
      const yearMatch = identifier.match(/(\d{4})-porsche-(\w+)/);
      if (yearMatch) {
        model = yearMatch[2];
      }
    }
    
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const timestamp = Date.now();
    const filename = type === 'model-page' ? `${identifier}.html` : `${identifier}_${timestamp}.html`;
    
    // Correct path structure: source/model/trim/date/type/filename.html
    const path = `bat/${model}/${trim}/${date}/${type}/${filename}`;
    
    const { error } = await supabaseAdmin.storage
      .from('raw-html')
      .upload(path, html, {
        contentType: 'text/html',
        upsert: true
      });
    
    if (!error) {
      console.log(`  ✓ Stored HTML: ${path}`);
    }
  } catch (error) {
    console.error('  Error storing HTML:', error);
  }
}

parseBaTWithJSON().catch(console.error);