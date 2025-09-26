import { BaseScraper, ScrapedListing } from './base';
import { ScrapingBeeUniversal } from './sb-universal';
import * as cheerio from 'cheerio';
import { HTMLStorageService } from '../services/html-storage';

/**
 * Combined inventory scraper for Cars.com, Edmunds, and AutoTrader using ScrapingBee
 */
export class InventoryScraperSB extends BaseScraper {
  private scrapingBee: ScrapingBeeUniversal;
  private htmlStorage: HTMLStorageService;

  constructor(private site: 'cars' | 'edmunds' | 'autotrader') {
    super(site);
    this.scrapingBee = new ScrapingBeeUniversal();
    this.htmlStorage = new HTMLStorageService();
    console.log(`🚀 ${site} scraper initialized (ScrapingBee version)`);
  }

  private buildSearchUrl(model?: string): string {
    const searchModel = model || '911';

    switch (this.site) {
      case 'cars':
        return `https://www.cars.com/shopping/results/?makes[]=porsche&models[]=${searchModel}&page_size=100&sort=price-lowest`;

      case 'edmunds':
        return `https://www.edmunds.com/inventory/srp.html?make=porsche&model=${searchModel}`;

      case 'autotrader':
        return `https://www.autotrader.com/cars-for-sale/porsche/${searchModel}`;

      default:
        throw new Error(`Unknown site: ${this.site}`);
    }
  }

  async scrapeListings(params?: {
    model?: string;
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<ScrapedListing[]> {
    const { model, maxPages = 1 } = params || {};
    const allListings: ScrapedListing[] = [];

    console.log('\n' + '█'.repeat(70));
    console.log(' '.repeat(20) + `${this.site.toUpperCase()} SCRAPER - SCRAPINGBEE VERSION`);
    console.log('█'.repeat(70));

    const searchUrl = this.buildSearchUrl(model);
    console.log(`📊 Scraping: ${searchUrl}`);

    try {
      let result;

      switch (this.site) {
        case 'cars':
          result = await this.scrapingBee.scrapeCars(searchUrl);
          break;

        case 'edmunds':
          result = await this.scrapingBee.scrapeEdmunds(searchUrl);
          break;

        case 'autotrader':
          result = await this.scrapingBee.scrapeAutoTrader(searchUrl);
          break;

        default:
          throw new Error(`Unknown site: ${this.site}`);
      }

      // Store HTML
      if (result.html) {
        await this.htmlStorage.storeScrapedHTML({
          source: this.site,
          url: searchUrl,
          html: result.html,
          type: 'search',
          metadata: {
            scraper: 'InventoryScraperSB',
            model
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
          status: listing.status || 'active',
          mileage: listing.mileage
        };

        // Parse year from title
        const yearMatch = listing.title.match(/\b(19\d{2}|20\d{2})\b/);
        if (yearMatch) {
          fullListing.year = parseInt(yearMatch[1]);
        }

        // Parse model from title
        if (listing.title.toLowerCase().includes('911')) {
          fullListing.model = '911';
        } else if (listing.title.toLowerCase().includes('cayman')) {
          fullListing.model = '718 Cayman';
        } else if (listing.title.toLowerCase().includes('boxster')) {
          fullListing.model = '718 Boxster';
        } else if (listing.title.toLowerCase().includes('taycan')) {
          fullListing.model = 'Taycan';
        } else if (listing.title.toLowerCase().includes('panamera')) {
          fullListing.model = 'Panamera';
        } else if (listing.title.toLowerCase().includes('cayenne')) {
          fullListing.model = 'Cayenne';
        } else if (listing.title.toLowerCase().includes('macan')) {
          fullListing.model = 'Macan';
        }

        allListings.push(fullListing);
      }

      // Handle pagination
      if (maxPages > 1 && this.site === 'cars') {
        for (let page = 2; page <= maxPages; page++) {
          console.log(`📄 Fetching page ${page}...`);

          const pageUrl = `${searchUrl}&page=${page}`;
          const pageResult = await this.scrapingBee.scrapeCars(pageUrl);

          if (pageResult.listings.length === 0) {
            console.log('  No more listings found');
            break;
          }

          // Store HTML for this page
          if (pageResult.html) {
            await this.htmlStorage.storeScrapedHTML({
              source: this.site,
              url: pageUrl,
              html: pageResult.html,
              type: 'search',
              metadata: {
                scraper: 'InventoryScraperSB',
                model,
                page
              }
            });
          }

          // Process listings from this page
          for (const listing of pageResult.listings) {
            const fullListing: ScrapedListing = {
              source_url: listing.url,
              url: listing.url,
              title: listing.title,
              price: listing.price,
              status: 'active',
              mileage: listing.mileage
            };

            // Parse year from title
            const yearMatch = listing.title.match(/\b(19\d{2}|20\d{2})\b/);
            if (yearMatch) {
              fullListing.year = parseInt(yearMatch[1]);
            }

            allListings.push(fullListing);
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

    } catch (error) {
      console.error(`❌ Error scraping ${this.site}:`, error);
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ Found ${allListings.length} total listings`);

    return allListings;
  }

  async scrapeDetail(url: string): Promise<ScrapedListing> {
    console.log(`🔍 Scraping detail page: ${url}`);

    try {
      // Fetch the page using ScrapingBee
      const result = await this.scrapingBee.scrapeJSPage(url);

      if (!result.html) {
        throw new Error('Failed to fetch detail page HTML');
      }

      // Store the HTML
      await this.htmlStorage.storeScrapedHTML({
        source: this.source,
        url: url,
        html: result.html,
        type: 'detail'
      });

      // Parse with cheerio
      const $ = cheerio.load(result.html);

      // Extract basic information
      const title = $('h1').first().text().trim() ||
                   $('.vehicle-title').first().text().trim() ||
                   $('title').text().trim();

      // Extract price
      let price = 0;
      const priceText = $('.price').first().text() ||
                       $('*:contains("$")').filter((_, el) => {
                         const text = $(el).text();
                         return text.match(/\$[\d,]+/) && !text.includes('MSRP');
                       }).first().text();

      const priceMatch = priceText.match(/\$?([\d,]+)/);
      if (priceMatch) {
        price = parseInt(priceMatch[1].replace(/,/g, ''));
      }

      // Extract VIN
      let vin: string | undefined;
      $('*').each((_, el) => {
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

      // Extract year from title or page
      const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/) ||
                       $.text().match(/\b(19\d{2}|20\d{2})\s+Porsche/);
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
      else if (titleLower.includes('turbo s')) trim = 'turbo-s';
      else if (titleLower.includes('turbo')) trim = 'turbo';
      else if (titleLower.includes('gts')) trim = 'gts';

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
        status: 'active'  // Inventory sites show active listings
      };

      return listing;

    } catch (error) {
      console.error('❌ Error scraping detail page:', error);
      throw error;
    }
  }
}

// Export convenience classes
export class CarsScraperSB extends InventoryScraperSB {
  constructor() {
    super('cars');
  }
}

export class EdmundsScraperSB extends InventoryScraperSB {
  constructor() {
    super('edmunds');
  }
}

export class AutoTraderScraperSB extends InventoryScraperSB {
  constructor() {
    super('autotrader');
  }
}