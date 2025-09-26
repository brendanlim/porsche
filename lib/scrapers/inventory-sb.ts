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