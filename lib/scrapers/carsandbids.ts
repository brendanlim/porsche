import { SharedScraper, ScraperConfig } from './shared-scraper';
import * as cheerio from 'cheerio';
import { ScrapedListing } from './base';

/**
 * Cars and Bids scraper based on insights from the Python implementation
 * Uses the correct selectors and endpoints that actually work on the site
 */
export class CarsAndBidsScraper extends SharedScraper {
  constructor() {
    const config: ScraperConfig = {
      name: 'Cars and Bids',
      source: 'carsandbids',
      baseUrl: 'https://carsandbids.com',
      searchPaths: [
        // Use search endpoint like the Python scraper does
        '/search/porsche',
        '/search/porsche?page=2',
        '/search/porsche?page=3',
        // Also try the past auctions endpoint for sold cars
        '/past-auctions?q=porsche',
        '/past-auctions?q=porsche&page=2'
      ],
      selectors: {
        // Based on Python scraper selectors
        listings: 'li.auction-item, .auction-item, .results-item',
        title: '.auction-title h1, .auction-title, h3.auction-title',
        price: '.current-bid .bid-value, .winning-bid, .sold-for, .final-bid',
        vin: '.quick-facts dd:contains("VIN") + dd, [data-vin]',
        year: '.quick-facts dd:contains("Year") + dd, [data-year]',
        mileage: '.quick-facts dd:contains("Mileage") + dd, .mileage',
        location: '.auction-loc, .seller-location, .location',
        status: '.auction-status, .status',
        images: 'div[class*="gall-ext"] > img, div[class*="gall-int"] > img, .gallery img',
        description: '.vehicle-description, .description'
      },
      pagination: {
        type: 'page',
        param: 'page'
      }
    };
    super(config);
  }

