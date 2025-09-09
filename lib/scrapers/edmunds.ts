import { SharedScraper } from './shared-scraper';
import { CurlFetcher } from './curl-fetcher';
import { HTMLStorageService } from '@/lib/services/html-storage';

export class EdmundsScraper extends SharedScraper {
  private curlFetcher: CurlFetcher;
  private htmlStorage: HTMLStorageService;
  
  constructor() {
    super({
      name: 'Edmunds',
      source: 'edmunds',
      baseUrl: 'https://www.edmunds.com',
      searchPaths: [
        // GT MODELS - HIGH PRIORITY! Using correct format with inventorytype, radius, and year
        // GT4 RS (2022+)
        '/inventory/srp.html?inventorytype=used%2Ccpo%2Cnew&make=porsche&model=porsche%7C718-cayman&radius=6000&year=2022-*&keywords=GT4%20RS',
        // GT4 (2016+)
        '/inventory/srp.html?inventorytype=used%2Ccpo%2Cnew&make=porsche&model=porsche%7C718-cayman&radius=6000&year=2016-*&keywords=GT4',
        // GT3 RS (all years)
        '/inventory/srp.html?inventorytype=used%2Ccpo%2Cnew&make=porsche&model=porsche%7C911&radius=6000&keywords=GT3%20RS',
        // GT3 (all years)
        '/inventory/srp.html?inventorytype=used%2Ccpo%2Cnew&make=porsche&model=porsche%7C911&radius=6000&keywords=GT3',
        // GT2 RS
        '/inventory/srp.html?inventorytype=used%2Ccpo%2Cnew&make=porsche&model=porsche%7C911&radius=6000&keywords=GT2%20RS',
        
        // Regular sports cars - all years, nationwide (radius=6000)
        '/inventory/srp.html?inventorytype=used%2Ccpo%2Cnew&make=porsche&model=porsche%7C911&radius=6000',
        '/inventory/srp.html?inventorytype=used%2Ccpo%2Cnew&make=porsche&model=porsche%7C718-cayman&radius=6000',
        '/inventory/srp.html?inventorytype=used%2Ccpo%2Cnew&make=porsche&model=porsche%7C718-boxster&radius=6000',
        '/inventory/srp.html?inventorytype=used%2Ccpo%2Cnew&make=porsche&model=porsche%7Cboxster&radius=6000',
        '/inventory/srp.html?inventorytype=used%2Ccpo%2Cnew&make=porsche&model=porsche%7Ccayman&radius=6000',
      ],
      selectors: {
        listings: '.inventory-listing, .vehicle-card, a[href*="/inventory/"]',
        title: 'h1, .vehicle-title, .listing-title',
        price: '.price, .vehicle-price, .listing-price',
        vin: '.vin, [data-vin]',
        year: '.year, [data-year]',
        mileage: '.mileage, .vehicle-mileage',
        location: '.location, .dealer-location',
        status: '.status, .availability',
        images: '.gallery img, .vehicle-images img',
        description: '.description, .vehicle-description'
      },
      pagination: {
        type: 'page',
        param: 'pageNum'
      }
    });
    
    this.curlFetcher = new CurlFetcher();
    this.htmlStorage = new HTMLStorageService();
  }
  
  // Override fetchUrl to use curl instead of Bright Data
  protected async fetchUrl(url: string, type: 'search' | 'detail' = 'search'): Promise<string> {
    console.log(`Fetching Edmunds URL with curl: ${url}`);
    
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
      console.error(`Curl fetch failed for Edmunds:`, error);
      throw error;
    }
  }
}