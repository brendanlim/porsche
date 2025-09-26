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

  async scrapeDetail(url: string): Promise<ScrapedListing> {
    console.log(`🔍 Scraping detail page: ${url}`);

    try {
      // Fetch the page
      const result = await this.scrapingBee.scrapeJSPage(url);

      if (!result.html) {
        throw new Error('Failed to fetch detail page HTML');
      }

      // Store the HTML
      await this.htmlStorage.storeScrapedHTML({
        source: 'classic',
        url: url,
        html: result.html,
        type: 'detail'
      });

      // Parse with cheerio
      const $ = cheerio.load(result.html);

      // Extract basic information
      const title = $('h1').first().text().trim() ||
                   $('.listing-title').first().text().trim();

      // Extract price (sold price if available, otherwise listing price)
      let price = 0;
      const priceText = $('.price').first().text() ||
                       $('.sold-price').first().text() ||
                       $('*:contains("$")').filter((_, el) => {
                         const text = $(el).text();
                         return text.match(/\$[\d,]+/) && !text.includes('Estimate');
                       }).first().text();

      const priceMatch = priceText.match(/\$?([\d,]+)/);
      if (priceMatch) {
        price = parseInt(priceMatch[1].replace(/,/g, ''));
      }

      // Extract VIN
      let vin: string | undefined;
      $('*:contains("VIN")').each((_, el) => {
        const text = $(el).text();
        const vinMatch = text.match(/\b[A-Z0-9]{17}\b/);
        if (vinMatch) {
          vin = vinMatch[0];
          return false;
        }
      });

      // Extract mileage
      let mileage: number | undefined;
      const mileageText = $('*:contains("miles")').filter((_, el) => {
        const text = $(el).text();
        return !!text.match(/[\d,]+\s*miles?/i);
      }).first().text();

      const mileageMatch = mileageText.match(/([\d,]+)\s*miles?/i);
      if (mileageMatch) {
        mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
      }

      // Extract year from title
      const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

      // Parse model and trim from title
      const titleLower = title.toLowerCase();
      let model: string | undefined;
      let trim: string | undefined;

      // Model detection
      if (titleLower.includes('911')) model = '911';
      else if (titleLower.includes('718') || titleLower.includes('cayman')) model = '718-cayman';
      else if (titleLower.includes('boxster')) model = '718-boxster';

      // Trim detection
      if (titleLower.includes('gt4 rs')) trim = 'gt4-rs';
      else if (titleLower.includes('gt4')) trim = 'gt4';
      else if (titleLower.includes('gt3 rs')) trim = 'gt3-rs';
      else if (titleLower.includes('gt3')) trim = 'gt3';
      else if (titleLower.includes('gt2 rs')) trim = 'gt2-rs';
      else if (titleLower.includes('gt2')) trim = 'gt2';
      else if (titleLower.includes('turbo s')) trim = 'turbo-s';
      else if (titleLower.includes('turbo')) trim = 'turbo';

      const listing: ScrapedListing = {
        source_url: url,
        url: url,
        title,
        price,
        vin,
        mileage,
        year,
        model,
        trim,
        status: 'sold'  // Classic.com typically shows sold listings
      };

      return listing;

    } catch (error) {
      console.error('❌ Error scraping detail page:', error);
      throw error;
    }
  }
}