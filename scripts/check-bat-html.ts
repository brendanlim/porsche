import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';
import * as cheerio from 'cheerio';

async function main() {
  console.log('Checking stored BaT HTML for GT4 RS...\n');
  
  // Download the most recent BaT GT4 RS search HTML
  const { data: files } = await supabaseAdmin
    .storage
    .from('raw-html')
    .list('bring-a-trailer/20250908/718-cayman/gt4-rs/search', {
      limit: 1,
      sortBy: { column: 'created_at', order: 'desc' }
    });
  
  if (!files || files.length === 0) {
    console.log('No GT4 RS search HTML found');
    return;
  }
  
  const fileName = files[0].name;
  console.log(`Found HTML file: ${fileName}`);
  
  // Download the HTML
  const { data: htmlBlob } = await supabaseAdmin
    .storage
    .from('raw-html')
    .download(`bring-a-trailer/20250908/718-cayman/gt4-rs/search/${fileName}`);
  
  if (!htmlBlob) {
    console.log('Failed to download HTML');
    return;
  }
  
  const html = await htmlBlob.text();
  console.log(`HTML size: ${html.length} bytes\n`);
  
  // Parse with cheerio
  const $ = cheerio.load(html);
  
  // Check for "no results" message
  const noResults = $('.no-results-message').text();
  if (noResults) {
    console.log('❌ No results message found:', noResults);
  }
  
  // Look for auction cards
  const auctionCards = $('.listing-card').length;
  console.log(`Found ${auctionCards} .listing-card elements`);
  
  // Look for auction result items
  const resultItems = $('.auction-result-item').length;
  console.log(`Found ${resultItems} .auction-result-item elements`);
  
  // Check for embedded JSON
  const scripts = $('script').toArray();
  let foundJson = false;
  
  for (const script of scripts) {
    const content = $(script).html() || '';
    if (content.includes('auctionsCompletedInitialData')) {
      console.log('\n✅ Found auctionsCompletedInitialData in embedded JSON');
      const match = content.match(/auctionsCompletedInitialData\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          console.log(`   Contains ${data.length} completed auctions`);
          if (data.length > 0) {
            console.log('\nFirst few listings:');
            data.slice(0, 3).forEach((item: any) => {
              console.log(`  - ${item.title}`);
              console.log(`    Price: ${item.current_bid}, URL: ${item.url}`);
            });
          }
        } catch (e) {
          console.log('   Failed to parse JSON');
        }
      }
      foundJson = true;
      break;
    }
  }
  
  if (!foundJson) {
    console.log('\n❌ No auctionsCompletedInitialData found in page');
  }
  
  // Check page title
  const pageTitle = $('title').text();
  console.log(`\nPage title: ${pageTitle}`);
  
  // Check for any Porsche text
  const porscheCount = (html.match(/porsche/gi) || []).length;
  console.log(`"Porsche" appears ${porscheCount} times in HTML`);
  
  // Check for GT4 RS text
  const gt4rsCount = (html.match(/GT4[\s-]*RS/gi) || []).length;
  console.log(`"GT4 RS" appears ${gt4rsCount} times in HTML`);
}

main().catch(console.error);