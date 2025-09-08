import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';
import { supabaseAdmin } from '../lib/supabase/admin';

// Use the auction results search with search parameter
const SEARCH_URLS = [
  'https://bringatrailer.com/auctions/results/?search=Porsche+718+Cayman',
  'https://bringatrailer.com/auctions/results/?search=Porsche+Cayman+GT4',
  'https://bringatrailer.com/auctions/results/?search=Porsche+911+GT3',
  'https://bringatrailer.com/auctions/results/?search=Porsche+911+GT2',
  'https://bringatrailer.com/auctions/results/?search=Porsche+992+911',
  'https://bringatrailer.com/auctions/results/?search=Porsche+991+911',
];

async function scrapeBaTSearchResults() {
  const client = new BrightDataClient();
  const allSoldListings: string[] = [];
  
  console.log('Scraping BaT Auction Results Search pages...\n');
  
  for (const searchUrl of SEARCH_URLS) {
    console.log(`\nFetching: ${searchUrl}`);
    
    try {
      const html = await client.fetch(searchUrl);
      const $ = cheerio.load(html);
      
      console.log('Page title:', $('title').text());
      
      // The results are loaded dynamically, but let's check if there's embedded data
      // Look for script tags with auction data
      let foundListings = 0;
      
      $('script').each((i, el) => {
        const scriptContent = $(el).html() || '';
        
        // Look for JSON data with listings
        if (scriptContent.includes('window.__INITIAL_STATE__') || 
            scriptContent.includes('auctionResults') ||
            scriptContent.includes('"listings"')) {
          
          // Try to extract JSON data
          const jsonMatches = scriptContent.match(/\{.*"listings".*\}/);
          if (jsonMatches) {
            try {
              const data = JSON.parse(jsonMatches[0]);
              if (data.listings) {
                foundListings = data.listings.length;
                console.log(`  Found ${foundListings} listings in embedded data`);
                
                // Extract URLs from listings
                data.listings.forEach((listing: any) => {
                  if (listing.url && listing.sold_for) {
                    allSoldListings.push(listing.url);
                    console.log(`  ✓ ${listing.title}: $${listing.sold_for}`);
                  }
                });
              }
            } catch (e) {
              // JSON parse error
            }
          }
        }
      });
      
      // If no embedded data, the page likely loads results via AJAX
      if (foundListings === 0) {
        console.log('  Results are loaded dynamically via JavaScript');
        console.log('  Need to use the API endpoint or a headless browser');
      }
      
      // Save HTML for inspection
      const searchTerm = searchUrl.split('search=')[1].replace(/\+/g, '-');
      const fileName = `bat-search-${searchTerm}.html`;
      
      const fs = await import('fs');
      fs.writeFileSync(fileName, html);
      console.log(`  Saved to ${fileName}`);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Error fetching ${searchUrl}:`, error);
    }
  }
  
  console.log(`\n\nTotal sold listings found: ${allSoldListings.length}`);
  
  if (allSoldListings.length > 0) {
    console.log('\nNow fetching individual listing pages...\n');
    
    // Fetch each listing page
    for (const listingUrl of allSoldListings.slice(0, 10)) { // Limit to 10 for testing
      console.log(`Fetching: ${listingUrl}`);
      
      try {
        const html = await client.fetch(listingUrl);
        // Process with BaT scraper...
        console.log('  ✓ Fetched successfully');
        
        // Store HTML
        await storeHtml(html, listingUrl, 'detail');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`  ✗ Error: ${error}`);
      }
    }
  }
}

async function storeHtml(html: string, url: string, type: string) {
  try {
    const urlParts = url.split('/');
    const slug = urlParts[urlParts.length - 2] || 'unknown';
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const path = `bat/search-results/${date}/${type}/${slug}.html`;
    
    const { error } = await supabaseAdmin.storage
      .from('raw-html')
      .upload(path, html, {
        contentType: 'text/html',
        upsert: true
      });
    
    if (!error) {
      console.log(`  ✓ Stored HTML`);
    }
  } catch (error) {
    console.error('  Error storing HTML:', error);
  }
}

scrapeBaTSearchResults().catch(console.error);