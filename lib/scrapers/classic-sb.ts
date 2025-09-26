import { BaseScraper, ScrapedListing } from './base';
import { ScrapingBeeUniversal } from './sb-universal';
import * as cheerio from 'cheerio';
import { HTMLStorageService } from '../services/html-storage';

/**
 * Classic.com scraper using ScrapingBee
 */
export class ClassicScraperSB extends BaseScraper {
  private scrapingBee: ScrapingBeeUniversal;
  private htmlStorage: HTMLStorageService;
  private baseUrl = 'https://www.classic.com';

  private searchPaths = [
    // GT MODELS - HIGH PRIORITY!
    '/m/porsche/718/cayman/gt4-rs/',
    '/m/porsche/718/cayman/gt4/',
    '/m/porsche/911/992/gt3/',
    '/m/porsche/911/992/gt3-rs/',
    '/m/porsche/911/991/gt3/',
    '/m/porsche/911/991/gt3-rs/',
    '/m/porsche/911/991/gt2-rs/',
    '/m/porsche/911/997/gt3/',
    '/m/porsche/911/997/gt3-rs/',
    '/m/porsche/911/997/gt2/',
    '/m/porsche/911/997/gt2-rs/',
    // Regular sports cars
    '/m/porsche/911/',
    '/m/porsche/718/cayman/',
    '/m/porsche/718/boxster/',
    '/m/porsche/718/spyder/'
  ];

  constructor() {
    super('classic');
    this.scrapingBee = new ScrapingBeeUniversal();
    this.htmlStorage = new HTMLStorageService();
    console.log('🚀 Classic.com scraper initialized (ScrapingBee version)');
  }

  async scrapeListings(params?: {
    model?: string;
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<ScrapedListing[]> {
    const { model, maxPages = 1 } = params || {};
    const allListings: ScrapedListing[] = [];

    console.log('\n' + '█'.repeat(70));
    console.log(' '.repeat(20) + 'CLASSIC.COM SCRAPER - SCRAPINGBEE VERSION');
    console.log('█'.repeat(70));

    // Filter search paths based on model if specified
    let pathsToScrape = this.searchPaths;
    if (model) {
      pathsToScrape = this.searchPaths.filter(path =>
        path.toLowerCase().includes(model.toLowerCase())
      );
    }

    console.log(`📋 Scraping ${pathsToScrape.length} search paths`);

    for (const searchPath of pathsToScrape) {
      console.log('\n' + '═'.repeat(60));
      console.log(`📊 Scraping: ${searchPath}`);

      try {
        // Scrape each page
        for (let page = 1; page <= maxPages; page++) {
          const searchUrl = `${this.baseUrl}${searchPath}?page=${page}`;
          const result = await this.scrapingBee.scrapeClassicSearch(searchUrl, 1);

          // Store HTML
          if (result.html) {
            await this.htmlStorage.storeScrapedHTML({
              source: 'classic.com',
              url: searchUrl,
              html: result.html,
              type: 'search',
              metadata: {
                scraper: 'ClassicScraperSB',
                page
              }
            });
          }

          // Process listings
          for (const listing of result.listings) {
            const fullListing: ScrapedListing = {
              source_url: listing.url,
              url: listing.url,
              title: listing.title,
              price: listing.price,
              status: 'sold' // Classic.com shows sold prices
            };

            // Parse year from title
            const yearMatch = listing.title.match(/\b(19\d{2}|20\d{2})\b/);
            if (yearMatch) {
              fullListing.year = parseInt(yearMatch[1]);
            }

            allListings.push(fullListing);
          }

          // Rate limiting
          if (page < maxPages) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

      } catch (error) {
        console.error(`❌ Error scraping ${searchPath}:`, error);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ Found ${allListings.length} total listings`);

    return allListings;
  }
}