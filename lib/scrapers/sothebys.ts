import { BaseScraper, ScraperResult } from './base';
import * as cheerio from 'cheerio';
import { CurlFetcher } from './curl-fetcher';
import { BrightDataPuppeteer } from './bright-data-puppeteer';
import { HTMLStorageService } from '@/lib/services/html-storage';

/**
 * RM Sotheby's Auction House Scraper
 *
 * Scrapes sold Porsche listings from RM Sotheby's auction results.
 *
 * Key URLs:
 * - Results: https://rmsothebys.com/results
 * - Search: https://rmsothebys.com/search?availability=sold&categories=motor-cars
 * - Individual lots: https://rmsothebys.com/auctions/{code}/lots/{lot-id}/
 *
 * Data availability:
 * - VIN: Available in lot details
 * - Sold prices: Available for completed auctions
 * - Mileage: Available in specifications
 * - Date: Auction date available
 * - Specifications: Comprehensive technical details
 *
 * Challenges:
 * - Heavy JavaScript-based site requiring browser automation
 * - Search results load dynamically
 * - Anti-scraping measures via reCAPTCHA
 * - Rate limiting needed
 */
export class SothebysScraper extends BaseScraper {
  private baseUrl = 'https://rmsothebys.com';
  private curlFetcher: CurlFetcher;
  private puppeteer?: BrightDataPuppeteer;
  private htmlStorage: HTMLStorageService;
  private sessionCache: Map<string, string> = new Map();

  constructor() {
    super('sothebys');
    this.curlFetcher = new CurlFetcher();
    this.htmlStorage = new HTMLStorageService();

    // Initialize Puppeteer if Bright Data credentials are available
    if (process.env.BRIGHT_DATA_CUSTOMER_ID || process.env.BRIGHT_DATA_BROWSER_PASSWORD) {
      this.puppeteer = new BrightDataPuppeteer();
    }
  }

  /**
   * Fetch URL with fallback strategy: Curl first, then Puppeteer if needed
   */
  private async fetchUrl(url: string, type: 'search' | 'detail', model?: string, trim?: string): Promise<string> {
    // Check session cache first
    if (this.sessionCache.has(url)) {
      console.log(`Using session cache for: ${url}`);
      return this.sessionCache.get(url)!;
    }

    let html: string | null = null;

    try {
      // Try curl first for simpler pages
      console.log(`Attempting curl fetch: ${url}`);
      html = await this.curlFetcher.fetchWithRetry(url, 2);

      if (html && html.length > 1000) {
        console.log(`✓ Curl successful: ${html.length} bytes`);
      } else {
        throw new Error('Curl returned insufficient data');
      }
    } catch (curlError) {
      console.log('Curl failed, trying Puppeteer...');

      if (!this.puppeteer) {
        throw new Error('Bright Data credentials not available for browser automation');
      }

      try {
        // Use Puppeteer for JavaScript-heavy pages
        const result = await this.puppeteer.scrapeListingPage(url);
        html = result.html;
        console.log(`✓ Puppeteer successful: ${html?.length} bytes`);
      } catch (puppeteerError) {
        throw new Error(`Both curl and Puppeteer failed. Curl: ${curlError}. Puppeteer: ${puppeteerError}`);
      }
    }

    if (!html) {
      throw new Error('Failed to fetch content with any method');
    }

    // Store HTML
    try {
      await this.htmlStorage.storeScrapedHTML({
        source: 'sothebys',
        url,
        html,
        type,
        model,
        trim,
        metadata: {
          scraper: 'SothebysScraper',
          timestamp: new Date().toISOString(),
          htmlLength: html.length
        }
      });
      console.log(`Stored ${type} HTML: source=sothebys, model=${model}, trim=${trim}`);
    } catch (storageError) {
      console.error(`Failed to store HTML for ${url}:`, storageError);
    }

    // Cache for this session
    this.sessionCache.set(url, html);
    return html;
  }

