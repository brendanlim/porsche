#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';
import * as cheerio from 'cheerio';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testCarsAndBidsURLs() {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;

  if (!apiKey) {
    console.error('❌ SCRAPINGBEE_API_KEY not found');
    return;
  }

  console.log('🧪 Testing Cars & Bids URL Structure');
  console.log('═'.repeat(60));

  // Test different URLs to understand structure
  const testUrls = [
    'https://carsandbids.com',
    'https://carsandbids.com/search/porsche',
    'https://carsandbids.com/search/porsche/911',
    'https://carsandbids.com/past-auctions',
    'https://carsandbids.com/past-auctions/porsche',
  ];

  for (const url of testUrls) {
    console.log(`\n📊 Testing: ${url}`);

    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        url: url,
        render_js: 'true',  // Cars & Bids needs JS
        wait: '5000',
        premium_proxy: 'true',
        country_code: 'us',
        json_response: 'true'
      });

      const response = await fetch(`https://app.scrapingbee.com/api/v1?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.body) {
        const $ = cheerio.load(data.body);

        console.log(`✅ Status: ${data['initial-status-code'] || 200}`);
        console.log(`   HTML length: ${data.body.length} characters`);

        // Check for different types of content
        const currentAuctions = $('.auction-item, .auction-card, [class*="auction"]').length;
        const pastAuctions = $('.past-auction, .past-auction-item, [class*="past"]').length;
        const searchResults = $('.search-result, .result-item').length;
        const links = $('a[href*="/auctions/"]').length;

        console.log(`   Current auctions: ${currentAuctions}`);
        console.log(`   Past auctions: ${pastAuctions}`);
        console.log(`   Search results: ${searchResults}`);
        console.log(`   Auction links: ${links}`);

        // Try to find auction titles and prices
        const titles = $('h2, h3, .title, .auction-title').slice(0, 3);
        if (titles.length > 0) {
          console.log('   Sample titles:');
          titles.each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.length < 100) {
              console.log(`     - ${text}`);
            }
          });
        }

        // Look for price elements
        const prices = $('[class*="price"], [class*="bid"], .current-bid').slice(0, 3);
        if (prices.length > 0) {
          console.log('   Sample prices:');
          prices.each((i, el) => {
            const text = $(el).text().trim();
            if (text && text.includes('$')) {
              console.log(`     - ${text}`);
            }
          });
        }

      } else {
        console.error(`❌ Error: ${data.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.error(`❌ Request failed:`, error);
    }
  }

  // Test with a JavaScript scenario to click/navigate
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Testing with JavaScript scenario');

  const scenarioUrl = 'https://carsandbids.com';
  const jsScenario = {
    instructions: [
      { wait: 3000 },
      // Search for Porsche
      { evaluate: `
        (function() {
          // Try to find and use search functionality
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"], input[name="search"]');
          if (searchInput) {
            searchInput.value = 'porsche 911';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
            return 'Searched for porsche 911';
          }

          // Or try to navigate to search page
          const searchLink = Array.from(document.querySelectorAll('a')).find(a =>
            a.href.includes('/search') || a.textContent.includes('Search')
          );
          if (searchLink) {
            searchLink.click();
            return 'Clicked search link';
          }

          return 'No search found';
        })()
      ` },
      { wait: 3000 },
      // Extract auction data
      { evaluate: `
        (function() {
          const auctions = [];

          // Try different selectors
          const selectors = [
            '.auction-item',
            '.auction-card',
            '.past-auction',
            '[class*="auction"]',
            'a[href*="/auctions/"]'
          ];

          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              elements.forEach(el => {
                const link = el.querySelector('a[href*="/auctions/"]') || el.closest('a[href*="/auctions/"]');
                const title = el.querySelector('h2, h3, .title')?.textContent?.trim();
                const price = el.querySelector('[class*="price"], [class*="bid"]')?.textContent?.trim();

                if (link || title) {
                  auctions.push({
                    url: link ? link.href : null,
                    title: title || el.textContent?.trim().substring(0, 100),
                    price: price,
                    selector: selector
                  });
                }
              });

              if (auctions.length > 0) break;
            }
          }

          return {
            auctionCount: auctions.length,
            samples: auctions.slice(0, 5),
            pageTitle: document.title,
            url: window.location.href
          };
        })()
      ` }
    ]
  };

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      url: scenarioUrl,
      js_scenario: JSON.stringify(jsScenario),
      json_response: 'true'
    });

    console.log('🔄 Running JavaScript scenario...');
    const response = await fetch(`https://app.scrapingbee.com/api/v1?${params.toString()}`);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Scenario executed`);

      if (data.evaluate_results) {
        console.log('📊 Evaluate results:');
        data.evaluate_results.forEach((result: any, i: number) => {
          console.log(`   Step ${i + 1}:`, result);
        });
      }

      if (data.js_scenario_report) {
        console.log('📊 Scenario report:', data.js_scenario_report);
      }
    } else {
      console.error('❌ Scenario failed:', data);
    }

  } catch (error) {
    console.error('❌ Scenario error:', error);
  }
}

testCarsAndBidsURLs().catch(console.error);