  /**
   * Override scrapeListings to handle Cars and Bids specific structure
   */
  async scrapeListings(params?: {
    model?: string;
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<ScrapedListing[]> {
    const results: ScrapedListing[] = [];
    const processedUrls = new Set<string>();
    const maxPages = params?.maxPages || 3;

    try {
      await this.startIngestion();

      // Try both search and past-auctions endpoints
      const searchPaths = [
        `/search/porsche${params?.model ? '+' + params.model.toLowerCase() : ''}`,
        `/past-auctions?q=porsche${params?.model ? '+' + params.model.toLowerCase() : ''}`
      ];

      for (const basePath of searchPaths) {
        for (let page = 1; page <= maxPages; page++) {
          const searchUrl = page > 1 ? `${basePath}&page=${page}` : basePath;
          console.log(`Scraping CarsAndBids: ${this.baseUrl}${searchUrl}`);

          try {
            const html = await this.fetchUrl(`${this.baseUrl}${searchUrl}`, 'search');
            const $ = cheerio.load(html);

            // Look for auction items using Python scraper's selector
            const listings = $('li.auction-item, .auction-item');
            console.log(`Found ${listings.length} listings on page ${page}`);

            if (listings.length === 0) {
              // Try alternative selectors
              const altListings = $('.results-item, .search-result, a[href*="/auctions/"]');
              console.log(`Alternative selectors found ${altListings.length} items`);

              altListings.each((_, element) => {
                const listing = this.parseListingElement($, element);
                if (listing && !processedUrls.has(listing.url)) {
                  results.push(listing);
                  processedUrls.add(listing.url);
                }
              });
            } else {
              listings.each((_, element) => {
                const listing = this.parseListingElement($, element);
                if (listing && !processedUrls.has(listing.url)) {
                  results.push(listing);
                  processedUrls.add(listing.url);
                }
              });
            }

            // Rate limiting
            if (page < maxPages) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

          } catch (error) {
            console.error(`Failed to scrape page ${page}:`, error);
          }
        }
      }

      // For each listing, fetch additional details if needed
      const detailedResults = [];
      for (const listing of results.slice(0, 20)) { // Limit to 20 for performance
        try {
          const details = await this.scrapeDetail(listing.url);
          if (details) {
            detailedResults.push({
              ...listing,
              ...details
            });
          } else {
            detailedResults.push(listing);
          }
        } catch (error) {
          console.error(`Failed to get details for ${listing.url}:`, error);
          detailedResults.push(listing);
        }
      }

      await this.completeIngestion();
      return detailedResults;
    } catch (error) {
      console.error(`CarsAndBids scraping failed:`, error);
      await this.updateIngestion({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Parse a listing element from search results
   */
  private parseListingElement($: cheerio.CheerioAPI, element: any): ScrapedListing | null {
    try {
      const $el = $(element);

      // Extract title - based on Python scraper
      const title = $el.find('.auction-title').text().trim() ||
                   $el.find('h3').text().trim() ||
                   $el.find('a').first().text().trim();

      if (!title || !title.toLowerCase().includes('porsche')) {
        return null;
      }

      // Extract URL
      const relativeUrl = $el.find('a').attr('href') || $el.attr('href');
      if (!relativeUrl) return null;
      const url = relativeUrl.startsWith('http') ? relativeUrl : `${this.baseUrl}${relativeUrl}`;

      // Extract subtitle for additional info
      const subtitle = $el.find('.auction-subtitle').text().trim();

      // Extract location
      const locationText = $el.find('.auction-loc').text().trim();
      const locationParts = locationText.split(',').map(s => s.trim());
      const location = locationText ? {
        city: locationParts[0],
        state: locationParts[1],
        zip: undefined
      } : undefined;

      // Extract thumbnail
      const thumbnail = $el.find('img').attr('src');

      // Extract year from title
      const yearMatch = title.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? parseInt(yearMatch[0]) : undefined;

      // Extract model and trim from title
      const { model, trim } = this.parseModelAndTrim(title);

      return {
        title,
        url,
        year,
        make: 'Porsche',
        model,
        trim,
        location,
        images: thumbnail ? [thumbnail] : [],
        source: 'carsandbids',
        scraped_at: new Date().toISOString(),
        // Price will be extracted in detail scraping
        price: 0,
        status: 'Unknown'
      };
    } catch (error) {
      console.error('Error parsing listing element:', error);
      return null;
    }
  }

  /**
   * Scrape detailed information from a product page
   */
  async scrapeDetail(url: string): Promise<Partial<ScrapedListing> | null> {
    try {
      const html = await this.fetchUrl(url, 'detail');
      const $ = cheerio.load(html);

      // Extract title from h1 like Python scraper
      const title = $('div.auction-title > h1').text().trim() ||
                   $('h1').first().text().trim();

      // Extract quick facts (Python scraper approach)
      const quickFacts: Record<string, string> = {};
      $('.quick-facts dt').each((_, element) => {
        const key = $(element).text().trim();
        const value = $(element).next('dd').text().trim();
        if (key && value) {
          quickFacts[key.toLowerCase()] = value;
        }
      });

      // Extract current bid from specific selector
      const bidValueText = $('.current-bid .bid-value').text().trim() ||
                          $('.winning-bid').text().trim() ||
                          $('.sold-for').text().trim();
      const price = this.extractPrice(bidValueText);

      // Extract VIN from quick facts or other locations
      const vin = quickFacts['vin'] ||
                 $('[data-vin]').attr('data-vin') ||
                 null;

      // Extract mileage
      const mileageText = quickFacts['mileage'] ||
                         $('.mileage').text().trim();
      const mileage = this.extractMileage(mileageText);

      // Extract images (Python scraper approach)
      const exteriorImages = $('div[class*="gall-ext"] > img').map((_, el) => $(el).attr('src')).get();
      const interiorImages = $('div[class*="gall-int"] > img').map((_, el) => $(el).attr('src')).get();
      const allImages = [...exteriorImages, ...interiorImages].filter(Boolean);

      // Extract bid history to determine if sold
      const bidHistory = $('.comments dl.placed-bid').map((_, el) => $(el).text().trim()).get();
      const hasBids = bidHistory.length > 0;

      // Extract seller info
      const sellerUsername = $('.stats li.seller .username a').text().trim();
      const sellerLocation = $('.seller-location').text().trim();

      // Determine status
      const status = price > 0 ? 'Sold' : (hasBids ? 'Active' : 'No Bids');

      // Extract color from quick facts
      const exteriorColor = quickFacts['exterior color'] || quickFacts['color'];
      const interiorColor = quickFacts['interior color'];

      // Extract transmission
      const transmission = quickFacts['transmission'];

      // Extract engine
      const engine = quickFacts['engine'];

      return {
        title,
        price,
        vin,
        mileage,
        images: allImages,
        status,
        exterior_color: exteriorColor,
        interior_color: interiorColor,
        transmission,
        engine,
        seller_location: sellerLocation,
        // Set sold_date if the car was sold
        sold_date: status === 'Sold' ? new Date().toISOString().split('T')[0] : undefined
      };
    } catch (error) {
      console.error(`Error scraping detail page ${url}:`, error);
      return null;
    }
  }

  /**
   * Parse model and trim from title
   */
  private parseModelAndTrim(title: string): { model: string; trim?: string } {
    const titleLower = title.toLowerCase();

    // Model detection
    let model = 'Unknown';
    if (titleLower.includes('911')) model = '911';
    else if (titleLower.includes('718') || titleLower.includes('cayman')) model = '718 Cayman';
    else if (titleLower.includes('boxster')) model = '718 Boxster';
    else if (titleLower.includes('cayenne')) model = 'Cayenne';
    else if (titleLower.includes('macan')) model = 'Macan';
    else if (titleLower.includes('panamera')) model = 'Panamera';
    else if (titleLower.includes('taycan')) model = 'Taycan';

    // Trim detection
    let trim = undefined;
    if (titleLower.includes('gt4 rs')) trim = 'GT4 RS';
    else if (titleLower.includes('gt4')) trim = 'GT4';
    else if (titleLower.includes('gt3 rs')) trim = 'GT3 RS';
    else if (titleLower.includes('gt3')) trim = 'GT3';
    else if (titleLower.includes('gt2 rs')) trim = 'GT2 RS';
    else if (titleLower.includes('gt2')) trim = 'GT2';
    else if (titleLower.includes('turbo s')) trim = 'Turbo S';
    else if (titleLower.includes('turbo')) trim = 'Turbo';
    else if (titleLower.includes('gts')) trim = 'GTS';
    else if (titleLower.includes('carrera 4s')) trim = 'Carrera 4S';
    else if (titleLower.includes('carrera s')) trim = 'Carrera S';
    else if (titleLower.includes('carrera')) trim = 'Carrera';
    else if (titleLower.includes('targa')) trim = 'Targa';
    else if (titleLower.includes('spyder')) trim = 'Spyder';
    else if (titleLower.includes(' s ') || titleLower.endsWith(' s')) trim = 'S';
    else trim = 'Base';

    return { model, trim };
  }
}