  async scrapeListings(params?: {
    models?: string[];
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<ScraperResult[]> {
    const results: ScraperResult[] = [];
    const processedUrls = new Set<string>();

    try {
      await this.startIngestion();

      // RM Sotheby's search for sold Porsche cars
      const searchUrl = `${this.baseUrl}/search?availability=sold&categories=motor-cars&make=porsche`;

      console.log('🚀 Searching RM Sotheby\'s for sold Porsche listings...\n');
      console.log(`Search URL: ${searchUrl}`);

      const html = await this.fetchUrl(searchUrl, 'search', 'porsche', 'all');
      const $ = cheerio.load(html);

      // Extract sold listings from search results
      const soldListings = this.extractSearchResults($);

      console.log(`✅ Found ${soldListings.length} sold listings from search`);

      // Process each sold listing
      for (const listing of soldListings) {
        const fullUrl = listing.url.startsWith('http') ? listing.url : `${this.baseUrl}${listing.url}`;

        if (processedUrls.has(fullUrl)) {
          continue;
        }
        processedUrls.add(fullUrl);

        console.log(`Fetching detail: ${fullUrl}`);

        try {
          const detail = await this.scrapeDetail(fullUrl);

          if (detail && detail.status === 'sold' && detail.price && detail.price > 15000) {
            results.push(detail);
            await this.saveListing(detail);
            console.log(`  ✓ Saved: ${detail.title} - $${detail.price.toLocaleString()}`);
          }

          // Update progress
          await this.updateIngestion({
            total_fetched: processedUrls.size,
            total_processed: results.length
          });

          await this.delay(3000); // Rate limiting
        } catch (error) {
          console.error(`  ❌ Error processing ${fullUrl}:`, error);
        }
      }

      await this.completeIngestion();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`COMPLETED: Scraped ${results.length} sold listings from RM Sotheby's`);
      console.log('='.repeat(60));

    } catch (error) {
      console.error('RM Sotheby\'s scraping failed:', error);
      await this.completeIngestion('failed');
    }

    return results;
  }

  async scrapeDetail(url: string): Promise<ScraperResult | null> {
    try {
      const html = await this.fetchUrl(url, 'detail');
      const $ = cheerio.load(html);

      // Extract basic information
      const title = this.extractTitle($);
      const year = this.extractYear($, title);
      const model = this.extractModel($, title);
      const trim = this.extractTrim($, title);

      // Check if this is actually sold
      const isSold = this.checkIfSold($);
      if (!isSold) {
        console.log('    Skipping active/upcoming auction (not sold yet)');
        return null;
      }

      // Extract key data
      const price = this.extractSoldPrice($);
      if (!price || price < 15000) {
        console.log(`    Invalid price detected: $${price} for ${title}`);
        return null;
      }

      const soldDate = this.extractSoldDate($);
      const vin = this.extractVIN($);
      const mileage = this.extractMileage($);
      const location = this.extractLocation($);
      const exteriorColor = this.extractExteriorColor($);
      const interiorColor = this.extractInteriorColor($);
      const transmission = this.extractTransmission($);
      const optionsText = this.extractOptions($);

      // Extract source ID from URL
      const sourceId = this.extractSourceId(url);

      return {
        vin,
        title,
        price,
        mileage,
        year,
        model,
        trim,
        status: 'sold',
        exterior_color: exteriorColor,
        interior_color: interiorColor,
        transmission,
        location,
        source_url: url,
        source_id: sourceId,
        sold_date: soldDate,
        options_text: optionsText,
        html
      } as ScraperResult;

    } catch (error) {
      console.error(`Failed to scrape detail for ${url}:`, error);
      return null;
    }
  }

  private extractSearchResults($: cheerio.CheerioAPI): Array<{ url: string; title: string; estimate?: string }> {
    const listings: Array<{ url: string; title: string; estimate?: string }> = [];

    // RM Sotheby's search results structure (may need adjustment based on actual HTML)
    $('.search-result-item, .lot-card, .auction-lot').each((i, el) => {
      const linkEl = $(el).find('a[href*="/lots/"]').first();
      const titleEl = $(el).find('h3, h4, .lot-title, .title').first();
      const estimateEl = $(el).find('.estimate, .pre-sale-estimate').first();

      if (linkEl.length && titleEl.length) {
        const url = linkEl.attr('href') || '';
        const title = titleEl.text().trim();
        const estimate = estimateEl.text().trim();

        // Filter for Porsche vehicles only
        const titleLower = title.toLowerCase();
        const isPorsche = titleLower.includes('porsche') ||
                         titleLower.includes('911') ||
                         titleLower.includes('718') ||
                         titleLower.includes('boxster') ||
                         titleLower.includes('cayman') ||
                         titleLower.includes('gt3') ||
                         titleLower.includes('gt2') ||
                         titleLower.includes('gt4') ||
                         titleLower.includes('turbo');

        // Skip SUVs and sedans
        const isSportsCar = !titleLower.includes('cayenne') &&
                           !titleLower.includes('macan') &&
                           !titleLower.includes('panamera') &&
                           !titleLower.includes('taycan');

        if (isPorsche && isSportsCar && url) {
          listings.push({ url, title, estimate });
        }
      }
    });

    return listings;
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    return $('h1.lot-title, h1, .lot-header h1, .listing-title').first().text().trim();
  }

  private extractYear($: cheerio.CheerioAPI, title: string): number | undefined {
    const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : undefined;
  }

  private extractModel($: cheerio.CheerioAPI, title: string): string | undefined {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('718') || titleLower.includes('cayman') || titleLower.includes('boxster')) {
      return '718';
    } else if (titleLower.includes('911')) {
      return '911';
    }

    return undefined;
  }

