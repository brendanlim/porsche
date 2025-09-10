import * as cheerio from 'cheerio';
import { SharedScraper } from './shared-scraper';
import { ScrapedListing } from './base';
import { CurlFetcher } from './curl-fetcher';
import { HTMLStorageService } from '@/lib/services/html-storage';

export class ClassicScraper extends SharedScraper {
  private curlFetcher: CurlFetcher;
  protected htmlStorage: HTMLStorageService;

  constructor() {
    super({
      name: 'Classic.com',
      source: 'classic',
      baseUrl: 'https://www.classic.com',
      searchPaths: [
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
      ],
      selectors: {
        // Classic.com uses /veh/ URLs for individual listings
        listings: 'a[href^="/veh/"]',
        title: 'h1',  // h1 contains the full title
        price: '.text-xl.font-medium',  // Main price display
        vin: '',  // Will extract from text
        year: '',  // Will extract from title
        mileage: '',  // Will extract from text
        location: '[class*="location"]',
        status: '',  // Will determine from price context
        images: 'img[src*="cdn"], img[src*="classic"]',
        description: '[class*="description"]'
      },
      pagination: {
        type: 'page',
        param: 'page'
      }
    });
    
    this.curlFetcher = new CurlFetcher();
    this.htmlStorage = new HTMLStorageService();
  }
  
  // Override fetchUrl to use curl instead of Bright Data
  protected async fetchUrl(url: string, type: 'search' | 'detail' = 'search'): Promise<string> {
    console.log(`Fetching Classic.com URL with curl: ${url}`);
    
    // Check session cache first
    if (this.htmlCache.has(url)) {
      console.log(`Using cached HTML for: ${url}`);
      return this.htmlCache.get(url)!;
    }
    
    try {
      // Use curl fetcher with retry logic
      const html = await this.curlFetcher.fetchWithRetry(url, 3);
      
      if (!html) {
        throw new Error(`Failed to fetch ${url} after retries`);
      }
      
      // Store HTML immediately after fetching
      try {
        await this.htmlStorage.storeScrapedHTML({
          source: this.source,
          url,
          html,
          type,
          metadata: {
            scraper: this.name,
            timestamp: new Date().toISOString(),
            htmlLength: html.length,
            fetchMethod: 'curl'
          }
        });
      } catch (storageError) {
        console.error(`Failed to store HTML for ${url}:`, storageError);
      }
      
      // Cache for this session
      this.htmlCache.set(url, html);
      return html;
    } catch (error) {
      console.error(`Curl fetch failed for Classic.com:`, error);
      throw error;
    }
  }

  async scrapeDetail(url: string): Promise<ScrapedListing | null> {
    try {
      const html = await this.fetchUrl(url, 'detail');
      const $ = cheerio.load(html);
      
      // Get title from h1
      const title = $('h1').first().text().trim();
      
      // Extract year from title (e.g., "2012 Porsche 911 Carrera GTS")
      const year = this.extractYear(title);
      
      // Get price - look for the main price in text-xl font-medium
      let price: number | null = null;
      $('.text-xl.font-medium').each((i, el) => {
        const text = $(el).text().trim();
        const priceMatch = text.match(/^\$[\d,]+$/);
        if (priceMatch && !price) {
          price = this.extractPrice(text);
        }
      });
      
      // If no price found, check for any element with just a price
      if (!price) {
        $('*').each((i, el) => {
          const text = $(el).clone().children().remove().end().text().trim();
          const priceMatch = text.match(/^\$[\d,]+$/);
          if (priceMatch && !price) {
            const extractedPrice = this.extractPrice(text);
            // Classic.com shows many prices (market data), take a reasonable one
            if (extractedPrice && extractedPrice > 50000 && extractedPrice < 500000) {
              price = extractedPrice;
            }
          }
        });
      }
      
      // Extract VIN from page text
      const bodyText = $('body').text();
      const vinMatch = bodyText.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
      const vin = vinMatch ? vinMatch[1] : null;
      
      // Extract mileage
      const mileageMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi\b)/i);
      const mileage = mileageMatch ? this.extractMileage(mileageMatch[0]) : null;
      
      // Determine status
      const isSold = bodyText.includes('Sold for') || bodyText.includes('Sale Date');
      const isAuction = bodyText.includes('Current Bid') || bodyText.includes('Auction');
      const status = isSold ? 'sold' : (isAuction ? 'auction' : 'available');
      
      // Extract location if available
      const location = $(this.config.selectors.location).first().text().trim() || '';
      
      // Get images
      const images: string[] = [];
      $(this.config.selectors.images).each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !src.includes('placeholder') && images.length < 10) {
          images.push(src);
        }
      });
      
      return {
        url,
        title,
        price,
        vin,
        year,
        mileage,
        location,
        status,
        images,
        source: this.source,
        seller_type: 'dealer',
        description: '',
        scraped_at: new Date()
      };
    } catch (error) {
      console.error(`Error scraping Classic.com detail:`, error);
      return null;
    }
  }

  private extractPrice(text: string): number | null {
    // Remove non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const price = parseFloat(cleaned);
    
    if (isNaN(price) || price < 1000) {
      return null;
    }
    
    return Math.round(price);
  }

  private extractYear(text: string): number | null {
    // Look for 4-digit year (1900-2099)
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      return parseInt(yearMatch[0]);
    }
    return null;
  }

  private extractMileage(text: string): number | null {
    // Look for patterns like "12,345 miles", "12k miles"
    const patterns = [
      /(\\d{1,3}(?:,\\d{3})*)\\s*(?:miles?|mi\\b)/i,
      /(\\d+)k\\s*(?:miles?|mi\\b)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[1].includes('k')) {
          return parseInt(match[1]) * 1000;
        } else {
          return parseInt(match[1].replace(/,/g, ''));
        }
      }
    }
    
    // Simple extraction
    const simpleMatch = text.match(/(\d{1,3}(?:,\d{3})*)/);
    if (simpleMatch) {
      return parseInt(simpleMatch[1].replace(/,/g, ''));
    }
    
    return null;
  }
}