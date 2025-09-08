import { BaseScraper, ScraperResult } from './base';
import * as cheerio from 'cheerio';
import { BrightDataClient } from './bright-data';
import { HTMLStorageService } from '@/lib/services/html-storage';

interface BaTModel {
  name: string;
  slug: string;
  trim?: string;
  searchUrl: string;
}

const BAT_MODELS: BaTModel[] = [
  // 911 Models
  { name: '911', slug: '911', trim: 'GT3 RS', searchUrl: 'https://bringatrailer.com/porsche/991-gt3-rs/' },
  { name: '911', slug: '911', trim: 'GT3 RS', searchUrl: 'https://bringatrailer.com/porsche/992-gt3-rs/' },
  { name: '911', slug: '911', trim: 'GT3', searchUrl: 'https://bringatrailer.com/porsche/991-gt3/' },
  { name: '911', slug: '911', trim: 'GT3', searchUrl: 'https://bringatrailer.com/porsche/992-gt3/' },
  { name: '911', slug: '911', trim: 'GT3', searchUrl: 'https://bringatrailer.com/porsche/997-gt3/' },
  { name: '911', slug: '911', trim: 'GT3', searchUrl: 'https://bringatrailer.com/porsche/996-gt3/' },
  { name: '911', slug: '911', trim: 'GT2 RS', searchUrl: 'https://bringatrailer.com/porsche/991-gt2-rs/' },
  { name: '911', slug: '911', trim: 'GT2 RS', searchUrl: 'https://bringatrailer.com/porsche/997-gt2-rs/' },
  { name: '911', slug: '911', trim: 'GT2', searchUrl: 'https://bringatrailer.com/porsche/996-gt2/' },
  { name: '911', slug: '911', trim: 'Turbo S', searchUrl: 'https://bringatrailer.com/porsche/992-turbo/' },
  { name: '911', slug: '911', trim: 'Turbo S', searchUrl: 'https://bringatrailer.com/porsche/991-turbo/' },
  { name: '911', slug: '911', trim: 'Turbo', searchUrl: 'https://bringatrailer.com/porsche/997-turbo/' },
  { name: '911', slug: '911', trim: 'Turbo', searchUrl: 'https://bringatrailer.com/porsche/996-turbo/' },
  { name: '911', slug: '911', trim: 'Carrera S', searchUrl: 'https://bringatrailer.com/porsche/992-911/' },
  { name: '911', slug: '911', trim: 'Carrera S', searchUrl: 'https://bringatrailer.com/porsche/991-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4S', searchUrl: 'https://bringatrailer.com/porsche/997-4s/' },
  { name: '911', slug: '911', trim: 'Targa', searchUrl: 'https://bringatrailer.com/porsche/991-targa/' },
  
  // 718 Cayman Models
  { name: '718 Cayman', slug: '718-cayman', trim: 'GT4 RS', searchUrl: 'https://bringatrailer.com/porsche/cayman-gt4-rs/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GT4', searchUrl: 'https://bringatrailer.com/porsche/cayman-gt4/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GTS 4.0', searchUrl: 'https://bringatrailer.com/porsche/982-cayman-gts/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GTS', searchUrl: 'https://bringatrailer.com/porsche/718-cayman-gts/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'S', searchUrl: 'https://bringatrailer.com/porsche/981-cayman-s/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'S', searchUrl: 'https://bringatrailer.com/porsche/718-cayman-s/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'Base', searchUrl: 'https://bringatrailer.com/porsche/718-cayman/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'Base', searchUrl: 'https://bringatrailer.com/porsche/981-cayman/' },
  
  // 718 Boxster Models
  { name: '718 Boxster', slug: '718-boxster', trim: 'Spyder RS', searchUrl: 'https://bringatrailer.com/porsche/boxster-spyder-rs/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'Spyder', searchUrl: 'https://bringatrailer.com/porsche/981-boxster-spyder/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'GTS 4.0', searchUrl: 'https://bringatrailer.com/porsche/982-boxster-gts/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'GTS', searchUrl: 'https://bringatrailer.com/porsche/718-boxster-gts/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'S', searchUrl: 'https://bringatrailer.com/porsche/718-boxster-s/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'Base', searchUrl: 'https://bringatrailer.com/porsche/718-boxster/' },
];

export class BaTScraperNew extends BaseScraper {
  private baseUrl = 'https://bringatrailer.com';
  private brightData?: BrightDataClient;
  private htmlStorage: HTMLStorageService;
  
  constructor() {
    super('bat');
    if (process.env.BRIGHT_DATA_API_KEY || process.env.BRIGHT_DATA_CUSTOMER_ID) {
      this.brightData = new BrightDataClient();
    }
    this.htmlStorage = new HTMLStorageService();
  }

  private async fetchUrl(url: string, type: 'search' | 'detail', model?: string, trim?: string): Promise<string> {
    if (!this.brightData) {
      throw new Error('Bright Data client not initialized. Check environment variables.');
    }
    
    console.log(`Fetching: ${url}`);
    const html = await this.brightData.fetch(url);
    
    // Store HTML
    try {
      await this.htmlStorage.storeScrapedHTML({
        source: 'bat',
        url,
        html,
        type,
        model,
        trim,
        metadata: {
          scraper: 'BaTScraperNew',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error(`Failed to store HTML: ${error}`);
    }
    
    return html;
  }

  async scrapeListings(params?: { 
    models?: string[]; 
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<ScraperResult[]> {
    const results: ScraperResult[] = [];
    const processedUrls = new Set<string>();
    const maxPages = params?.maxPages || 5;
    
    try {
      await this.startIngestion();
      
      console.log('\n🚀 Starting comprehensive BaT scraping with proper pagination...\n');
      
      // Process each model/trim combination
      for (const modelConfig of BAT_MODELS) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Scraping BaT: ${modelConfig.name} ${modelConfig.trim || ''}`);
        console.log('='.repeat(60));
        
        let currentPage = 1;
        let hasMorePages = true;
        let listingsOnModel = 0;
        
        // Paginate through search results
        while (hasMorePages && currentPage <= maxPages) {
          const pageUrl = currentPage === 1 
            ? modelConfig.searchUrl 
            : `${modelConfig.searchUrl}?page=${currentPage}`;
          
          console.log(`  Page ${currentPage}: ${pageUrl}`);
          
          try {
            const html = await this.fetchUrl(pageUrl, 'search', modelConfig.slug, modelConfig.trim);
            const $ = cheerio.load(html);
            
            // Find all listing links on the page
            const listingLinks: string[] = [];
            
            // BaT uses different selectors for listings
            $('.listing-card a.listing-link, .listings-grid a.listing-link, .auctions-item a').each((i, el) => {
              const href = $(el).attr('href');
              if (href && href.includes('/listing/')) {
                const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
                if (!processedUrls.has(fullUrl)) {
                  listingLinks.push(fullUrl);
                  processedUrls.add(fullUrl);
                }
              }
            });
            
            // Also check for embedded JSON (for extra data)
            let auctionData: any = null;
            $('script').each((i, el) => {
              const scriptContent = $(el).html() || '';
              if (scriptContent.includes('var auctionsCompletedInitialData')) {
                const match = scriptContent.match(/var auctionsCompletedInitialData = ({.*?});/s);
                if (match) {
                  try {
                    auctionData = JSON.parse(match[1]);
                    if (auctionData && auctionData.items) {
                      auctionData.items.forEach((item: any) => {
                        if (item.url) {
                          const fullUrl = item.url.startsWith('http') ? item.url : `${this.baseUrl}${item.url}`;
                          if (!processedUrls.has(fullUrl)) {
                            listingLinks.push(fullUrl);
                            processedUrls.add(fullUrl);
                          }
                        }
                      });
                    }
                  } catch (e) {
                    console.log('    Could not parse embedded JSON');
                  }
                }
              }
            });
            
            console.log(`  Found ${listingLinks.length} listings on page ${currentPage}`);
            
            // Process each listing
            for (const listingUrl of listingLinks) {
              console.log(`    Processing: ${listingUrl}`);
              
              try {
                const detail = await this.scrapeDetail(listingUrl, modelConfig.slug, modelConfig.trim);
                
                if (detail) {
                  // Only include sold listings if requested
                  if (!params?.onlySold || detail.status === 'sold') {
                    if (detail.price && detail.price > 15000) {
                      results.push(detail);
                      await this.saveListing(detail);
                      listingsOnModel++;
                      console.log(`    ✓ Saved: ${detail.title} - $${detail.price?.toLocaleString()} (${detail.status})`);
                    } else {
                      console.log(`    ✗ Skipped: Invalid price or non-vehicle`);
                    }
                  } else {
                    console.log(`    ✗ Skipped: Active auction`);
                  }
                }
                
                // Rate limit
                await this.delay(2000);
                
              } catch (error) {
                console.error(`    Error processing listing: ${error}`);
              }
            }
            
            // Check if there's a next page
            const nextPageLink = $('a.next-page, .pagination a:contains("Next"), a[rel="next"]').attr('href');
            hasMorePages = !!nextPageLink || listingLinks.length >= 20; // Assume more pages if we found 20+ listings
            
            if (!hasMorePages || listingLinks.length === 0) {
              console.log(`  No more listings found, stopping pagination for ${modelConfig.name} ${modelConfig.trim || ''}`);
            }
            
            currentPage++;
            
            // Update progress
            await this.updateIngestion({
              total_fetched: processedUrls.size,
              total_saved: results.length
            });
            
            // Rate limit between pages
            await this.delay(3000);
            
          } catch (error) {
            console.error(`  Error on page ${currentPage}: ${error}`);
            hasMorePages = false;
          }
        }
        
        console.log(`\n  Total for ${modelConfig.name} ${modelConfig.trim || ''}: ${listingsOnModel} listings`);
      }
      
      await this.completeIngestion();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`COMPLETED: Scraped ${results.length} listings from ${processedUrls.size} URLs`);
      console.log('='.repeat(60));
      
    } catch (error) {
      console.error('BaT scraping failed:', error);
      await this.completeIngestion('failed');
    }
    
    return results;
  }

  async scrapeDetail(url: string, model?: string, trim?: string): Promise<ScraperResult | null> {
    try {
      const html = await this.fetchUrl(url, 'detail', model, trim);
      const $ = cheerio.load(html);
      
      // Extract listing ID from URL
      const sourceId = url.split('/listing/')[1]?.split('/')[0]?.split('?')[0];
      
      // Extract title
      const title = $('h1.listing-title').text().trim() || 
                    $('h1').first().text().trim() ||
                    $('meta[property="og:title"]').attr('content') || '';
      
      // Extract year from title
      const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
      
      // Check if sold
      const pageText = $.html().toLowerCase();
      const isSold = this.checkIfSold($, pageText);
      
      // Extract price
      let price: number | undefined;
      if (isSold) {
        price = this.extractSoldPrice($, pageText);
      } else {
        // For active auctions, get current bid
        const bidText = $('.current-bid, .bid-value, [class*="current-bid"]').text();
        const bidMatch = bidText.match(/[\d,]+/);
        if (bidMatch) {
          price = parseInt(bidMatch[0].replace(/,/g, ''));
        }
      }
      
      // Extract VIN
      const vin = this.extractVIN($);
      
      // Extract mileage
      const mileage = this.extractMileage($);
      
      // Extract location
      const location = this.extractLocation($);
      
      // Extract colors
      const exteriorColor = this.extractExteriorColor($);
      const interiorColor = this.extractInteriorColor($);
      
      // Extract transmission
      const transmission = this.extractTransmission($, title);
      
      // Extract sold date if sold
      const soldDate = isSold ? this.extractSoldDate($, pageText) : undefined;
      
      return {
        vin,
        title,
        price,
        mileage,
        year,
        model,
        trim,
        status: isSold ? 'sold' : 'active',
        exterior_color: exteriorColor,
        interior_color: interiorColor,
        transmission,
        location,
        source_url: url,
        source_id: sourceId,
        sold_date: soldDate,
        html
      } as ScraperResult;
      
    } catch (error) {
      console.error(`Failed to scrape detail for ${url}:`, error);
      return null;
    }
  }

  private checkIfSold($: cheerio.CheerioAPI, pageText: string): boolean {
    const lowerText = pageText.toLowerCase();
    
    // Check for sold indicators
    if (lowerText.includes('sold for') && (lowerText.includes('$') || lowerText.includes('usd'))) {
      return true;
    }
    
    if (lowerText.includes('auction ended') || lowerText.includes('listing ended')) {
      return true;
    }
    
    if (lowerText.includes('winning bid') || lowerText.includes('sold on')) {
      return true;
    }
    
    // Check for active indicators
    if (lowerText.includes('current bid') || lowerText.includes('place bid')) {
      return false;
    }
    
    if (lowerText.includes('ending soon') || lowerText.includes('time left')) {
      return false;
    }
    
    return false;
  }

  private extractSoldPrice($: cheerio.CheerioAPI, pageText: string): number | undefined {
    // Look for "Sold for $XXX,XXX" pattern
    const soldForMatch = pageText.match(/sold\s+for\s+\$?([\d,]+)/i);
    if (soldForMatch) {
      const price = parseInt(soldForMatch[1].replace(/,/g, ''));
      if (!isNaN(price) && price > 1000) {
        return price;
      }
    }
    
    // Check structured data
    const soldForElement = $('.sold-for, .final-price, [class*="sold-price"]').text();
    if (soldForElement) {
      const priceMatch = soldForElement.match(/[\d,]+/);
      if (priceMatch) {
        const price = parseInt(priceMatch[0].replace(/,/g, ''));
        if (!isNaN(price) && price > 1000) {
          return price;
        }
      }
    }
    
    return undefined;
  }

  private extractVIN($: cheerio.CheerioAPI): string | undefined {
    const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/;
    
    // Check common locations
    const vinLocations = [
      $('.essentials-item:contains("VIN")').text(),
      $('dt:contains("VIN")').next('dd').text(),
      $('[class*="vin"]').text()
    ];
    
    for (const location of vinLocations) {
      const match = location.match(vinPattern);
      if (match) {
        return match[0].toUpperCase();
      }
    }
    
    return undefined;
  }

  private extractMileage($: cheerio.CheerioAPI): number | undefined {
    const mileageLocations = [
      $('.essentials-item:contains("Mileage")').text(),
      $('dt:contains("Mileage")').next('dd').text(),
      $('[class*="mileage"]').text()
    ];
    
    for (const location of mileageLocations) {
      const match = location.match(/[\d,]+/);
      if (match) {
        const mileage = parseInt(match[0].replace(/,/g, ''));
        if (!isNaN(mileage) && mileage > 0 && mileage < 500000) {
          return mileage;
        }
      }
    }
    
    return undefined;
  }

  private extractLocation($: cheerio.CheerioAPI): { city?: string; state?: string } | undefined {
    const locationText = $('.essentials-item:contains("Location")').text() ||
                        $('dt:contains("Location")').next('dd').text() ||
                        $('[class*="location"]').text();
    
    if (locationText) {
      const match = locationText.match(/([^,]+),\s*([A-Z]{2})/);
      if (match) {
        return {
          city: match[1].trim(),
          state: match[2].trim()
        };
      }
    }
    
    return undefined;
  }

  private extractExteriorColor($: cheerio.CheerioAPI): string | undefined {
    const colorText = $('.essentials-item:contains("Exterior Color")').text() ||
                     $('dt:contains("Exterior")').next('dd').text() ||
                     $('[class*="exterior-color"]').text();
    
    const match = colorText.match(/:\s*(.+)/);
    return match ? match[1].trim() : undefined;
  }

  private extractInteriorColor($: cheerio.CheerioAPI): string | undefined {
    const colorText = $('.essentials-item:contains("Interior Color")').text() ||
                     $('dt:contains("Interior")').next('dd').text() ||
                     $('[class*="interior-color"]').text();
    
    const match = colorText.match(/:\s*(.+)/);
    return match ? match[1].trim() : undefined;
  }

  private extractTransmission($: cheerio.CheerioAPI, title: string): 'Manual' | 'PDK' | undefined {
    const fullText = (title + ' ' + $('body').text()).toLowerCase();
    
    if (fullText.includes('pdk') || fullText.includes('tiptronic') || fullText.includes('automatic')) {
      return 'PDK';
    }
    
    if (fullText.includes('manual') || fullText.includes('6-speed') || fullText.includes('7-speed')) {
      return 'Manual';
    }
    
    return undefined;
  }

  private extractSoldDate($: cheerio.CheerioAPI, pageText: string): Date | undefined {
    const patterns = [
      /ended[:\s]*([\w\s]+\d{1,2},?\s*\d{4})/i,
      /sold on[:\s]*([\w\s]+\d{1,2},?\s*\d{4})/i,
      /auction ended[:\s]*([\w\s]+\d{1,2},?\s*\d{4})/i
    ];
    
    for (const pattern of patterns) {
      const match = pageText.match(pattern);
      if (match) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return undefined;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}