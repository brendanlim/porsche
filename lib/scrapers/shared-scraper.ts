import * as cheerio from 'cheerio';
import { BaseScraper, ScraperResult, ScrapedListing } from './base';
import { BrightDataClient } from './bright-data';
import { HTMLStorageService } from '@/lib/services/html-storage';

export interface ScraperConfig {
  name: string;
  source: string;
  baseUrl: string;
  searchPaths?: string[];
  selectors: {
    listings: string;
    title: string;
    price: string;
    vin?: string;
    year?: string;
    mileage?: string;
    location?: string;
    status?: string;
    images?: string;
    description?: string;
  };
  pagination?: {
    type: 'page' | 'offset';
    param: string;
    increment?: number;
  };
}

export class SharedScraper extends BaseScraper {
  protected brightData: BrightDataClient | null = null;
  protected htmlStorage: HTMLStorageService;
  protected config: ScraperConfig;
  protected htmlCache: Map<string, string> = new Map(); // Cache HTML during scraping session

  constructor(config: ScraperConfig) {
    super();
    this.config = config;
    this.name = config.name;
    this.source = config.source;
    this.baseUrl = config.baseUrl;
    this.brightData = new BrightDataClient();
    this.htmlStorage = new HTMLStorageService();
  }

  protected async fetchUrl(url: string, type: 'search' | 'detail' = 'search'): Promise<string> {
    console.log(`Fetching ${this.name} URL: ${url}`);
    
    // Check session cache first
    if (this.htmlCache.has(url)) {
      console.log(`Using cached HTML for: ${url}`);
      return this.htmlCache.get(url)!;
    }
    
    if (this.brightData) {
      try {
        const html = await this.brightData.fetch(url);
        
        // GOLDEN RULE: Storage is cheap, scraping is not
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
              htmlLength: html.length
            }
          });
        } catch (storageError) {
          // Don't fail scraping if storage fails, but log it
          console.error(`Failed to store HTML for ${url}:`, storageError);
        }
        
        // Cache for this session
        this.htmlCache.set(url, html);
        return html;
      } catch (error) {
        console.log(`Bright Data failed for ${this.name}:`, error);
        throw error;
      }
    }
    
    throw new Error('No scraping method available');
  }

  protected buildSearchUrl(path: string, page: number): string {
    if (!this.config.pagination) {
      return `${this.baseUrl}${path}`;
    }

    const { type, param, increment = 30 } = this.config.pagination;
    
    if (type === 'offset') {
      const offset = (page - 1) * increment;
      return `${this.baseUrl}${path}?${param}=${offset}`;
    } else {
      return `${this.baseUrl}${path}?${param}=${page}`;
    }
  }

  async scrapeListings(params?: { 
    model?: string; 
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<ScraperResult[]> {
    const results: ScraperResult[] = [];
    const processedUrls = new Set<string>();
    const maxPages = params?.maxPages || 3;
    const onlySold = params?.onlySold !== false;
    
    try {
      await this.startIngestion();
      
      const searchPaths = this.config.searchPaths || [
        // Only sports cars - NO SUVs, NO SEDANS
        '/porsche/911',
        '/porsche/718-cayman',
        '/porsche/718-boxster',
        '/porsche/718-spyder'
      ];

      for (const searchPath of searchPaths.slice(0, 3)) {
        console.log(`Scraping ${this.name}: ${this.baseUrl}${searchPath}`);
        
        for (let page = 1; page <= maxPages; page++) {
          const url = this.buildSearchUrl(searchPath, page);
          
          try {
            const html = await this.fetchUrl(url, 'search');
            const $ = cheerio.load(html);
            
            const listings = $(this.config.selectors.listings).toArray();
            
            if (listings.length === 0) {
              console.log(`No listings found on ${this.name} page ${page}`);
              break;
            }
            
            const listingsToProcess = listings.slice(0, 10);
            console.log(`Processing ${listingsToProcess.length} of ${listings.length} ${this.name} listings`);
            
            for (const element of listingsToProcess) {
              const $card = $(element);
              
              let listingUrl: string | undefined;
              if ($card.is('a')) {
                listingUrl = $card.attr('href');
              } else {
                listingUrl = $card.find('a').first().attr('href');
              }
              
              if (!listingUrl) continue;
              
              const fullUrl = listingUrl.startsWith('http') 
                ? listingUrl 
                : `${this.baseUrl}${listingUrl}`;
              
              if (processedUrls.has(fullUrl)) continue;
              processedUrls.add(fullUrl);
              
              try {
                const detail = await this.scrapeDetail(fullUrl);
                if (detail) {
                  // CRITICAL: Skip auction listings
                  if (detail.status === 'auction') {
                    console.log(`SKIPPING AUCTION: ${detail.title} - Current bid: $${detail.price}`);
                    continue;
                  }
                  
                  // Validate prices for specific models
                  const isGT4RS = detail.title?.toLowerCase().includes('gt4') && 
                                  detail.title?.toLowerCase().includes('rs');
                  const isGT3RS = detail.title?.toLowerCase().includes('gt3') && 
                                  detail.title?.toLowerCase().includes('rs');
                  
                  // GT4 RS should be minimum $220k, GT3 RS minimum $300k
                  if (isGT4RS && detail.price && detail.price < 220000) {
                    console.log(`SUSPICIOUS GT4 RS PRICE: ${detail.title} - $${detail.price} - likely auction`);
                    continue;
                  }
                  if (isGT3RS && detail.price && detail.price < 300000) {
                    console.log(`SUSPICIOUS GT3 RS PRICE: ${detail.title} - $${detail.price} - likely auction`);
                    continue;
                  }
                  
                  if (!onlySold || detail.status === 'sold') {
                    if (detail.price && detail.price >= 15000 && detail.price < 2000000) {
                      results.push(detail);
                      await this.saveListing({
                        ...detail,
                        status: detail.status === 'sold' ? 'sold' : 'active'
                      });
                      
                      await this.updateIngestion({
                        total_fetched: results.length,
                        total_processed: results.length
                      });
                      
                      console.log(`Successfully scraped ${this.name}: ${detail.title} - $${detail.price} (${detail.status})`);
                    }
                  }
                }
              } catch (error) {
                console.error(`Failed to scrape ${this.name} detail:`, error);
                await this.updateIngestion({
                  total_errors: (this.ingestionRun?.total_errors || 0) + 1
                });
              }
              
              await this.delay(1000 + Math.random() * 500);
            }
          } catch (error) {
            console.error(`Failed to scrape ${this.name} page ${page}:`, error);
          }
        }
      }
      
      await this.completeIngestion();
      return results;
    } catch (error) {
      console.error(`${this.name} scraping failed:`, error);
      await this.updateIngestion({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async scrapeDetail(url: string): Promise<ScrapedListing | null> {
    try {
      const html = await this.fetchUrl(url, 'detail');
      const $ = cheerio.load(html);
      const selectors = this.config.selectors;
      
      const title = $(selectors.title).first().text().trim();
      const priceText = $(selectors.price).first().text().trim();
      const price = this.extractPrice(priceText);
      
      const vin = selectors.vin ? $(selectors.vin).first().text().trim() || 
                  $('[data-vin]').attr('data-vin') || null : null;
      
      const year = selectors.year ? 
        (parseInt($(selectors.year).first().text()) || this.extractYear(title)) :
        this.extractYear(title);
      
      const mileageText = selectors.mileage ? $(selectors.mileage).first().text().trim() : '';
      const mileage = this.extractMileage(mileageText);
      
      const location = selectors.location ? $(selectors.location).first().text().trim() : '';
      
      // Check for auction vs sold status
      const statusText = selectors.status ? $(selectors.status).text() : '';
      const pageText = $('body').text().toLowerCase();
      
      // Detect if this is an active auction
      const isAuction = pageText.includes('current bid') || 
                       pageText.includes('auction ends') || 
                       pageText.includes('bid now') ||
                       pageText.includes('place bid') ||
                       statusText.toLowerCase().includes('auction');
      
      const status = isAuction ? 'auction' : 
                    (statusText.toLowerCase().includes('sold') ? 'sold' : 'available');
      
      const images: string[] = [];
      if (selectors.images) {
        $(selectors.images).each((_, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src');
          if (src && !src.includes('placeholder')) {
            images.push(src);
          }
        });
      }
      
      const description = selectors.description ? 
        $(selectors.description).first().text().trim() : '';
      
      return {
        url,
        title,
        price,
        vin,
        year,
        mileage,
        location,
        status,
        images: images.slice(0, 10),
        source: this.source,
        seller_type: 'dealer',
        description,
        scraped_at: new Date()
      };
    } catch (error) {
      console.error(`Error scraping ${this.name} detail:`, error);
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
    
    // Handle cents (prices stored as dollars)
    if (price > 1000000000) {
      return Math.round(price / 100);
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
    // Look for patterns like "12,345 miles", "12k miles", "12,345-Mile"
    const patterns = [
      /(\d{1,3}(?:,\d{3})*)\s*(?:-?[Mm]ile|[Mm]iles)/,
      /(\d+)[Kk]\s*(?:-?[Mm]ile|[Mm]iles)/,
      /(\d+)[Kk]-[Mm]ile/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[1].includes('k') || match[1].includes('K')) {
          return parseInt(match[1]) * 1000;
        } else {
          return parseInt(match[1].replace(/,/g, ''));
        }
      }
    }
    
    // Try just finding a number with miles nearby
    const simpleMatch = text.match(/(\d{1,3}(?:,\d{3})*)/);
    if (simpleMatch && text.toLowerCase().includes('mile')) {
      return parseInt(simpleMatch[1].replace(/,/g, ''));
    }
    
    return null;
  }
}