  private extractTrim($: cheerio.CheerioAPI, title: string): string | undefined {
    const titleLower = title.toLowerCase();

    // GT models
    if (titleLower.includes('gt3 rs')) return 'GT3 RS';
    if (titleLower.includes('gt3')) return 'GT3';
    if (titleLower.includes('gt2 rs')) return 'GT2 RS';
    if (titleLower.includes('gt2')) return 'GT2';
    if (titleLower.includes('gt4 rs')) return 'GT4 RS';
    if (titleLower.includes('gt4')) return 'GT4';

    // Turbo models
    if (titleLower.includes('turbo s')) return 'Turbo S';
    if (titleLower.includes('turbo')) return 'Turbo';

    // Special editions
    if (titleLower.includes('s/t')) return 'S/T';
    if (titleLower.includes('speedster')) return 'Speedster';
    if (titleLower.includes('sport classic')) return 'Sport Classic';

    // Regular trims
    if (titleLower.includes('carrera 4s')) return 'Carrera 4S';
    if (titleLower.includes('carrera s')) return 'Carrera S';
    if (titleLower.includes('carrera 4')) return 'Carrera 4';
    if (titleLower.includes('carrera')) return 'Carrera';
    if (titleLower.includes('gts')) return 'GTS';

    // 718 specific
    if (titleLower.includes('spyder')) return 'Spyder';
    if (titleLower.includes('cayman')) return 'Cayman';
    if (titleLower.includes('boxster')) return 'Boxster';

    return undefined;
  }

  private checkIfSold($: cheerio.CheerioAPI): boolean {
    const pageText = $.html().toLowerCase();

    // Look for sold indicators
    const soldIndicators = [
      pageText.includes('sold for'),
      pageText.includes('hammer price'),
      pageText.includes('winning bid'),
      pageText.includes('final price'),
      $('.lot-status').text().toLowerCase().includes('sold'),
      $('.auction-status').text().toLowerCase().includes('sold'),
      $('.status-sold').length > 0
    ];

    return soldIndicators.some(indicator => indicator);
  }

  private extractSoldPrice($: cheerio.CheerioAPI): number | null {
    // Try multiple selectors for sold price
    const priceSelectors = [
      '.sold-price',
      '.hammer-price',
      '.final-price',
      '.winning-bid',
      '.lot-result .price'
    ];

    for (const selector of priceSelectors) {
      const priceEl = $(selector).first();
      if (priceEl.length) {
        const priceText = priceEl.text();
        const priceMatch = priceText.match(/[\d,]+/);
        if (priceMatch) {
          const price = parseInt(priceMatch[0].replace(/,/g, ''));
          if (!isNaN(price) && price > 1000) {
            return price;
          }
        }
      }
    }

    // Fallback to page text search
    const pageText = $.html();
    const patterns = [
      /sold for[:\s]*(?:USD?\s*)?\$?([\d,]+)/i,
      /hammer price[:\s]*\$?([\d,]+)/i,
      /winning bid[:\s]*\$?([\d,]+)/i,
      /final price[:\s]*\$?([\d,]+)/i
    ];

    for (const pattern of patterns) {
      const match = pageText.match(pattern);
      if (match) {
        const price = parseInt(match[1].replace(/,/g, ''));
        if (!isNaN(price) && price > 1000) {
          return price;
        }
      }
    }

    return null;
  }

