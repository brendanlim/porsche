import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';
import { supabaseAdmin } from '../lib/supabase/admin';

// BaT URLs for different models - these show ALL listings (active and sold)
const BAT_URLS = [
  'https://bringatrailer.com/porsche/981-cayman/',
  'https://bringatrailer.com/porsche/cayman-gt4/',
  'https://bringatrailer.com/porsche/991-gt3/',
  'https://bringatrailer.com/porsche/992-gt3/',
  'https://bringatrailer.com/porsche/997-gt3/',
  'https://bringatrailer.com/porsche/996-gt3/',
  'https://bringatrailer.com/porsche/991-gt2/',
  'https://bringatrailer.com/porsche/993-gt2/',
  'https://bringatrailer.com/porsche/996-gt2/',
  'https://bringatrailer.com/porsche/997-gt2/',
  'https://bringatrailer.com/porsche/992-911/',
  'https://bringatrailer.com/porsche/991-911/',
];

async function scrapeBaTSoldListings() {
  const client = new BrightDataClient();
  const soldListings: string[] = [];
  
  console.log('Scraping BaT for SOLD listings from Auction Results sections...\n');
  
  for (const modelUrl of BAT_URLS) {
    console.log(`\nChecking ${modelUrl}`);
    
    try {
      const html = await client.fetch(modelUrl);
      const $ = cheerio.load(html);
      
      // Look for the Auction Results section - this contains SOLD listings
      // The auction results are loaded dynamically, but we can find them in the HTML
      
      // Method 1: Look for elements that contain "Sold for" text
      const soldElements = $('*:contains("Sold for")').closest('.listing-card, .auction-item, [class*="listing"]');
      console.log(`  Found ${soldElements.length} elements with "Sold for"`);
      
      soldElements.each((i, el) => {
        const $card = $(el);
        const link = $card.find('a').first().attr('href');
        
        if (link && !link.includes('#')) {
          const fullUrl = link.startsWith('http') ? link : `https://bringatrailer.com${link}`;
          if (!soldListings.includes(fullUrl)) {
            soldListings.push(fullUrl);
            console.log(`  ✓ Found sold listing: ${fullUrl}`);
          }
        }
      });
      
      // Method 2: Check the auction results data embedded in the page
      // BaT often embeds auction data in script tags
      $('script').each((i, el) => {
        const scriptContent = $(el).html() || '';
        if (scriptContent.includes('auctionResults') || scriptContent.includes('sold_for')) {
          // Parse any JSON data that might contain sold listings
          const jsonMatches = scriptContent.match(/\{[^{}]*"sold_for"[^{}]*\}/g);
          if (jsonMatches) {
            console.log(`  Found ${jsonMatches.length} sold listings in embedded data`);
          }
        }
      });
      
      // Store the search page HTML for reference
      await storeHtml(html, modelUrl, 'search');
      
    } catch (error) {
      console.error(`Failed to scrape ${modelUrl}:`, error);
    }
  }
  
  console.log(`\n\nFound ${soldListings.length} sold listings to scrape`);
  
  // Now scrape each sold listing's detail page
  console.log('\nScraping detail pages for sold listings...\n');
  
  for (const listingUrl of soldListings.slice(0, 50)) { // Limit to 50 for now
    console.log(`Fetching: ${listingUrl}`);
    
    try {
      const html = await client.fetch(listingUrl);
      const $ = cheerio.load(html);
      
      // Verify this is actually sold
      const pageText = html.toLowerCase();
      const isSold = pageText.includes('sold for') && !pageText.includes('current bid');
      
      if (isSold) {
        // Store the HTML
        await storeHtml(html, listingUrl, 'detail');
        console.log('  ✓ Stored sold listing HTML');
      } else {
        console.log('  ⚠ Skipped - appears to be active');
      }
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Failed to fetch ${listingUrl}:`, error);
    }
  }
  
  console.log('\n✅ Scraping complete!');
}

async function storeHtml(html: string, url: string, type: 'search' | 'detail') {
  try {
    // Extract model from URL
    const urlParts = url.split('/');
    let model = 'unknown';
    
    if (url.includes('/porsche/')) {
      const porscheIndex = urlParts.indexOf('porsche');
      if (porscheIndex !== -1 && urlParts[porscheIndex + 1]) {
        model = urlParts[porscheIndex + 1].replace('?', '').split('?')[0];
      }
    }
    
    // Generate filename
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = url.replace(/[^a-z0-9]/gi, '_').substring(0, 100) + '.html';
    const path = `bat/${model}/${date}/${type}/${filename}`;
    
    // Upload to Supabase storage
    const { error } = await supabaseAdmin.storage
      .from('raw-html')
      .upload(path, html, {
        contentType: 'text/html',
        upsert: true
      });
    
    if (error) {
      console.error('Failed to store HTML:', error);
    }
  } catch (error) {
    console.error('Error storing HTML:', error);
  }
}

scrapeBaTSoldListings().catch(console.error);