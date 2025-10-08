import { BaseScraper, ScrapedListing } from './base';
import * as cheerio from 'cheerio';
import { HTMLStorageService } from '../services/html-storage';
import { decodePorscheVIN } from '../utils/porsche-vin-decoder';

/**
 * Cars & Bids scraper using ScrapingBee
 */
export class CarsAndBidsScraperSB extends BaseScraper {
  private apiKey: string;
  private htmlStorage: HTMLStorageService;
  private baseUrl = 'https://carsandbids.com';

  constructor() {
    super('carsandbids');
    this.apiKey = process.env.SCRAPINGBEE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('SCRAPINGBEE_API_KEY environment variable is required');
    }
    this.htmlStorage = new HTMLStorageService();
    console.log('🚀 Cars & Bids scraper initialized (ScrapingBee version)');
  }

  private async makeScrapingBeeRequest(url: string, jsScenario?: any): Promise<any> {
    const params: any = {
      api_key: this.apiKey,
      url: url,
      render_js: 'true',  // Cars & Bids requires JS
      premium_proxy: 'true',  // Use premium proxy to bypass CloudFront
      country_code: 'us',
      json_response: 'true',
      wait_browser: 'load',  // Wait for browser to fully load
      wait: '5000',
      block_resources: 'false'  // Needed to bypass CloudFront protection
    };

    if (jsScenario) {
      params.js_scenario = JSON.stringify(jsScenario);
    }

    const urlParams = new URLSearchParams(params);
    const response = await fetch(`https://app.scrapingbee.com/api/v1?${urlParams.toString()}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ScrapingBee error: ${error}`);
    }

    return await response.json();
  }

  async scrapeListings(params?: {
    model?: string;
    trim?: string;
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<ScrapedListing[]> {
    const { model: inputModel, trim, maxPages = 1, onlySold = true } = params || {};
    const allListings: ScrapedListing[] = [];

    console.log('\n' + '█'.repeat(70));
    console.log(' '.repeat(20) + 'CARS & BIDS SCRAPER - SCRAPINGBEE VERSION');
    console.log('█'.repeat(70));
    console.log(`📋 Configuration:`);
    console.log(`   • Model: ${inputModel || 'all Porsche'}`);
    console.log(`   • Only sold: ${onlySold}`);
    console.log(`   • Max pages: ${maxPages}`);

    try {
      // Build the search URL for specific models
      let searchUrl: string;

      // We need to search for specific models, not just "porsche"
      let model = inputModel;
      if (!model) {
        // If no model specified, we'll need to search for each model separately
        model = '911';  // Default to 911 if not specified
      }

      // Handle special filters: 911-gt, 911-996, etc.
      let searchTerm = model.toLowerCase();
      if (searchTerm.startsWith('911-')) {
        const suffix = searchTerm.split('-')[1];

        // 911-gt: Search for all GT models
        if (suffix === 'gt') {
          searchTerm = 'porsche 911 gt';  // Will match GT2, GT3, GT4
        }
        // 911-[generation]: Search for specific generation
        else if (['996', '997', '991', '992', '993', '964'].includes(suffix)) {
          searchTerm = `porsche 911 ${suffix}`;
        } else {
          searchTerm = '911';  // Fallback to just 911
        }
      } else {
        searchTerm = `porsche ${searchTerm}`;
      }

      const searchQuery = searchTerm.replace(/\s+/g, '%20');

      if (onlySold) {
        // Past auctions with specific model query
        searchUrl = `${this.baseUrl}/past-auctions?q=${searchQuery}`;
      } else {
        // Current auctions with specific model
        searchUrl = `${this.baseUrl}/search/${searchQuery}`;
      }

      console.log(`\n🔗 Scraping: ${searchUrl}`);

      // Fetch the page with HTML response
      const response = await this.makeScrapingBeeRequest(searchUrl);

      if (!response.body) {
        console.error('❌ No HTML body in response');
        return allListings;
      }

      const html = response.body;
      console.log(`📄 Got HTML: ${html.length} characters`);

      // Store the search page HTML
      await this.htmlStorage.storeScrapedHTML({
        source: 'carsandbids',
        url: searchUrl,
        html: html,
        type: 'search',
        metadata: {
          scraper: 'CarsAndBidsScraperSB',
          model,
          onlySold
        }
      });

      // Parse the HTML
      const $ = cheerio.load(html);

      // Extract listings based on what we found in testing
      const listings: any[] = [];

      // Extract listings - both current and past use .auction-item (they are <li> elements)
      $('li.auction-item').each((i, el) => {
        const $el = $(el);

        // Get the title from the .auction-title div which contains an <a> tag
        const titleLink = $el.find('.auction-title a').first();
        if (!titleLink.length) return;

        const url = titleLink.attr('href');
        if (!url) return;

        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
        const title = titleLink.text().trim();

        // Get the whole text content for price extraction
        const fullText = $el.text();

        // Extract price correctly
        let price = 0;
        let status = 'active';

        // Check for sold price - only "Sold for" or "Sold after for" means it actually sold
        // The HTML structure concatenates price and year: "$125,0001985" or "$12,7502005"
        // We need to extract just the price part before the 4-digit year
        const soldMatch = fullText.match(/Sold (?:for|after for) \$([0-9,]+)/i);
        if (soldMatch) {
          // Remove commas to get clean digit string
          const priceWithYear = soldMatch[1].replace(/,/g, '');
          // The year is the last 4 digits, so price is everything before that
          // Extract price by removing the last 4 digits (year)
          const priceStr = priceWithYear.length > 4 ? priceWithYear.slice(0, -4) : priceWithYear;
          price = parseInt(priceStr);
          status = 'sold';
        } else {
          // Check for "Bid to" (for past auctions that didn't meet reserve)
          const bidToMatch = fullText.match(/Bid to \$([0-9,]+)/);
          if (bidToMatch) {
            const priceWithYear = bidToMatch[1].replace(/,/g, '');
            const priceStr = priceWithYear.length > 4 ? priceWithYear.slice(0, -4) : priceWithYear;
            price = parseInt(priceStr);
            status = 'unsold'; // Didn't meet reserve
          } else {
            // Extract current bid - look for the pattern "Bid $XXX" (with space)
            const bidMatch = fullText.match(/Bid \$([0-9,]+)/);
            if (bidMatch) {
              const priceWithYear = bidMatch[1].replace(/,/g, '');
              const priceStr = priceWithYear.length > 4 ? priceWithYear.slice(0, -4) : priceWithYear;
              price = parseInt(priceStr);
              status = 'active';
            }
          }
        }

        // Filter to only Porsche cars and exclude SUVs/sedans
        const titleLower = title.toLowerCase();

        // Must be a Porsche
        if (!titleLower.includes('porsche')) {
          return;
        }

        // Filter out Cayenne, Macan, Panamera, Taycan (SUVs and sedans)
        if (titleLower.includes('cayenne') ||
            titleLower.includes('macan') ||
            titleLower.includes('panamera') ||
            titleLower.includes('taycan')) {
          return; // Skip non-sports cars
        }

        // Only add sold listings when onlySold is true
        if (onlySold && status !== 'sold') {
          return; // Skip unsold listings when we only want sold ones
        }

        // Only add if we have a reasonable price
        if (price > 5000 || status === 'active') {
          listings.push({
            url: fullUrl,
            title,
            price,
            status
          });
        }
      });

      console.log(`📦 Found ${listings.length} listings from search page`);

      // Convert listings to ScrapedListing format
      for (const listing of listings) {
        // Parse year from title as fallback
        const yearMatch = listing.title.match(/\b(19\d{2}|20\d{2})\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

        // Parse model and trim from title
        let parsedModel = model;
        let parsedTrim = trim;
        let parsedGeneration: string | undefined;

        const titleLower = listing.title.toLowerCase();

        // Model detection if not specified
        if (!parsedModel) {
          if (titleLower.includes('911')) parsedModel = '911';
          else if (titleLower.includes('718') || titleLower.includes('cayman')) parsedModel = '718-cayman';
          else if (titleLower.includes('boxster')) parsedModel = '718-boxster';
        }

        // Trim detection
        if (!parsedTrim) {
          if (titleLower.includes('gt4 rs')) parsedTrim = 'gt4-rs';
          else if (titleLower.includes('gt4')) parsedTrim = 'gt4';
          else if (titleLower.includes('gt3 rs')) parsedTrim = 'gt3-rs';
          else if (titleLower.includes('gt3')) parsedTrim = 'gt3';
          else if (titleLower.includes('gt2 rs')) parsedTrim = 'gt2-rs';
          else if (titleLower.includes('gt2')) parsedTrim = 'gt2';
          else if (titleLower.includes('turbo s')) parsedTrim = 'turbo-s';
          else if (titleLower.includes('turbo')) parsedTrim = 'turbo';
          else if (titleLower.includes('gts')) parsedTrim = 'gts';
          else if (titleLower.includes('carrera 4s')) parsedTrim = 'carrera-4s';
          else if (titleLower.includes('carrera s')) parsedTrim = 'carrera-s';
          else if (titleLower.includes('carrera')) parsedTrim = 'carrera';
          else if (titleLower.includes('targa')) parsedTrim = 'targa';
          else if (titleLower.includes('spyder')) parsedTrim = 'spyder';
        }

        const fullListing: ScrapedListing = {
          source_url: listing.url,
          url: listing.url,
          title: listing.title,
          price: listing.price,
          status: listing.status,
          year,
          model: parsedModel,
          trim: parsedTrim,
          generation: parsedGeneration
        };

        allListings.push(fullListing);
      }

      // Fetch detail pages to get VIN and other data
      if (allListings.length > 0) {
        console.log('\n📥 Fetching detail pages for VIN extraction...');

        for (let i = 0; i < Math.min(allListings.length, 2); i++) {
          const listing = allListings[i];
          console.log(`  [${i + 1}/${Math.min(allListings.length, 5)}] ${listing.title}`);

          try {
            // Fetch detail page with longer wait for JS to load
            const detailParams: any = {
              api_key: this.apiKey,
              url: listing.url,
              render_js: 'true',
              premium_proxy: 'true',
              country_code: 'us',
              wait: '5000',  // Wait 5 seconds for JS to render
              wait_for: 'dt',  // Wait for dt elements to appear
              json_response: 'true',
              custom_google: 'false',  // Disable custom Google settings
              stealth_proxy: 'true'  // Use stealth mode
            };

            const urlParams = new URLSearchParams(detailParams);
            const response = await fetch(`https://app.scrapingbee.com/api/v1?${urlParams.toString()}`);

            if (!response.ok) {
              console.error(`    ❌ Failed to fetch detail page`);
              continue;
            }

            const data = await response.json();

            if (data.body) {
              // Parse HTML to extract VIN
              const $ = cheerio.load(data.body);

              // Method 1: Look in dt/dd tags (Cars & Bids uses definition lists)
              let vin: string | undefined;

              // Find all dt elements and look for VIN
              $('dt').each((_, el) => {
                const label = $(el).text().trim().toLowerCase();
                if (label === 'vin') {
                  const value = $(el).next('dd').text().trim();
                  if (value && value.match(/[A-Z0-9]{17}/)) {
                    vin = value;
                  }
                }
              });

              // Method 3: Look for VIN in all text as final fallback
              if (!vin) {
                const bodyText = $.text();
                const vinMatch = bodyText.match(/VIN[:\s]*([A-Z0-9]{17})/i);
                const porscheVinMatch = bodyText.match(/WP[A-Z0-9]{15}/);
                vin = vinMatch?.[1] || porscheVinMatch?.[0];
              }

              if (vin) {
                listing.vin = vin;
                console.log(`    ✅ Found VIN: ${vin}`);

                // Decode VIN
                const decoded = decodePorscheVIN(vin);
                if (decoded.valid && decoded.confidence === 'high') {
                  if (decoded.model) listing.model = decoded.model;
                  if (decoded.engineType) listing.trim = decoded.engineType;
                  if (decoded.generation) {
                    // Normalize generation to base (remove .1, .2 suffixes)
                    listing.generation = decoded.generation.split('.')[0];
                  }
                  if (decoded.modelYear) listing.year = decoded.modelYear;
                }
              } else {
                console.log(`    ⚠️ No VIN found in HTML`);
              }

              // Extract mileage from dt/dd
              $('dt').each((_, el) => {
                const label = $(el).text().trim().toLowerCase();
                if (label === 'mileage') {
                  const value = $(el).next('dd').text().trim();
                  const mileageMatch = value.match(/([\d,]+)/);
                  if (mileageMatch) {
                    listing.mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
                  }
                }
              });

              // Extract other fields from dt/dd
              $('dt').each((_, el) => {
                const label = $(el).text().trim().toLowerCase();
                const value = $(el).next('dd').text().trim();

                if (label === 'exterior color' && !listing.exterior_color) {
                  listing.exterior_color = value;
                } else if (label === 'interior color' && !listing.interior_color) {
                  listing.interior_color = value;
                }
              });

              // Extract sold date from page - look for the date format in the header
              // Format from search page: "9/30/25" or from detail: "Ended September 30th at 12:40 PM PDT"
              const bodyText = $.text();

              // Try to find "Ended <full date>" format first
              const longDateMatch = bodyText.match(/Ended\s+(\w+\s+\d+(?:st|nd|rd|th)?(?:,?\s+\d{4})?(?:\s+at\s+[\d:]+\s+[AP]M\s+[A-Z]{3})?)/i);
              if (longDateMatch) {
                const dateStr = longDateMatch[1].replace(/(\d+)(st|nd|rd|th)/, '$1');
                const parsedDate = new Date(dateStr);
                if (!isNaN(parsedDate.getTime())) {
                  listing.sold_date = parsedDate;
                }
              }

              // Fallback: Look for short date format "9/30/25" near "Sold for"
              if (!listing.sold_date) {
                const shortDateMatch = bodyText.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
                if (shortDateMatch) {
                  const parsedDate = new Date(shortDateMatch[1]);
                  if (!isNaN(parsedDate.getTime())) {
                    listing.sold_date = parsedDate;
                  }
                }
              }

              // Store HTML
              await this.htmlStorage.storeScrapedHTML({
                source: 'carsandbids',
                url: listing.url,
                html: data.body,
                type: 'detail'
              });
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (error) {
            console.error(`    ❌ Error fetching detail: ${error}`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error scraping Cars & Bids:', error);
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ Found ${allListings.length} total listings`);

    return allListings;
  }

  async scrapeDetail(url: string): Promise<ScrapedListing> {
    console.log(`🔍 Scraping detail page: ${url}`);

    try {
      // Fetch detail page with longer wait for JS to load
      const detailParams: any = {
        api_key: this.apiKey,
        url: url,
        render_js: 'true',
        premium_proxy: 'true',
        country_code: 'us',
        wait: '8000',  // Wait longer for JS to load VIN
        wait_for: '.quick-facts, .vehicle-details, [data-vin]',  // Wait for specific elements
        json_response: 'true'
      };

      const urlParams = new URLSearchParams(detailParams);
      const response = await fetch(`https://app.scrapingbee.com/api/v1?${urlParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch detail page: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.body) {
        throw new Error('No HTML body in response');
      }

      // Parse HTML to extract details
      const $ = cheerio.load(data.body);

      // Extract title
      const title = $('h1').first().text().trim() ||
                   $('.auction-title').first().text().trim() ||
                   $('title').text().trim();

      // Extract VIN
      let vin: string | undefined;
      $('.quick-facts dt').each((_, el) => {
        const label = $(el).text().trim().toLowerCase();
        if (label.includes('vin')) {
          const value = $(el).next('dd').text().trim();
          if (value && value.match(/[A-Z0-9]{17}/)) {
            vin = value;
          }
        }
      });

      // Fallback VIN extraction
      if (!vin) {
        const bodyText = $.text();
        const vinMatch = bodyText.match(/VIN[:\s]*([A-Z0-9]{17})/i);
        const porscheVinMatch = bodyText.match(/WP[A-Z0-9]{15}/);
        vin = vinMatch?.[1] || porscheVinMatch?.[0];
      }

      // Extract price
      let price = 0;
      let status = 'active';
      const bodyText = $.text();

      const soldMatch = bodyText.match(/Sold (?:for|after for) \$([0-9,]+)(?:\D|$)/i);
      if (soldMatch) {
        price = parseInt(soldMatch[1].replace(/,/g, ''));
        status = 'sold';
      } else {
        const bidMatch = bodyText.match(/Bid \$([0-9,]+)(?:\D|$)/);
        if (bidMatch) {
          price = parseInt(bidMatch[1].replace(/,/g, ''));
        }
      }

      // Extract mileage
      let mileage: number | undefined;
      const mileageMatch = bodyText.match(/([\d,]+)\s*(?:miles?|mi\b)/i);
      if (mileageMatch) {
        mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
      }

      // Extract year from title
      const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
      let year = yearMatch ? parseInt(yearMatch[1]) : undefined;

      // Parse model and trim from title
      const titleLower = title.toLowerCase();
      let model: string | undefined;
      let trim: string | undefined;
      let generation: string | undefined;

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
      else if (titleLower.includes('gts')) trim = 'gts';
      else if (titleLower.includes('carrera 4s')) trim = 'carrera-4s';
      else if (titleLower.includes('carrera s')) trim = 'carrera-s';
      else if (titleLower.includes('carrera')) trim = 'carrera';
      else if (titleLower.includes('targa')) trim = 'targa';
      else if (titleLower.includes('spyder')) trim = 'spyder';

      // Decode VIN if available
      if (vin) {
        const decoded = decodePorscheVIN(vin);
        if (decoded.valid && decoded.confidence === 'high') {
          if (decoded.model) model = decoded.model;
          if (decoded.engineType) trim = decoded.engineType;
          if (decoded.generation) {
            // Normalize generation to base (remove .1, .2 suffixes)
            generation = decoded.generation.split('.')[0];
          }
          if (decoded.modelYear) year = decoded.modelYear;
        }
      }

      // Store HTML
      await this.htmlStorage.storeScrapedHTML({
        source: 'carsandbids',
        url: url,
        html: data.body,
        type: 'detail',
        metadata: {
          scraper: 'CarsAndBidsScraperSB',
          vin
        }
      });

      const listing: ScrapedListing = {
        source_url: url,
        url: url,
        title,
        price,
        status,
        vin,
        mileage,
        year,
        model,
        trim,
        generation
      };

      return listing;

    } catch (error) {
      console.error('❌ Error scraping detail page:', error);
      throw error;
    }
  }
}