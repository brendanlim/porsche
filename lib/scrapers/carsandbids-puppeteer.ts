import { BaseScraper, ScraperResult, ScrapedListing } from './base';
import puppeteer from 'puppeteer-core';
import * as cheerio from 'cheerio';
// import { HTMLStorageService } from '../services/html-storage';

/**
 * Cars and Bids scraper using Puppeteer for JavaScript rendering
 * Based on the proven selectors from Python scraper and our research
 */
export class CarsAndBidsPuppeteerScraper extends BaseScraper {
  private browserWSEndpoint: string;
  // private htmlStorage: HTMLStorageService;
  private baseUrl = 'https://carsandbids.com';

  constructor() {
    super('carsandbids');

    // Set up Bright Data browser connection
    const customerId = process.env.BRIGHT_DATA_CUSTOMER_ID || 'hl_cd9a1035';
    const password = process.env.BRIGHT_DATA_BROWSER_PASSWORD || 'y2w8rf96p2na';
    const zone = 'pt_scraping_browser_z1';

    // WebSocket endpoint for Bright Data's browser API
    this.browserWSEndpoint = `wss://brd-customer-${customerId}-zone-${zone}:${password}@brd.superproxy.io:9222`;
    // this.htmlStorage = new HTMLStorageService();
  }

