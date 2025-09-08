import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataBrowser } from '../lib/scrapers/bright-data-browser';
import * as cheerio from 'cheerio';
import { supabaseAdmin } from '../lib/supabase/admin';

// Model pages that contain auction results
const MODEL_PAGES = [
  'https://bringatrailer.com/porsche/718-cayman/',
  'https://bringatrailer.com/porsche/981-cayman/', 
  'https://bringatrailer.com/porsche/cayman-gt4/',
  'https://bringatrailer.com/porsche/991-gt3/',
  'https://bringatrailer.com/porsche/992-gt3/',
  'https://bringatrailer.com/porsche/997-gt3/',
  'https://bringatrailer.com/porsche/996-gt3/',
];

async function scrapeBaTWithBrowser() {
  const browser = new BrightDataBrowser();
  const allSoldListings: any[] = [];
  
  console.log('Scraping BaT with Bright Data Browser (JavaScript rendering)...\n');
  
  for (const modelUrl of MODEL_PAGES) {
    console.log(`\n📄 Fetching: ${modelUrl}`);
    
    try {
      // Fetch the page with JS rendering - this will load the auction results
      const html = await browser.fetchWithJS(modelUrl, '.auctions-completed-container');
      const $ = cheerio.load(html);
      
      console.log('Page title:', $('title').text());
      
      // Now look for the auction results section which should be loaded
      const resultsSection = $('.auctions-completed-container');
      if (resultsSection.length > 0) {
        console.log('✓ Found auction results section');
        
        // Find all listing cards in the results
        const resultCards = resultsSection.find('.listing-card');
        console.log(`Found ${resultCards.length} completed auctions`);
        
        resultCards.each((i, el) => {
          const $card = $(el);
          const link = $card.find('a').first().attr('href');
          const title = $card.find('.listing-title').text().trim();
          
          // Look for sold price
          const priceText = $card.text();
          const soldMatch = priceText.match(/Sold for \$([0-9,]+)/);
          
          if (soldMatch && link) {
            const price = parseInt(soldMatch[1].replace(/,/g, ''));
            const fullUrl = link.startsWith('http') ? link : `https://bringatrailer.com${link}`;
            
            allSoldListings.push({
              url: fullUrl,
              title: title || 'Unknown',
              price,
              source: modelUrl,
            });
            
            console.log(`  ✓ ${title}: $${price.toLocaleString()}`);
          }
        });
      } else {
        console.log('⚠ No auction results section found');
        
        // Check if results might be in a different container
        const anyResults = $('*:contains("Sold for")').length;
        console.log(`  Found ${anyResults} elements with "Sold for" text`);
      }
      
      // Store the HTML for debugging
      await storeHtml(html, modelUrl, 'model-page-with-js');
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error: any) {
      console.error(`❌ Error fetching ${modelUrl}:`, error.message);
    }
  }
  
  console.log(`\n\n✅ Total sold listings found: ${allSoldListings.length}`);
  
  if (allSoldListings.length > 0) {
    // Save the results
    const fs = await import('fs');
    fs.writeFileSync('bat-sold-listings-browser.json', JSON.stringify(allSoldListings, null, 2));
    console.log('Saved to bat-sold-listings-browser.json');
    
    // Now fetch individual listing pages for detailed data
    console.log('\nFetching individual listing pages...\n');
    
    for (const listing of allSoldListings.slice(0, 5)) { // Start with first 5
      console.log(`Fetching: ${listing.url}`);
      
      try {
        const html = await browser.fetchWithJS(listing.url);
        
        // Parse and save to database
        // ... (use existing BaT scraper logic)
        
        await storeHtml(html, listing.url, 'detail');
        console.log('  ✓ Stored');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`  ❌ Error: ${error}`);
      }
    }
  }
}

async function storeHtml(html: string, url: string, type: string) {
  try {
    const urlParts = url.split('/');
    const model = urlParts[urlParts.length - 2] || 'unknown';
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const timestamp = Date.now();
    const path = `bat/browser/${date}/${type}/${model}_${timestamp}.html`;
    
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

scrapeBaTWithBrowser().catch(console.error);