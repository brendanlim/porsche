import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import axios from 'axios';
import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';

async function fetchBaTAPIWithNonce() {
  const client = new BrightDataClient();
  
  console.log('Fetching BaT auction results using API...\n');
  
  // First, get a page to extract the nonce
  const pageUrl = 'https://bringatrailer.com/porsche/991-gt3/';
  console.log('Getting nonce from:', pageUrl);
  
  const html = await client.fetch(pageUrl);
  const $ = cheerio.load(html);
  
  // Extract the nonce from the page
  const scriptContent = $('script:contains("BAT_MODEL_FILTER")').html() || '';
  const nonceMatch = scriptContent.match(/"nonce":"([^"]+)"/);
  const nonce = nonceMatch ? nonceMatch[1] : null;
  
  console.log('Found nonce:', nonce);
  
  if (!nonce) {
    console.error('Could not find nonce!');
    return;
  }
  
  // Extract the keyword ID from page
  // The page title tells us what model we're on
  const title = $('title').text();
  console.log('Page title:', title);
  
  // Try to call the API with the nonce
  const apiUrl = 'https://bringatrailer.com/wp-json/bringatrailer/1.0/data/keyword-filter';
  
  // Based on BaT's JavaScript, the request format should be:
  const requestData = {
    keyword: '991-gt3', // The model slug from URL
    state: 'sold', // Get only sold items
    sort: 'td', // Recently closed
    page: 1,
  };
  
  console.log('\nCalling API with:', requestData);
  
  try {
    const response = await axios.get(apiUrl, {
      params: {
        ...requestData,
        _wpnonce: nonce,
      },
      headers: {
        'X-WP-Nonce': nonce,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': pageUrl,
        'Accept': 'application/json, text/plain, */*',
      }
    });
    
    console.log('API Response status:', response.status);
    
    if (response.data) {
      console.log('Response keys:', Object.keys(response.data));
      
      if (response.data.items || response.data.listings) {
        const items = response.data.items || response.data.listings;
        console.log(`Found ${items.length} sold listings`);
        
        // Display first few
        items.slice(0, 3).forEach((item: any, i: number) => {
          console.log(`\n${i + 1}. ${item.title || item.name}`);
          console.log(`   Price: ${item.sold_for || item.price}`);
          console.log(`   URL: ${item.url || item.link}`);
        });
      }
    }
    
  } catch (error: any) {
    console.error('API Error:', error.response?.status, error.response?.statusText);
    
    if (error.response?.data) {
      console.log('Error response:', error.response.data);
    }
  }
}

fetchBaTAPIWithNonce().catch(console.error);