  async scrapeListings(params?: {
    model?: string;
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<ScrapedListing[]> {
    const results: ScrapedListing[] = [];
    const processedUrls = new Set<string>();
    const maxPages = params?.maxPages || 1;

    try {
      await this.startIngestion();

      // Build search query
      const searchQuery = params?.model ?
        `porsche ${params.model.toLowerCase()}`.replace(/\s+/g, '%20') :
        'porsche';

      // Search endpoints to try
      const searchUrls = [
        `${this.baseUrl}/search/${searchQuery}`,
      ];

      // Add past auctions for sold cars
      if (params?.onlySold !== false) {
        searchUrls.push(`${this.baseUrl}/past-auctions?q=${searchQuery}`);
      }

      for (const searchUrl of searchUrls) {
        console.log(`\nFetching Cars and Bids: ${searchUrl}`);

        try {
          // Use Puppeteer to fetch the page with JavaScript rendering
          const html = await this.fetchWithPuppeteer(searchUrl);

          // Store the HTML (commented out for now)
          // await this.htmlStorage.storeHTML(
          //   searchUrl,
          //   html,
          //   'carsandbids',
          //   'search'
          // );

          // Parse listings from HTML
          const listings = this.parseSearchResults(html, params?.onlySold);
          console.log(`Found ${listings.length} listings`);

          // Add unique listings to results
          for (const listing of listings) {
            if (!processedUrls.has(listing.url)) {
              // Fetch detailed information for each listing
              if (listing.url && listing.status === 'Sold') {
                try {
                  const details = await this.scrapeDetail(listing.url);
                  if (details) {
                    results.push({ ...listing, ...details });
                  } else {
                    results.push(listing);
                  }
                } catch (error) {
                  console.error(`Failed to get details for ${listing.url}:`, error);
                  results.push(listing);
                }
              } else {
                results.push(listing);
              }
              processedUrls.add(listing.url);

              // Limit results for testing
              if (results.length >= 20) break;
            }
          }

          // Handle pagination if needed
          if (maxPages > 1 && !searchUrl.includes('past-auctions')) {
            for (let page = 2; page <= maxPages; page++) {
              const pagedUrl = `${searchUrl}${searchUrl.includes('?') ? '&' : '?'}page=${page}`;
              console.log(`\nFetching page ${page}: ${pagedUrl}`);

              try {
                const pageHtml = await this.fetchWithPuppeteer(pagedUrl);

                const pageListings = this.parseSearchResults(pageHtml, params?.onlySold);
                console.log(`Found ${pageListings.length} listings on page ${page}`);

                for (const listing of pageListings) {
                  if (!processedUrls.has(listing.url)) {
                    results.push(listing);
                    processedUrls.add(listing.url);
                    if (results.length >= 20) break;
                  }
                }

                if (pageListings.length === 0) break;
              } catch (error) {
                console.error(`Failed to fetch page ${page}:`, error);
                break;
              }
            }
          }

        } catch (error) {
          console.error(`Failed to fetch ${searchUrl}:`, error);
        }
      }

      await this.completeIngestion();
      console.log(`\nTotal Cars and Bids listings scraped: ${results.length}`);
      return results;

    } catch (error) {
      console.error('Cars and Bids scraping failed:', error);
      await this.updateIngestion({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Parse search results using proven selectors from Python scraper
   */
  private parseSearchResults(html: string, onlySold?: boolean): ScrapedListing[] {
    const $ = cheerio.load(html);
    const listings: ScrapedListing[] = [];

    // Use the exact selectors - li.auction-item is the container
    const elements = $('li.auction-item, .auction-item');

    console.log(`Found ${elements.length} auction items`);

    elements.each((_, element) => {
      try {
        const $el = $(element);

        // Extract title from the auction-title link INSIDE the element
        const titleLink = $el.find('a.auction-title');
        const title = titleLink.text().trim() ||
                     $el.find('.auction-title').text().trim() ||
                     $el.find('h3').text().trim();

        // Skip non-Porsche listings
        if (!title || !title.toLowerCase().includes('porsche')) {
          return;
        }

        // Extract URL from the title link or first auction link
        let url = titleLink.attr('href') ||
                 $el.find('a[href*="/auctions/"]').first().attr('href') || '';
        if (!url) return;

        // Clean up the URL - remove query parameters
        const urlParts = url.split('?');
        url = urlParts[0];

        if (!url.startsWith('http')) {
          url = `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
        }

        // Extract subtitle and other info
        const subtitle = $el.find('.auction-subtitle').text().trim();

        // Extract bid/price info
        const bidElement = $el.find('.bid, .current-bid, .winning-bid');
        const bidText = bidElement.text().trim();

        // Extract status - check for "Time Left" or "Sold" indicators
        const timeLeftText = $el.find('.time-left, .countdown').text().trim();
        const statusText = $el.find('.auction-status, .status').text().trim().toLowerCase();
        const hasSoldBadge = $el.find('.sold-badge, .ended-badge').length > 0;
        const isSold = hasSoldBadge || statusText.includes('sold') || statusText.includes('ended') ||
                      (!timeLeftText && bidText.includes('Sold'));

        // Skip if we only want sold cars and this isn't sold
        if (onlySold && !isSold) {
          return;
        }

        // Extract location using Python scraper's selector
        const locationText = $el.find('.auction-loc').text().trim();
        const locationParts = locationText.split(',').map(s => s.trim());
        const location = locationText ? {
          city: locationParts[0],
          state: locationParts[1],
          zip: undefined
        } : undefined;

        // Extract price from bid text
        const price = this.extractPrice(bidText);

        // Extract year from title
        const yearMatch = title.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? parseInt(yearMatch[0]) : undefined;

        // Parse model and trim
        const { model, trim } = this.parseModelAndTrim(title);

        // Extract mileage if shown
        const mileageText = $el.find('.mileage').text().trim() || subtitle;
        const mileage = this.extractMileage(mileageText);

        // Extract thumbnail
        const thumbnail = $el.find('img').attr('src') || $el.find('img').attr('data-src');

        listings.push({
          title,
          year,
          model,
          trim,
          mileage,
          price: price || 0,
          location,
          source_url: url,
          scraped_at: new Date(),
          status: isSold ? 'Sold' : 'Active'
        });
      } catch (error) {
        console.error('Error parsing listing element:', error);
      }
    });

    return listings;
  }

  /**
   * Scrape detailed information from a product page
   */
  async scrapeDetail(url: string): Promise<ScraperResult> {
    try {
      console.log(`Fetching details: ${url}`);

      // Use Puppeteer to fetch the detail page
      const html = await this.fetchWithPuppeteer(url, true);

      // Store the HTML (commented out for now)
      // await this.htmlStorage.storeHTML(
      //   url,
      //   html,
      //   'carsandbids',
      //   'detail'
      // );

      const $ = cheerio.load(html);

      // Extract title exactly as Python scraper does
      const title = $('div.auction-title > h1').text().trim() ||
                   $('h1').first().text().trim();

      // Extract quick facts using Python scraper's approach
      const quickFacts: Record<string, string> = {};
      const quickFactsContainer = $('div.quick-facts');

      if (quickFactsContainer.length > 0) {
        quickFactsContainer.find('dt').each((_, element) => {
          const key = $(element).text().trim().toLowerCase().replace(':', '');
          const value = $(element).next('dd').text().trim();
          if (key && value) {
            quickFacts[key] = value;
          }
        });
      }

      // Alternative quick facts extraction
      if (Object.keys(quickFacts).length === 0) {
        $('.quick-facts li, .details-list li, .vehicle-details li').each((_, element) => {
          const text = $(element).text().trim();
          const colonIndex = text.indexOf(':');
          if (colonIndex > 0) {
            const key = text.substring(0, colonIndex).trim().toLowerCase();
            const value = text.substring(colonIndex + 1).trim();
            quickFacts[key] = value;
          }
        });
      }

      // Extract current bid using Python scraper's exact selector
      const bidValueText = $('div.current-bid > div.bid-value').text().trim() ||
                          $('.winning-bid-amount').text().trim() ||
                          $('.sold-for').text().trim();
      const price = this.extractPrice(bidValueText);

      // Extract VIN
      const vin = quickFacts['vin'] ||
                 $('[data-vin]').attr('data-vin') ||
                 $('*:contains("VIN:")').next().text().trim() ||
                 null;

      // Extract mileage
      const mileageText = quickFacts['mileage'] ||
                         $('*:contains("Mileage:")').next().text().trim();
      const mileage = this.extractMileage(mileageText);

      // Extract images using Python scraper's selectors
      const images: string[] = [];

      // Exterior images
      $('div[class*="gall-ext"] > img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) images.push(src);
      });

      // Interior images
      $('div[class*="gall-int"] > img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) images.push(src);
      });

      // General gallery if none found
      if (images.length === 0) {
        $('.gallery img, .photos img, .carousel img').each((_, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src');
          if (src) images.push(src);
        });
      }

      // Check bid history to determine status
      const bidHistory = $('.comments dl.placed-bid');
      const hasBids = bidHistory.length > 0;
      const hasSoldTag = $('*:contains("SOLD")').length > 0;
      const status = (price && price > 0) || hasSoldTag ? 'Sold' : (hasBids ? 'Active' : 'No Bids');

      // Extract sold date if available
      let sold_date = undefined;
      if (status === 'Sold') {
        const dateText = $('*:contains("Ended")').text() || $('*:contains("Sold")').text();
        const dateMatch = dateText.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
        if (dateMatch) {
          const [month, day, year] = dateMatch[0].split('/');
          sold_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      // Extract colors and other details from quick facts
      const exterior_color = quickFacts['exterior color'] || quickFacts['exterior'] || quickFacts['color'];
      const interior_color = quickFacts['interior color'] || quickFacts['interior'];
      const transmission = quickFacts['transmission'];
      const engine = quickFacts['engine'];
      const drivetrain = quickFacts['drivetrain'] || quickFacts['drive type'];

      // Extract seller info
      const sellerUsername = $('ul.stats li.seller div.username a').text().trim();
      const sellerLocation = $('.seller-location').text().trim() ||
                           $('*:contains("Location:")').next().text().trim();

      return {
        title,
        price: price || 0,
        vin,
        mileage,
        status,
        exterior_color,
        interior_color,
        transmission,
        source_url: url,
        scraped_at: new Date()
      };

    } catch (error) {
      console.error(`Error scraping detail page ${url}:`, error);
      throw new Error(`Failed to scrape detail page: ${error}`);
    }
  }

  /**
   * Extract price from text
   */
  private extractPrice(text: string): number | null {
    if (!text) return null;
    const cleaned = text.replace(/[$,]/g, '').trim();
    const match = cleaned.match(/\d+/);
    if (match) {
      return parseInt(match[0]);
    }
    return null;
  }

  /**
   * Extract mileage from text
   */
  private extractMileage(text: string): number | null {
    if (!text) return null;
    const cleaned = text.replace(/,/g, '');
    const match = cleaned.match(/(\d+)\s*(miles|mi)?/i);
    if (match) {
      return parseInt(match[1]);
    }
    return null;
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

  /**
   * Fetch a page using Puppeteer with JavaScript rendering
   */
  private async fetchWithPuppeteer(url: string, isDetailPage: boolean = false): Promise<string> {
    console.log(`🌐 Fetching with Puppeteer: ${url}`);

    let browser;
    try {
      // Connect to Bright Data's browser
      browser = await puppeteer.connect({
        browserWSEndpoint: this.browserWSEndpoint,
      });

      const page = await browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate to the page
      console.log('📄 Loading page...');
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Wait for content to load
      console.log('⏳ Waiting for content...');

      if (isDetailPage) {
        // For detail pages, wait for quick facts or title
        try {
          await page.waitForSelector('div.quick-facts, .vehicle-details, h1', {
            timeout: 15000
          });
        } catch (error) {
          console.log('Quick facts not found, continuing anyway');
        }
      } else {
        // For search/listing pages, wait for auction items
        try {
          await page.waitForSelector('li.auction-item, .auction-item, .results-item, a[href*="/auctions/"]', {
            timeout: 15000
          });
        } catch (error) {
          console.log('Auction items not found immediately, checking for alternative content...');

          // Scroll to trigger lazy loading
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });

          // Wait a bit more
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // Get the HTML content
      const html = await page.content();

      // Close the page
      await page.close();

      console.log('✅ Page fetched successfully');
      return html;

    } catch (error) {
      console.error('Puppeteer error:', error);
      throw error;
    } finally {
      // Clean up browser connection
      if (browser) {
        try {
          await browser.close();
        } catch (error) {
          console.error('Error closing browser:', error);
        }
      }
    }
  }
}