  private extractSoldDate($: cheerio.CheerioAPI): Date | undefined {
    // Look for auction date
    const dateText = $('.auction-date, .sale-date, .lot-date').text();
    if (dateText) {
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try meta tags
    const metaDate = $('meta[property="auction:date"]').attr('content') ||
                    $('meta[name="auction:date"]').attr('content');
    if (metaDate) {
      const date = new Date(metaDate);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return undefined;
  }

  private extractVIN($: cheerio.CheerioAPI): string | undefined {
    // Look for VIN in specifications or details section
    const vinPatterns = [
      /vin[:\s]*([a-z0-9]{17})/i,
      /chassis[:\s]*([a-z0-9]{17})/i,
      /serial[:\s]*([a-z0-9]{17})/i
    ];

    const pageText = $.html();
    for (const pattern of vinPatterns) {
      const match = pageText.match(pattern);
      if (match) {
        const vin = match[1].toUpperCase();
        // Validate Porsche VIN format
        if (vin.startsWith('WP0') || vin.startsWith('WP1')) {
          return vin;
        }
      }
    }

    return undefined;
  }

  private extractMileage($: cheerio.CheerioAPI): number | undefined {
    const mileageText = $('.mileage, .odometer').text() || '';

    // Try structured data first
    if (mileageText) {
      const match = mileageText.match(/[\d,]+/);
      if (match) {
        const mileage = parseInt(match[0].replace(/,/g, ''));
        if (!isNaN(mileage) && mileage >= 0 && mileage < 500000) {
          return mileage;
        }
      }
    }

    // Search in full page text
    const pageText = $.html();
    const patterns = [
      /(\d{1,3}(?:,\d{3})*)\s*(?:km|miles|mi)/i,
      /(\d+)k\s*(?:km|miles|mi)/i,
      /mileage[:\s]*(\d{1,3}(?:,\d{3})*)/i,
      /odometer[:\s]*(\d{1,3}(?:,\d{3})*)/i
    ];

    for (const pattern of patterns) {
      const match = pageText.match(pattern);
      if (match) {
        let mileage = parseInt(match[1].replace(/,/g, ''));

        // Handle 'k' notation
        if (pattern.source.includes('k\\s*')) {
          mileage *= 1000;
        }

        if (!isNaN(mileage) && mileage >= 0 && mileage < 500000) {
          return mileage;
        }
      }
    }

    return undefined;
  }

  private extractLocation($: cheerio.CheerioAPI): { city?: string; state?: string; zip?: string } | undefined {
    const locationText = $('.location, .venue, .sale-location').text();

    if (locationText) {
      // Parse "City, State ZIP" format
      const match = locationText.match(/([^,]+),\s*([A-Za-z\s]+?)\s*(\d{5})?$/);
      if (match) {
        return {
          city: match[1].trim(),
          state: match[2].trim(),
          zip: match[3] || undefined
        };
      }
    }

    return undefined;
  }

  private extractExteriorColor($: cheerio.CheerioAPI): string | undefined {
    const colorText = $('.exterior-color, .color, .paint').first().text();

    if (colorText && colorText.length > 2) {
      return colorText.trim();
    }

    // Look in specifications
    const specs = $('.specifications, .details').text();
    const colorMatch = specs.match(/exterior[:\s]*([^\n,]+)/i) ||
                      specs.match(/paint[:\s]*([^\n,]+)/i) ||
                      specs.match(/color[:\s]*([^\n,]+)/i);

    if (colorMatch) {
      return colorMatch[1].trim();
    }

    return undefined;
  }

  private extractInteriorColor($: cheerio.CheerioAPI): string | undefined {
    const interiorText = $('.interior-color, .interior, .upholstery').first().text();

    if (interiorText && interiorText.length > 2) {
      return interiorText.trim();
    }

    // Look in specifications
    const specs = $('.specifications, .details').text();
    const interiorMatch = specs.match(/interior[:\s]*([^\n,]+)/i) ||
                         specs.match(/upholstery[:\s]*([^\n,]+)/i) ||
                         specs.match(/leather[:\s]*([^\n,]+)/i);

    if (interiorMatch) {
      return interiorMatch[1].trim();
    }

    return undefined;
  }

  private extractTransmission($: cheerio.CheerioAPI): string | undefined {
    const transmissionText = $('.transmission, .gearbox').first().text();

    if (transmissionText && transmissionText.length > 2) {
      return transmissionText.trim();
    }

    // Look in specifications
    const specs = $('.specifications, .details').text();
    const transMatch = specs.match(/transmission[:\s]*([^\n,]+)/i) ||
                      specs.match(/gearbox[:\s]*([^\n,]+)/i);

    if (transMatch) {
      return transMatch[1].trim();
    }

    return undefined;
  }

  private extractOptions($: cheerio.CheerioAPI): string {
    const options: string[] = [];

    // Look for options lists
    $('.options li, .equipment li, .features li').each((i, el) => {
      const option = $(el).text().trim();
      if (option && option.length > 3 && option.length < 200) {
        options.push(option);
      }
    });

    // If no structured options, look for option sections
    if (options.length === 0) {
      const optionsSection = $('.options, .equipment, .features').text();
      if (optionsSection) {
        // Split by common delimiters
        const optionList = optionsSection
          .split(/[,;]/)
          .map(opt => opt.trim())
          .filter(opt => opt.length > 3 && opt.length < 200);

        options.push(...optionList);
      }
    }

    return options.join('; ');
  }

  private extractSourceId(url: string): string | undefined {
    // Extract lot ID from URL pattern: /auctions/{code}/lots/{lot-id}/
    const match = url.match(/\/lots\/([^\/]+)\/?$/);
    return match ? match[1] : undefined;
  }
}