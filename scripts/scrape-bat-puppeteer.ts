import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataPuppeteer } from '../lib/scrapers/bright-data-puppeteer';
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

async function scrapeBaTWithPuppeteer() {
  const scraper = new BrightDataPuppeteer();
  const batParser = new BaTScraper();
  const allSoldListings: any[] = [];
  
  console.log('🚀 Starting BaT scraping with Bright Data Puppeteer...\n');
  
  for (const modelUrl of MODEL_PAGES.slice(0, 3)) { // Start with first 3 for testing
    console.log(`\n📊 Processing: ${modelUrl}`);
    
    try {
      const result = await scraper.scrapeBaTResults(modelUrl);
      
      if (result.listings && result.listings.length > 0) {
        console.log(`Found ${result.listings.length} sold listings:`);
        
        // Display first few
        result.listings.slice(0, 3).forEach((listing: any) => {
          console.log(`  • ${listing.title}: $${listing.price.toLocaleString()}`);
        });
        
        allSoldListings.push(...result.listings);
        
        // Store the HTML
        await storeHtml(result.html, modelUrl, 'model-page');
      }
      
      // Rate limit between pages
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n\n✅ Total sold listings found: ${allSoldListings.length}`);
  
  if (allSoldListings.length > 0) {
    // Save the list
    const fs = await import('fs');
    fs.writeFileSync('bat-sold-puppeteer.json', JSON.stringify(allSoldListings, null, 2));
    console.log('Saved listing URLs to bat-sold-puppeteer.json');
    
    // Now fetch individual listing pages for detailed data
    console.log('\n📥 Fetching individual listing pages...\n');
    
    for (const listing of allSoldListings.slice(0, 5)) { // Start with first 5
      console.log(`Fetching: ${listing.url}`);
      
      try {
        const listingData = await scraper.scrapeListingPage(listing.url);
        
        if (listingData.status === 'sold') {
          console.log(`  ✓ ${listingData.title}: $${listingData.price?.toLocaleString()}`);
          
          // Parse with BaT scraper for full data extraction
          const parsedListing = await batParser.parseListing(listingData.html, listing.url);
          
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
              console.log('  ✓ Saved to database');
            }
          }
          
          // Store HTML
          await storeHtml(listingData.html, listing.url, 'detail');
        } else {
          console.log('  ⚠️ Not sold (active auction)');
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n✅ Scraping complete!');
}

async function storeHtml(html: string, url: string, type: string) {
  try {
    const urlParts = url.split('/');
    const identifier = urlParts[urlParts.length - 2] || 'unknown';
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const timestamp = Date.now();
    const path = `bat/puppeteer/${date}/${type}/${identifier}_${timestamp}.html`;
    
    const { error } = await supabaseAdmin.storage
      .from('raw-html')
      .upload(path, html, {
        contentType: 'text/html',
        upsert: true
      });
    
    if (!error) {
      console.log(`  ✓ Stored HTML: ${path}`);
    } else {
      console.error('  Storage error:', error);
    }
  } catch (error) {
    console.error('  Error storing HTML:', error);
  }
}

scrapeBaTWithPuppeteer().catch(console.error);