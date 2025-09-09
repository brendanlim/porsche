import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';
import * as cheerio from 'cheerio';

async function analyzeBaTFull() {
  const brightData = new BrightDataClient();
  
  console.log('🔍 Analyzing BaT pagination: JSON vs HTML cards...\n');
  
  // Analyze search page instead of detail page
  const url = 'https://bringatrailer.com/porsche/';
  console.log(`URL: ${url}\n`);
  
  try {
    const html = await brightData.fetch(url);
    const $ = cheerio.load(html);
    
    // 1. Extract from embedded JSON
    console.log('=== JSON DATA (auctionsCompletedInitialData) ===');
    let jsonListings: any[] = [];
    
    $('script').each((i, el) => {
      const scriptContent = $(el).html() || '';
      if (scriptContent.includes('var auctionsCompletedInitialData')) {
        const match = scriptContent.match(/var auctionsCompletedInitialData = ({.*?});/s);
        if (match) {
          try {
            const auctionData = JSON.parse(match[1]);
            if (auctionData.items) {
              jsonListings = auctionData.items;
              console.log(`Found ${jsonListings.length} items in JSON`);
              
              // Show first few
              console.log('\nFirst 5 JSON listings:');
              jsonListings.slice(0, 5).forEach((item, i) => {
                console.log(`  ${i + 1}. ${item.title}`);
                console.log(`     Price: ${item.sold_text || item.current_bid || 'N/A'}`);
                console.log(`     URL: ${item.url}`);
              });
              
              // Count sold vs active
              const soldCount = jsonListings.filter(item => item.sold_text).length;
              console.log(`\nJSON Stats: ${soldCount} sold, ${jsonListings.length - soldCount} active`);
            }
          } catch (e) {
            console.error('Failed to parse JSON:', e);
          }
        }
      }
    });
    
    // 2. Extract from HTML cards (like Python version does)
    console.log('\n=== HTML CARDS (div.listing-card) ===');
    const htmlCards = $('.listing-card');
    console.log(`Found ${htmlCards.length} HTML card elements`);
    
    if (htmlCards.length > 0) {
      console.log('\nFirst 5 HTML cards:');
      const htmlListings: any[] = [];
      
      htmlCards.slice(0, 5).each((i, card) => {
        const $card = $(card);
        const title = $card.find('h3.listing-title').text().trim() ||
                     $card.find('.listing-title').text().trim() ||
                     $card.find('h3').text().trim();
        const priceText = $card.find('.listing-stats-value').text().trim();
        const sold = $card.find('.listing-tag-sold').length > 0;
        const link = $card.find('a.listing-link').attr('href');
        
        console.log(`  ${i + 1}. ${title}`);
        console.log(`     Price: ${priceText} ${sold ? '(SOLD)' : '(ACTIVE)'}`);
        console.log(`     URL: ${link}`);
        
        htmlListings.push({ title, priceText, sold, link });
      });
      
      // Count all cards
      let totalSold = 0;
      let totalActive = 0;
      htmlCards.each((i, card) => {
        const isSold = $(card).find('.listing-tag-sold').length > 0;
        if (isSold) totalSold++;
        else totalActive++;
      });
      
      console.log(`\nHTML Stats: ${totalSold} sold, ${totalActive} active`);
    }
    
    // 3. Compare JSON vs HTML
    console.log('\n=== COMPARISON ===');
    console.log(`Embedded JSON: ${jsonListings.length} listings`);
    console.log(`HTML Cards: ${htmlCards.length} listings`);
    
    if (jsonListings.length !== htmlCards.length) {
      console.log('\n⚠️  MISMATCH: JSON and HTML have different counts!');
      console.log('This means we\'re missing listings if we only use JSON.');
    } else {
      console.log('\n✅ Counts match');
    }
    
    // 4. Check for dynamic loading (Show More button)
    console.log('\n=== DYNAMIC LOADING ===');
    const showMoreButton = $('button.button-show-more, button[data-bind*="loadNextPage"], button:contains("Show More")');
    console.log(`"Show More" button found: ${showMoreButton.length > 0 ? 'YES' : 'NO'}`);
    
    if (showMoreButton.length > 0) {
      console.log('Button attributes:');
      console.log('  Text:', showMoreButton.text().trim());
      console.log('  Class:', showMoreButton.attr('class'));
      console.log('  data-bind:', showMoreButton.attr('data-bind'));
      console.log('\n⚠️  BaT uses dynamic loading! Need to click "Show More" to get all listings.');
    }
    
    // 5. Check pagination (static links)
    console.log('\n=== PAGINATION ===');
    const paginationLinks = $('.pagination a, .page-numbers a, a[href*="/page/"]');
    console.log(`Pagination links found: ${paginationLinks.length}`);
    
    if (paginationLinks.length > 0) {
      console.log('Pagination URLs:');
      paginationLinks.slice(0, 10).each((i, link) => {
        const href = $(link).attr('href');
        if (href && href.includes('/page/')) {
          console.log(`  - ${href}`);
        }
      });
    }
    
    // 6. Test multiple pages
    console.log('\n=== TESTING MULTIPLE PAGES ===');
    const pagesToTest = [2, 3, 4, 5];
    
    for (const pageNum of pagesToTest) {
      const pageUrl = `https://bringatrailer.com/porsche/page/${pageNum}/`;
      console.log(`\nFetching page ${pageNum}: ${pageUrl}`);
      
      try {
        const pageHtml = await brightData.fetch(pageUrl);
        const $page = cheerio.load(pageHtml);
        
        // Check for JSON on this page
        let pageJsonCount = 0;
        $page('script').each((i, el) => {
          const scriptContent = $page(el).html() || '';
          if (scriptContent.includes('var auctionsCompletedInitialData')) {
            const match = scriptContent.match(/var auctionsCompletedInitialData = ({.*?});/s);
            if (match) {
              try {
                const data = JSON.parse(match[1]);
                if (data.items) {
                  pageJsonCount = data.items.length;
                }
              } catch (e) {}
            }
          }
        });
        
        // Count HTML cards
        const pageCards = $page('.listing-card').length;
        
        console.log(`  JSON: ${pageJsonCount} listings`);
        console.log(`  HTML: ${pageCards} cards`);
        
        // Check for Show More button
        const hasShowMore = $page('button.button-show-more').length > 0;
        console.log(`  Show More button: ${hasShowMore ? 'YES' : 'NO'}`);
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      } catch (e) {
        console.log(`  Error fetching page ${pageNum}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeBaTFull().catch(console.error);