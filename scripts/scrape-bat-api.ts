import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import axios from 'axios';
import { supabaseAdmin } from '../lib/supabase/admin';

// Use the BaT API endpoint for fetching completed/sold auctions
async function scrapeBaTAPI() {
  console.log('Fetching sold listings from BaT API...\n');
  
  // These are the model keywords we're interested in
  const models = [
    '981-cayman',
    'cayman-gt4', 
    '991-gt3',
    '992-gt3',
    '997-gt3',
    '996-gt3',
    '991-911',
    '992-911',
  ];
  
  const allSoldListings: any[] = [];
  
  for (const model of models) {
    console.log(`\nFetching sold listings for ${model}...`);
    
    try {
      // Use the listings-filter API endpoint
      const apiUrl = 'https://bringatrailer.com/wp-json/bringatrailer/1.0/data/listings-filter';
      
      const response = await axios.post(apiUrl, {
        keyword: `porsche ${model.replace('-', ' ')}`,
        status: 'completed', // Get completed auctions
        result: 'sold', // Only sold items
        sort: 'timestamp', // Recently closed
        page: 1,
        per_page: 50
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; PorscheTrends/1.0)',
        }
      });
      
      if (response.data && response.data.listings) {
        const listings = response.data.listings;
        console.log(`  Found ${listings.length} sold listings`);
        
        // Display first few for verification
        listings.slice(0, 3).forEach((listing: any) => {
          console.log(`  - ${listing.title}: ${listing.sold_for || listing.high_bid}`);
        });
        
        allSoldListings.push(...listings);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error: any) {
      console.error(`Error fetching ${model}:`, error.response?.status || error.message);
      
      // If direct API doesn't work, try with Bright Data
      if (error.response?.status === 403) {
        console.log('  Trying with Bright Data proxy...');
        
        const client = new BrightDataClient();
        const apiUrl = `https://bringatrailer.com/wp-json/bringatrailer/1.0/data/listings-filter`;
        
        try {
          const html = await client.fetch(apiUrl);
          console.log('  Response:', html.substring(0, 200));
        } catch (proxyError) {
          console.error('  Proxy error:', proxyError);
        }
      }
    }
  }
  
  console.log(`\n\nTotal sold listings found: ${allSoldListings.length}`);
  
  // Save the data
  if (allSoldListings.length > 0) {
    const fs = await import('fs');
    fs.writeFileSync('bat-sold-listings.json', JSON.stringify(allSoldListings, null, 2));
    console.log('Saved to bat-sold-listings.json');
  }
}

scrapeBaTAPI().catch(console.error);