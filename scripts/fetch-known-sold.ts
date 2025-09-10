import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import { BaTScraper } from '../lib/scrapers/bat';
import { supabaseAdmin } from '../lib/supabase/admin';

// Known sold BaT URLs for testing - these are confirmed sold listings
const KNOWN_SOLD_URLS = [
  'https://bringatrailer.com/listing/2022-porsche-718-cayman-gt4-16/',
  'https://bringatrailer.com/listing/2016-porsche-cayman-gt4-50/',
  'https://bringatrailer.com/listing/2022-porsche-911-gt3-54/',
  'https://bringatrailer.com/listing/2018-porsche-911-gt3-27/',
  'https://bringatrailer.com/listing/2015-porsche-911-gt3-40/',
  'https://bringatrailer.com/listing/2014-porsche-911-gt3-23/',
];

async function fetchKnownSoldListings() {
  const scraper = new BaTScraper();
  const client = new BrightDataClient();
  
  console.log('Fetching known sold BaT listings...\n');
  
  for (const url of KNOWN_SOLD_URLS) {
    console.log(`\nFetching: ${url}`);
    
    try {
      // Fetch the HTML
      const html = await client.fetch(url);
      
      // Parse it using our existing scraper
      const listing = await scraper.scrapeDetail(url);
      
      if (listing) {
        console.log(`  ✓ Title: ${listing.title}`);
        console.log(`  ✓ Price: $${listing.price?.toLocaleString()}`);
        console.log(`  ✓ Model: ${listing.model} | Trim: ${listing.trim}`);
        
        // Save to database
        const { error } = await supabaseAdmin
          .from('listings')
          .upsert({
            ...listing,
            source: 'bring-a-trailer',
            scraped_at: new Date().toISOString(),
          }, {
            onConflict: 'url',
          });
        
        if (error) {
          console.error('  ✗ Database error:', error.message);
        } else {
          console.log('  ✓ Saved to database');
        }
      } else {
        console.log('  ✗ Failed to parse listing');
      }
      
      // Store HTML
      const urlParts = url.split('/');
      const slug = urlParts[urlParts.length - 2];
      await storeHtml(html, url, 'detail', slug);
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`  ✗ Error: ${error}`);
    }
  }
  
  console.log('\n✅ Done fetching known sold listings');
}

async function storeHtml(html: string, url: string, type: string, slug: string) {
  try {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const path = `bat/sold/${date}/${type}/${slug}.html`;
    
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
    console.error('  ✗ Error storing HTML:', error);
  }
}

fetchKnownSoldListings().catch(console.error);