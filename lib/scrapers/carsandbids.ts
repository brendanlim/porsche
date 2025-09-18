import { SharedScraper, ScraperConfig } from './shared-scraper';
import * as cheerio from 'cheerio';
import { ScrapedListing } from './base';

export class CarsAndBidsScraper extends SharedScraper {
  constructor() {
    const config: ScraperConfig = {
      name: 'Cars and Bids',
      source: 'carsandbids',
      baseUrl: 'https://carsandbids.com',
      searchPaths: [
        // Focus on past auctions for sold data - broader search to start
        '/past-auctions?make=Porsche',
        '/past-auctions?make=Porsche&page=2',
        '/past-auctions?make=Porsche&page=3'
      ],
      selectors: {
        // Updated selectors for current CarsAndBids structure
        listings: '.auction-result, .auction-tile, .listing-tile, a[href*="/auctions/"]',
        title: 'h2, .auction-title, .listing-title',
        price: '.sold-for, .winning-bid, .final-price',
        vin: '.vin-number, [data-vin]',
        year: '[data-year]',
        mileage: '.mileage, .vehicle-mileage',
        location: '.location, .seller-location',
        status: '.auction-status',
        images: '.auction-image img, .listing-image img',
        description: '.auction-description'
      },
      pagination: {
        type: 'page',
        param: 'page'
      }
    };
    super(config);
  }

  // Override to focus on past auctions with sold prices
  protected buildSearchUrl(path: string, page: number): string {
    // Cars and Bids uses past-auctions endpoint for sold listings
    const baseUrl = `${this.baseUrl}${path}`;
    return page > 1 ? `${baseUrl}&page=${page}` : baseUrl;
  }

  // Override scrapeListings to add debugging and better extraction
  async scrapeListings(params?: { 
    model?: string; 
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<any[]> {
    const results: any[] = [];
    const processedUrls = new Set<string>();
    const maxPages = params?.maxPages || 3;
    
    try {
      await this.startIngestion();
      
      for (const searchPath of this.config.searchPaths.slice(0, maxPages)) {
        console.log(`Scraping CarsAndBids: ${this.baseUrl}${searchPath}`);
        
        try {
          const html = await this.fetchUrl(`${this.baseUrl}${searchPath}`, 'search');
          const $ = cheerio.load(html);
          
          // Debug: log HTML structure
          console.log(`HTML length: ${html.length}`);
          console.log(`Page title: ${$('title').text()}`);
          console.log(`Found elements with 'auction': ${$('*:contains("auction")').length}`);
          console.log(`Found elements with 'Porsche': ${$('*:contains("Porsche")').length}`);
          
          // Try multiple listing selectors
          const possibleSelectors = [
            '.auction-result',
            '.auction-tile', 
            '.listing-tile',
            'a[href*="/auctions/"]',
            '.result-item',
            '.vehicle-card',
            '[data-auction-id]'
          ];
          
          let foundListings = 0;
          for (const selector of possibleSelectors) {
            const elements = $(selector);
            if (elements.length > 0) {
              console.log(`Found ${elements.length} elements with selector: ${selector}`);
              foundListings = Math.max(foundListings, elements.length);
            }
          }
          
          if (foundListings === 0) {
            console.log('No listings found with any selector, checking for pagination or messages...');
            console.log(`Body text snippet: ${$('body').text().substring(0, 500)}`);
          }
          
        } catch (error) {
          console.error(`Failed to scrape CarsAndBids page:`, error);
        }
      }
      
      await this.completeIngestion();
      return results;
    } catch (error) {
      console.error(`CarsAndBids scraping failed:`, error);
      await this.updateIngestion({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Override scrapeDetail to handle Cars and Bids specific structure
  async scrapeDetail(url: string): Promise<ScrapedListing | null> {
    try {
      const html = await this.fetchUrl(url);
      const $ = cheerio.load(html);
      
      // Cars and Bids specific selectors
      const title = $('h1.auction-title, h1').first().text().trim();
      
      // Extract winning bid from the auction results section
      const priceText = $('.winning-bid-amount, .sold-for, .final-bid').first().text().trim() ||
                       $('*:contains("Winning Bid")').parent().find('.amount').text().trim();
      const price = this.extractPrice(priceText);
      
      // VIN might be in the details section
      const vin = $('.vin-number, [data-vin]').first().text().trim() || 
                  $('*:contains("VIN:")').next().text().trim() || null;
      
      const year = this.extractYear(title);
      
      // Mileage from details
      const mileageText = $('.mileage, *:contains("Mileage:")').parent().text().trim();
      const mileage = this.extractMileage(mileageText);
      
      // Location from seller info
      const locationText = $('.seller-location, *:contains("Location:")').parent().text().trim();
      // Parse location into city/state
      const locationParts = locationText.split(',').map(s => s.trim());
      const location = locationText ? {
        city: locationParts[0],
        state: locationParts[1],
        zip: undefined
      } : undefined;
      
      // All Cars and Bids past auctions are sold
      const status = 'Sold';
      
      // Extract images from gallery
      const images: string[] = [];
      $('.photo-gallery img, .auction-photos img, .gallery-image').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !src.includes('placeholder')) {
          images.push(src);
        }
      });
      
      const description = $('.listing-description, .auction-description').first().text().trim();
      
      return {
        url,
        source_url: url, // Add source_url field
        title,
        price,
        vin,
        year,
        mileage,
        location: location as any,
        status,
        images: images.slice(0, 10),
        source: this.source,
        seller_type: 'private', // Cars and Bids is mostly enthusiast sellers
        scraped_at: new Date()
      };
    } catch (error) {
      console.error(`Error scraping Cars and Bids detail:`, error);
      return null;
    }
  }
}