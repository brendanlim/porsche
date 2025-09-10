#!/usr/bin/env node

/**
 * Test and develop scrapers using stored HTML
 * Golden rule: Storage is cheap, scraping is not!
 * Use this to refine selectors without re-scraping
 */

import dotenv from 'dotenv';
import path from 'path';
import * as cheerio from 'cheerio';

// Load environment variables FIRST before any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Now create Supabase client after env vars are loaded
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface TestConfig {
  source: string;
  type: 'search' | 'detail';
  selectors: {
    listings?: string;
    title?: string;
    price?: string;
    vin?: string;
    year?: string;
    mileage?: string;
    location?: string;
    status?: string;
    images?: string;
    description?: string;
  };
}

class HTMLTester {
  constructor() {
    // No HTMLStorageService needed for testing
  }

  /**
   * Get recent stored HTML files from a source
   */
  async getStoredHTML(source: string, type: 'search' | 'detail', limit: number = 5) {
    const { data, error } = await supabaseAdmin
      .from('raw_html_cache')
      .select('*')
      .eq('source', source)
      .like('storage_path', `%/${type}/%`)
      .order('scraped_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching cached HTML:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Download and test HTML with selectors
   */
  async testSelectors(config: TestConfig) {
    console.log(`\n📊 Testing ${config.source} selectors on stored HTML...`);
    console.log('========================================');

    // Get stored HTML files
    const cachedFiles = await this.getStoredHTML(config.source, config.type);
    
    if (cachedFiles.length === 0) {
      console.log(`❌ No stored HTML found for ${config.source} (${config.type})`);
      console.log('💡 Run a scraper first to store some HTML');
      return;
    }

    console.log(`Found ${cachedFiles.length} stored HTML files\n`);

    // Test each file
    for (const cached of cachedFiles) {
      console.log(`\n📄 Testing: ${cached.url}`);
      console.log(`   Stored: ${cached.scraped_at}`);
      console.log(`   Path: ${cached.storage_path}`);
      console.log('----------------------------------------');

      try {
        // Download HTML from storage
        const { data, error } = await supabaseAdmin.storage
          .from('raw-html')
          .download(cached.storage_path);

        if (error) {
          console.error('❌ Error downloading:', error);
          continue;
        }

        const html = await data.text();
        const $ = cheerio.load(html);

        // Test search page selectors
        if (config.type === 'search' && config.selectors.listings) {
          const listings = $(config.selectors.listings).toArray();
          console.log(`\n🔍 Listings found: ${listings.length}`);
          
          if (listings.length > 0) {
            console.log('\nFirst 3 listings:');
            listings.slice(0, 3).forEach((el, i) => {
              const $el = $(el);
              const href = $el.attr('href') || $el.find('a').first().attr('href');
              const text = $el.text().trim().substring(0, 100);
              console.log(`  ${i + 1}. ${href || 'No href'}`);
              console.log(`     ${text}...`);
            });
          }
        }

        // Test detail page selectors
        if (config.type === 'detail') {
          const results: any = {};

          Object.entries(config.selectors).forEach(([key, selector]) => {
            if (selector) {
              const element = $(selector).first();
              const value = element.text().trim() || element.attr('content') || element.attr('value');
              results[key] = value?.substring(0, 100);
            }
          });

          console.log('\n📋 Extracted data:');
          Object.entries(results).forEach(([key, value]) => {
            console.log(`  ${key}: ${value || '❌ Not found'}`);
          });

          // Special handling for images
          if (config.selectors.images) {
            const images = $(config.selectors.images).toArray();
            console.log(`\n🖼️  Images found: ${images.length}`);
            if (images.length > 0) {
              const firstImg = $(images[0]).attr('src') || $(images[0]).attr('data-src');
              console.log(`  First image: ${firstImg}`);
            }
          }
        }

      } catch (error) {
        console.error('❌ Error processing HTML:', error);
      }
    }
  }

  /**
   * Interactive selector finder
   */
  async findSelectors(source: string, type: 'search' | 'detail') {
    console.log(`\n🔍 Finding selectors for ${source} (${type})...`);
    
    const cachedFiles = await this.getStoredHTML(source, type, 1);
    if (cachedFiles.length === 0) {
      console.log('❌ No stored HTML found');
      return;
    }

    const cached = cachedFiles[0];
    const { data } = await supabaseAdmin.storage
      .from('raw-html')
      .download(cached.storage_path);

    if (!data) {
      console.log('❌ Could not download HTML');
      return;
    }

    const html = await data.text();
    const $ = cheerio.load(html);

    console.log('\n📊 Common patterns found:');
    
    // Find common class patterns
    const classMap = new Map<string, number>();
    $('[class]').each((_, el) => {
      const classes = $(el).attr('class')?.split(' ') || [];
      classes.forEach(cls => {
        if (cls && cls.length > 2) {
          classMap.set(cls, (classMap.get(cls) || 0) + 1);
        }
      });
    });

    // Find patterns that might be listings
    const potentialListings = Array.from(classMap.entries())
      .filter(([cls, count]) => {
        const lowerCls = cls.toLowerCase();
        return count > 3 && count < 100 && (
          lowerCls.includes('card') ||
          lowerCls.includes('listing') ||
          lowerCls.includes('item') ||
          lowerCls.includes('result') ||
          lowerCls.includes('vehicle') ||
          lowerCls.includes('car')
        );
      })
      .sort((a, b) => b[1] - a[1]);

    console.log('\nPotential listing selectors:');
    potentialListings.slice(0, 10).forEach(([cls, count]) => {
      console.log(`  .${cls} (${count} occurrences)`);
    });

    // Find data attributes
    const dataAttrs = new Set<string>();
    $('[data-qa], [data-test], [data-cy], [data-id]').each((_, el) => {
      Object.keys(el.attribs).forEach(attr => {
        if (attr.startsWith('data-')) {
          dataAttrs.add(attr);
        }
      });
    });

    if (dataAttrs.size > 0) {
      console.log('\nData attributes found:');
      Array.from(dataAttrs).slice(0, 10).forEach(attr => {
        console.log(`  [${attr}]`);
      });
    }

    // Find price patterns
    const pricePatterns = $('*:contains("$")').toArray()
      .filter(el => {
        const text = $(el).text();
        return text.match(/\$[\d,]+/) && text.length < 50;
      })
      .slice(0, 5);

    if (pricePatterns.length > 0) {
      console.log('\nPotential price selectors:');
      pricePatterns.forEach(el => {
        const $el = $(el);
        const classes = $el.attr('class');
        const tag = (el as any).tagName || el.type || 'unknown';
        console.log(`  ${tag}${classes ? `.${classes.split(' ').join('.')}` : ''} -> "${$el.text().trim()}"`);
      });
    }
  }
}

// Configuration for each scraper
const scraperConfigs: Record<string, TestConfig> = {
  classic: {
    source: 'classic',
    type: 'search',
    selectors: {
      listings: 'div[data-qa="search-result-item"], article.listing-item, .result-item',
      title: 'h2.vehicle-title, h3.listing-title',
      price: 'span.price-value, div.vehicle-price',
      year: '.vehicle-year',
      mileage: '.vehicle-mileage',
      location: '.vehicle-location'
    }
  },
  edmunds: {
    source: 'edmunds',
    type: 'search',
    selectors: {
      listings: '.inventory-listing, .vehicle-card, .search-result',
      title: '.vehicle-title, .listing-title',
      price: '.price, .vehicle-price',
      mileage: '.mileage, .vehicle-mileage',
      location: '.location, .dealer-location'
    }
  },
  cargurus: {
    source: 'cargurus',
    type: 'search',
    selectors: {
      listings: '.listing-card, .car-listing, .result-item',
      title: '.listing-title, .car-title',
      price: '.price, .listing-price',
      mileage: '.mileage, .car-mileage',
      location: '.location, .dealer-location'
    }
  },
  autotrader: {
    source: 'autotrader',
    type: 'search',
    selectors: {
      listings: '.inventory-listing, .listing-card, .vehicle-card',
      title: '.vehicle-title, .listing-title',
      price: '.price, .vehicle-price',
      mileage: '.mileage, .vehicle-mileage',
      location: '.location, .dealer-location'
    }
  },
  carsandbids: {
    source: 'carsandbids',
    type: 'search',
    selectors: {
      listings: '.auction-card, .listing-card, .auction-item',
      title: '.auction-title, .listing-title',
      price: '.winning-bid, .sold-price, .final-bid',
      mileage: '.mileage, .auction-mileage',
      location: '.location, .seller-location'
    }
  }
};

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const source = args[1];
  const type = (args[2] || 'search') as 'search' | 'detail';

  const tester = new HTMLTester();

  if (command === 'test' && source) {
    // Test specific scraper
    const config = scraperConfigs[source];
    if (config) {
      config.type = type;
      await tester.testSelectors(config);
    } else {
      console.log(`❌ Unknown source: ${source}`);
      console.log('Available sources:', Object.keys(scraperConfigs).join(', '));
    }
  } else if (command === 'find' && source) {
    // Find selectors for a source
    await tester.findSelectors(source, type);
  } else if (command === 'list') {
    // List stored HTML
    const cached = await tester.getStoredHTML(source || '', type, 20);
    console.log(`\n📦 Stored HTML files${source ? ` for ${source}` : ''}:`);
    cached.forEach(item => {
      console.log(`  ${item.source} | ${item.storage_path}`);
      console.log(`    URL: ${item.url}`);
      console.log(`    Scraped: ${item.scraped_at}`);
      console.log('');
    });
  } else {
    console.log(`
📊 HTML Testing Tool - Work with stored HTML to refine selectors

Usage:
  npm run test:html test <source> [type]     Test selectors on stored HTML
  npm run test:html find <source> [type]     Find potential selectors
  npm run test:html list [source] [type]     List stored HTML files

Sources: ${Object.keys(scraperConfigs).join(', ')}
Types: search, detail

Examples:
  npm run test:html test classic search      Test Classic.com search selectors
  npm run test:html find edmunds detail      Find selectors in Edmunds detail page
  npm run test:html list                     List all stored HTML
    `);
  }
}

main().catch(console.error);