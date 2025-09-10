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
        // GT models - HIGH PRIORITY for Cars and Bids
        '/past-auctions?make=Porsche&keyword=GT3',
        '/past-auctions?make=Porsche&keyword=GT3%20RS',
        '/past-auctions?make=Porsche&keyword=GT2',
        '/past-auctions?make=Porsche&keyword=GT4',
        // Regular sports cars
        '/past-auctions?make=Porsche&model=911',
        '/past-auctions?make=Porsche&model=718%20Cayman',
        '/past-auctions?make=Porsche&model=718%20Boxster',
        '/past-auctions?make=Porsche&model=718%20Spyder'
      ],
      selectors: {
        listings: '.auction-card, .listing-card, a[href*="/auctions/"]',
        title: 'h1, .auction-title, .listing-title',
        price: '.winning-bid, .sold-price, .final-bid',
        vin: '.vin, [data-vin]',
        year: '.year, [data-year]',
        mileage: '.mileage, .auction-mileage',
        location: '.location, .seller-location',
        status: '.status, .auction-status',
        images: '.gallery img, .auction-images img',
        description: '.description, .auction-description'
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
        description,
        scraped_at: new Date()
      };
    } catch (error) {
      console.error(`Error scraping Cars and Bids detail:`, error);
      return null;
    }
  }
}