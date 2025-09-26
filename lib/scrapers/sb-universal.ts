import * as cheerio from 'cheerio';

/**
 * Universal ScrapingBee scraper that can be configured for different sites
 */
export class ScrapingBeeUniversal {
  private apiKey: string;
  private baseUrl: string = 'https://app.scrapingbee.com/api/v1';
  private requestCount: number = 0;
  private maxRequestsPerSession: number = 50;
  private lastSessionReset: number = Date.now();

  constructor() {
    this.apiKey = process.env.SCRAPINGBEE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('SCRAPINGBEE_API_KEY environment variable is required');
    }
  }

  /**
   * Check if we should rotate session based on requests or time
   */
  private shouldRotateSession(): boolean {
    const timeSinceReset = Date.now() - this.lastSessionReset;
    const maxSessionTime = 15 * 60 * 1000; // 15 minutes

    return this.requestCount >= this.maxRequestsPerSession ||
           timeSinceReset >= maxSessionTime;
  }

  /**
   * Reset session counters
   */
  private resetSession() {
    this.requestCount = 0;
    this.lastSessionReset = Date.now();
    console.log(`🔄 ScrapingBee session reset`);
  }

  /**
   * Make a request through ScrapingBee API
   */
  async makeRequest(url: string, options: any = {}): Promise<any> {
    // Check if we should rotate session
    if (this.shouldRotateSession()) {
      this.resetSession();
    }

    this.requestCount++;

    // Build base parameters
    const params: any = {
      api_key: this.apiKey,
      url: url,
      premium_proxy: 'true',
      country_code: 'us',
      json_response: 'true',
    };

    // Add render_js if needed (for JavaScript-heavy sites)
    if (options.render_js !== false) {
      params.render_js = 'true';
    }

    // Add js_scenario if provided
    if (options.js_scenario) {
      params.js_scenario = JSON.stringify(options.js_scenario);
    }

    // Add other options
    if (options.wait) params.wait = options.wait;
    if (options.wait_for) params.wait_for = options.wait_for;
    if (options.block_ads !== false) params.block_ads = 'true';

    // Convert to URLSearchParams
    const urlParams = new URLSearchParams(params);

    const response = await fetch(`${this.baseUrl}?${urlParams.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ScrapingBee error (${response.status}): ${errorText}`);
    }

    const responseData = await response.json();
    return responseData;
  }

  /**
   * Scrape a simple page without JavaScript
   */
  async scrapePage(url: string, waitFor?: string): Promise<string> {
    console.log(`🐝 Fetching: ${url}`);

    const response = await this.makeRequest(url, {
      render_js: false,  // Simple HTTP request
      wait_for: waitFor
    });

    return response.body || '';
  }

  /**
   * Scrape a JavaScript-heavy page
   */
  async scrapeJSPage(url: string, jsScenario?: any): Promise<{ html: string; evaluateResults?: any[] }> {
    console.log(`🐝 Fetching JS page: ${url}`);

    const options: any = {
      render_js: true,
      wait: '3000'
    };

    if (jsScenario) {
      options.js_scenario = jsScenario;
    }

    const response = await this.makeRequest(url, options);

    return {
      html: response.body || '',
      evaluateResults: response.evaluate_results
    };
  }

  /**
   * Scrape Classic.com search results
   */
  async scrapeClassicSearch(searchUrl: string, maxPages: number = 1): Promise<{ html: string; listings: any[] }> {
    console.log(`🐝 Scraping Classic.com: ${searchUrl}`);

    // Classic.com doesn't need JavaScript for search pages
    const html = await this.scrapePage(searchUrl);

    // Parse listings from HTML
    const $ = cheerio.load(html);
    const listings: any[] = [];

    $('a[href^="/veh/"]').each((_, el) => {
      const $el = $(el);
      const url = 'https://www.classic.com' + $el.attr('href');

      // Get the parent container for this listing
      const $container = $el.closest('div[class*="relative"]');

      // Extract title
      const title = $container.find('h3, [class*="font-semibold"]').first().text().trim();

      // Extract price
      const priceText = $container.find('[class*="font-medium"], [class*="price"]').text();
      const priceMatch = priceText.match(/\$?([\d,]+)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;

      if (title && price > 15000) {
        listings.push({ url, title, price });
      }
    });

    console.log(`📦 Found ${listings.length} listings`);
    return { html, listings };
  }

  /**
   * Scrape Cars & Bids with JavaScript rendering
   */
  async scrapeCarsAndBids(searchUrl: string, maxPages: number = 1): Promise<{ html: string; listings: any[] }> {
    console.log(`🐝 Scraping Cars & Bids: ${searchUrl}`);

    // Cars & Bids needs JavaScript rendering
    const jsScenario = {
      instructions: [
        { wait_for: '.auction-title, .past-auction-title' },
        { wait: 2000 },
        // Scroll to load more content
        { evaluate: 'window.scrollTo(0, document.body.scrollHeight)' },
        { wait: 2000 },
        // Extract listings
        { evaluate: `
          (function() {
            const listings = [];

            // Past auctions (sold)
            document.querySelectorAll('.past-auction').forEach(item => {
              const link = item.querySelector('a[href*="/auctions/"]');
              const title = item.querySelector('.past-auction-title, h3')?.textContent?.trim();
              const priceText = item.textContent || '';
              const priceMatch = priceText.match(/\\$([\\d,]+)/);
              const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;

              if (link && title && price > 15000) {
                listings.push({
                  url: 'https://carsandbids.com' + link.getAttribute('href'),
                  title: title,
                  price: price,
                  status: 'sold'
                });
              }
            });

            // Current auctions
            document.querySelectorAll('.auction-item').forEach(item => {
              const link = item.querySelector('a[href*="/auctions/"]');
              const title = item.querySelector('.auction-title, h3')?.textContent?.trim();
              const bidText = item.querySelector('.current-bid')?.textContent || '';
              const bidMatch = bidText.match(/\\$([\\d,]+)/);
              const price = bidMatch ? parseInt(bidMatch[1].replace(/,/g, '')) : 0;

              if (link && title) {
                listings.push({
                  url: 'https://carsandbids.com' + link.getAttribute('href'),
                  title: title,
                  price: price,
                  status: 'active'
                });
              }
            });

            return listings;
          })()
        ` }
      ]
    };

    const result = await this.scrapeJSPage(searchUrl, jsScenario);

    // Extract listings from evaluate results
    let listings = [];
    if (result.evaluateResults && result.evaluateResults.length > 0) {
      const lastResult = result.evaluateResults[result.evaluateResults.length - 1];
      if (Array.isArray(lastResult)) {
        listings = lastResult;
      }
    }

    console.log(`📦 Found ${listings.length} listings`);
    return { html: result.html, listings };
  }

  /**
   * Scrape Cars.com with pagination
   */
  async scrapeCars(searchUrl: string): Promise<{ html: string; listings: any[] }> {
    console.log(`🐝 Scraping Cars.com: ${searchUrl}`);

    // Cars.com loads initial content without JS
    const html = await this.scrapePage(searchUrl);

    const $ = cheerio.load(html);
    const listings: any[] = [];

    // Extract listings from search results
    $('div[data-qa="search-result"], .vehicle-card').each((_, el) => {
      const $el = $(el);

      // Extract URL
      const link = $el.find('a[href*="/vehicledetail/"]').first();
      const url = link.attr('href');
      if (!url) return;

      const fullUrl = url.startsWith('http') ? url : `https://www.cars.com${url}`;

      // Extract title
      const title = $el.find('h2, .title').first().text().trim();

      // Extract price
      const priceText = $el.find('[class*="price"], .primary-price').first().text();
      const priceMatch = priceText.match(/\$?([\d,]+)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;

      // Extract mileage
      const mileageText = $el.find('[class*="mileage"]').text();
      const mileageMatch = mileageText.match(/([\d,]+)\s*mi/i);
      const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : undefined;

      if (title && price > 10000) {
        listings.push({
          url: fullUrl,
          title,
          price,
          mileage,
          status: 'active'
        });
      }
    });

    console.log(`📦 Found ${listings.length} listings`);
    return { html, listings };
  }

  /**
   * Scrape Edmunds
   */
  async scrapeEdmunds(searchUrl: string): Promise<{ html: string; listings: any[] }> {
    console.log(`🐝 Scraping Edmunds: ${searchUrl}`);

    // Edmunds needs JavaScript for inventory listings
    const jsScenario = {
      instructions: [
        { wait_for: '[class*="inventory-listing"], [class*="vehicle-card"]' },
        { wait: 2000 },
        { evaluate: `
          (function() {
            const listings = [];

            document.querySelectorAll('[class*="inventory-listing"], [class*="vehicle-card"]').forEach(card => {
              const link = card.querySelector('a[href*="/inventory/"], a[href*="/vin/"]');
              const title = card.querySelector('h2, h3, [class*="title"]')?.textContent?.trim();
              const priceText = card.querySelector('[class*="price"]')?.textContent || '';
              const priceMatch = priceText.match(/\\$([\\d,]+)/);
              const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;

              if (link && title && price > 10000) {
                listings.push({
                  url: 'https://www.edmunds.com' + link.getAttribute('href'),
                  title: title,
                  price: price,
                  status: 'active'
                });
              }
            });

            return listings;
          })()
        ` }
      ]
    };

    const result = await this.scrapeJSPage(searchUrl, jsScenario);

    // Extract listings from evaluate results
    let listings = [];
    if (result.evaluateResults && result.evaluateResults.length > 0) {
      const lastResult = result.evaluateResults[result.evaluateResults.length - 1];
      if (Array.isArray(lastResult)) {
        listings = lastResult;
      }
    }

    console.log(`📦 Found ${listings.length} listings`);
    return { html: result.html, listings };
  }

  /**
   * Scrape AutoTrader
   */
  async scrapeAutoTrader(searchUrl: string): Promise<{ html: string; listings: any[] }> {
    console.log(`🐝 Scraping AutoTrader: ${searchUrl}`);

    const html = await this.scrapePage(searchUrl);

    const $ = cheerio.load(html);
    const listings: any[] = [];

    // Extract listings
    $('[data-testid="inventory-listing"], .inventory-listing').each((_, el) => {
      const $el = $(el);

      // Extract URL
      const link = $el.find('a[href*="/cars-for-sale/vehicledetails"]').first();
      const url = link.attr('href');
      if (!url) return;

      const fullUrl = url.startsWith('http') ? url : `https://www.autotrader.com${url}`;

      // Extract title
      const title = $el.find('h2, h3').first().text().trim();

      // Extract price
      const priceText = $el.find('[data-testid*="price"], [class*="price"]').first().text();
      const priceMatch = priceText.match(/\$?([\d,]+)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;

      if (title && price > 10000) {
        listings.push({
          url: fullUrl,
          title,
          price,
          status: 'active'
        });
      }
    });

    console.log(`📦 Found ${listings.length} listings`);
    return { html, listings };
  }
}