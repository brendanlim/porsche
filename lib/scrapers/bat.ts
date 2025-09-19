import { BaseScraper, ScraperResult } from './base';
import * as cheerio from 'cheerio';
import { BrightDataClient } from './bright-data';
import { HTMLStorageService } from '@/lib/services/html-storage';

// Define all Porsche models and trims we want to track
const PORSCHE_MODELS = {
  '911': {
    trims: ['GT3 RS', 'GT3', 'GT2 RS', 'GT2', 'Turbo S', 'Turbo', 'S/T', 'Sport Classic', 
            'Speedster', 'R', 'GTS', 'Carrera 4S', 'Carrera S', 'Carrera', 'Targa'],
    generations: ['992.2', '992.1', '991.2', '991.1', '997.2', '997.1', '996']
  },
  '718': {
    trims: ['Cayman GT4 RS', 'Cayman GT4', 'Spyder RS', 'Spyder', 'Cayman GTS 4.0', 
            'Boxster GTS 4.0', 'Cayman GTS', 'Boxster GTS', 'Cayman S', 'Boxster S', 
            'Cayman', 'Boxster'],
    generations: ['982', '981', '987.2', '987.1']
  }
};

export class BaTScraper extends BaseScraper {
  private baseUrl = 'https://bringatrailer.com';
  private brightData?: BrightDataClient;
  private htmlStorage: HTMLStorageService;
  private sessionCache: Map<string, string> = new Map();
  
  constructor() {
    super('bat');
    if (process.env.BRIGHT_DATA_API_KEY || process.env.BRIGHT_DATA_CUSTOMER_ID) {
      this.brightData = new BrightDataClient();
    }
    this.htmlStorage = new HTMLStorageService();
  }

  /**
   * Fetch URL using Bright Data proxy - GOLDEN RULE: Storage is cheap, scraping is not
   */
  private async fetchUrl(url: string, type: 'search' | 'detail', model?: string, trim?: string): Promise<string> {
    // Check session cache first
    if (this.sessionCache.has(url)) {
      console.log(`Using session cache for: ${url}`);
      return this.sessionCache.get(url)!;
    }
    
    if (!this.brightData) {
      throw new Error('Bright Data client not initialized. Check environment variables.');
    }
    
    console.log(`Fetching via Bright Data: ${url}`);
    const html = await this.brightData.fetch(url);
    
    // Store HTML with proper organization
    try {
      await this.htmlStorage.storeScrapedHTML({
        source: 'bat',
        url,
        html,
        type,
        model,
        trim,
        metadata: {
          scraper: 'BaTScraper',
          timestamp: new Date().toISOString(),
          htmlLength: html.length
        }
      });
      console.log(`Stored ${type} HTML: source=bat, model=${model}, trim=${trim}`);
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
    const processedUrls = new Set<string>();  // For tracking duplicates in JSON
    const fetchedDetailUrls = new Set<string>();  // For tracking which detail pages we've fetched
    const allSoldListings: any[] = [];
    
    try {
      await this.startIngestion();
      
      // Fetch multiple pages to get more listings
      const searches = [];
      const maxPages = params?.maxPages || 5; // Default to 5 pages
      
      // Add pagination - BaT uses /page/N/ format
      for (let page = 1; page <= maxPages; page++) {
        const pageUrl = page === 1 
          ? 'https://bringatrailer.com/porsche/'
          : `https://bringatrailer.com/porsche/page/${page}/`;
        
        searches.push({
          url: pageUrl,
          model: 'all',
          trim: 'all',
          filterTerms: [],
          page: page
        });
      }
      
      console.log('🚀 Extracting BaT sold listings from embedded JSON...\n');
      
      // Step 1: Extract all sold listings from search pages
      for (const search of searches) {
        console.log(`\n📄 Fetching Page ${search.page}: ${search.url}`);
        
        // Check if we should stop pagination (if we're seeing mostly duplicates)
        const duplicateThreshold = 0.8; // Stop if 80% are duplicates
        let pageNewCount = 0;
        let pageDupeCount = 0;
        
        try {
          const model = search.model;
          const trim = search.trim;
          
          const html = await this.fetchUrl(search.url, 'search', model, trim);
          const $ = cheerio.load(html);
          
          // Extract embedded JSON data with auction results
          let auctionData: any = null;
          
          $('script').each((i, el) => {
            const scriptContent = $(el).html() || '';
            
            // Look for the auctionsCompletedInitialData variable
            if (scriptContent.includes('var auctionsCompletedInitialData')) {
              const match = scriptContent.match(/var auctionsCompletedInitialData = ({.*?});/s);
              if (match) {
                try {
                  auctionData = JSON.parse(match[1]);
                } catch (e) {
                  console.error('  ❌ Failed to parse JSON:', e);
                }
              }
            }
          });
          
          if (auctionData && auctionData.items) {
            const items = auctionData.items;
            console.log(`  ✅ Found ${items.length} auction results`);
            
            // Process each sold listing with smart filtering
            items.forEach((item: any) => {
              // Only process if it has a sold_text (indicates it's sold)
              if (item.sold_text && item.url) {
                const titleLower = (item.title || '').toLowerCase();
                
                // Skip SUVs and sedans - SPORTS CARS ONLY!
                const isSUV = titleLower.includes('cayenne') || titleLower.includes('macan');
                const isSedan = titleLower.includes('panamera') || titleLower.includes('taycan');
                const isPartsOnly = titleLower.includes('wheel') || titleLower.includes('seat') || 
                                    titleLower.includes('tool') || titleLower.includes('part') ||
                                    titleLower.includes('kit') || !titleLower.includes('porsche');
                
                // Must be a Porsche sports car
                const isSportsCar = (titleLower.includes('911') || titleLower.includes('cayman') || 
                                     titleLower.includes('boxster') || titleLower.includes('718') ||
                                     titleLower.includes('gt3') || titleLower.includes('gt2') ||
                                     titleLower.includes('turbo') || titleLower.includes('carrera') ||
                                     titleLower.includes('targa') || titleLower.includes('speedster')) &&
                                    !isSUV && !isSedan && !isPartsOnly;
                
                if (isSportsCar) {
                  const priceMatch = item.sold_text.match(/\$([0-9,]+)/);
                  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : item.current_bid;
                  
                  // Only include if price is reasonable (not parts/accessories)
                  if (price > 15000) {
                    // Extract actual model and trim from title
                    let actualModel = '911'; // Default to 911
                    let actualTrim = 'Carrera'; // Default trim
                    
                    // Refine model detection from title
                    if (titleLower.includes('cayman') || titleLower.includes('718 cayman')) {
                      actualModel = '718';
                      if (titleLower.includes('gt4 rs')) actualTrim = 'GT4 RS';
                      else if (titleLower.includes('gt4')) actualTrim = 'GT4';
                      else if (titleLower.includes('gts 4.0')) actualTrim = 'GTS 4.0';
                      else if (titleLower.includes('gts')) actualTrim = 'GTS';
                      else if (titleLower.includes(' s ') || titleLower.includes(' s,')) actualTrim = 'S';
                      else actualTrim = 'Cayman';
                    } else if (titleLower.includes('boxster') || titleLower.includes('718 boxster')) {
                      actualModel = '718';
                      if (titleLower.includes('spyder rs')) actualTrim = 'Spyder RS';
                      else if (titleLower.includes('spyder')) actualTrim = 'Spyder';
                      else if (titleLower.includes('gts 4.0')) actualTrim = 'GTS 4.0';
                      else if (titleLower.includes('gts')) actualTrim = 'GTS';
                      else if (titleLower.includes(' s ') || titleLower.includes(' s,')) actualTrim = 'S';
                      else actualTrim = 'Boxster';
                    } else if (titleLower.includes('911') || titleLower.includes('gt3') || titleLower.includes('gt2') || titleLower.includes('turbo')) {
                      actualModel = '911';
                      if (titleLower.includes('gt3 rs')) actualTrim = 'GT3 RS';
                      else if (titleLower.includes('gt3 touring')) actualTrim = 'GT3 Touring';
                      else if (titleLower.includes('gt3')) actualTrim = 'GT3';
                      else if (titleLower.includes('gt2 rs')) actualTrim = 'GT2 RS';
                      else if (titleLower.includes('gt2')) actualTrim = 'GT2';
                      else if (titleLower.includes('turbo s')) actualTrim = 'Turbo S';
                      else if (titleLower.includes('turbo')) actualTrim = 'Turbo';
                      else if (titleLower.includes('gts')) actualTrim = 'GTS';
                      else if (titleLower.includes('carrera 4s')) actualTrim = 'Carrera 4S';
                      else if (titleLower.includes('carrera s')) actualTrim = 'Carrera S';
                      else if (titleLower.includes('carrera 4')) actualTrim = 'Carrera 4';
                      else if (titleLower.includes('carrera')) actualTrim = 'Carrera';
                      else if (titleLower.includes('targa 4s')) actualTrim = 'Targa 4S';
                      else if (titleLower.includes('targa')) actualTrim = 'Targa';
                      else if (titleLower.includes('s/t')) actualTrim = 'S/T';
                      else if (titleLower.includes('speedster')) actualTrim = 'Speedster';
                      else if (titleLower.includes('sport classic')) actualTrim = 'Sport Classic';
                      else if (titleLower.includes('dakar')) actualTrim = 'Dakar';
                      else if (titleLower.includes('\br\b')) actualTrim = 'R';
                      else if (titleLower.includes('sc ') || titleLower.includes('911sc')) actualTrim = 'SC';
                    }
                    
                    // Check if we've seen this listing before
                    const listingUrl = item.url.startsWith('http') ? item.url : `${this.baseUrl}${item.url}`;
                    
                    if (processedUrls.has(listingUrl)) {
                      pageDupeCount++;
                      console.log(`    • [DUP] ${item.title}: $${price.toLocaleString()}`);
                    } else {
                      pageNewCount++;
                      processedUrls.add(listingUrl);
                      
                      allSoldListings.push({
                        url: item.url,
                        title: item.title,
                        price: price,
                        sold_text: item.sold_text,
                        year: item.year,
                        id: item.id,
                        model: actualModel,
                        trim: actualTrim
                      });
                      
                      console.log(`    • [NEW] ${item.title}: $${price.toLocaleString()} [${actualModel} ${actualTrim}]`);
                    }
                  }
                }
              }
            });
          } else {
            console.log('  ⚠️ No auction data found in script tags');
          }
          
          // Check if we should stop pagination
          if (pageNewCount > 0 || pageDupeCount > 0) {
            const dupeRatio = pageDupeCount / (pageNewCount + pageDupeCount);
            console.log(`  📊 Page ${search.page} stats: ${pageNewCount} new, ${pageDupeCount} duplicates (${Math.round(dupeRatio * 100)}% dupes)`);
            
            // Stop if this page was mostly duplicates
            if (dupeRatio >= duplicateThreshold && search.page > 1) {
              console.log(`  🛑 Stopping pagination - too many duplicates`);
              break;
            }
          }
          
          // Rate limit
          await this.delay(2000);
          
        } catch (error) {
          console.error(`  ❌ Error: ${error}`);
        }
      }
      
      console.log(`\n\n✅ Total sold listings found: ${allSoldListings.length}`);
      
      // Step 2: Fetch detail pages for all sold listings
      if (allSoldListings.length > 0) {
        console.log('\n📥 Fetching detail pages...\n');
        console.log(`Processing ${allSoldListings.length} listings...`);
        
        for (const listing of allSoldListings) {
          const fullUrl = listing.url.startsWith('http') ? listing.url : `${this.baseUrl}${listing.url}`;
          
          if (fetchedDetailUrls.has(fullUrl)) {
            continue;
          }
          fetchedDetailUrls.add(fullUrl);
          
          console.log(`Fetching: ${fullUrl}`);
          
          try {
            const detail = await this.scrapeDetail(fullUrl, listing.model, listing.trim);
            
            if (detail && detail.status === 'sold' && detail.price > 15000) {
              results.push(detail);
              await this.saveListing(detail);
              console.log(`  ✓ Saved: ${detail.title} - $${detail.price.toLocaleString()}`);
            }
            
            // Update progress
            await this.updateIngestion({
              total_fetched: processedUrls.size,
              total_processed: results.length
            });
            
            await this.delay(2000);
          } catch (error) {
            console.error(`  ❌ Error: ${error}`);
          }
        }
      }
      
      await this.completeIngestion();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`COMPLETED: Scraped ${results.length} sold listings`);
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
      
      // Extract title and basic info
      const title = $('h1.listing-title').text().trim() || 
                    $('h1').first().text().trim() ||
                    $('meta[property="og:title"]').attr('content') || '';
      
      // Extract year from title
      const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
      
      // Determine if this is a SOLD listing or active auction
      const pageText = $.html().toLowerCase();
      const isSold = this.checkIfSold($, pageText);
      
      if (!isSold) {
        console.log('    Skipping active auction (not sold yet)');
        return null; // Skip active auctions entirely
      }
      
      // Extract sold price
      const price = this.extractSoldPrice($, pageText);
      if (!price || price < 15000) {
        console.log(`    Invalid price detected: $${price} for ${title}`);
        return null;
      }
      
      // Extract sold date (with validation)
      const soldDate = this.extractSoldDate($, pageText);
      
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
      
      // Extract options
      const optionsText = this.extractOptions($);
      
      // Determine generation if not already known
      const generation = this.determineGeneration(model || '', year);
      
      return {
        vin,
        title,
        price,
        mileage,
        year,
        model,
        trim,
        generation,
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

  private checkIfSold($: cheerio.CheerioAPI, pageText: string): boolean {
    // Convert to lowercase for case-insensitive matching
    const lowerText = pageText.toLowerCase();
    
    // FIRST CHECK: If it says "Sold for" with a dollar amount, it's SOLD!
    if (lowerText.includes('sold for') && (lowerText.includes('$') || lowerText.includes('usd'))) {
      console.log('    SOLD indicators found');
      return true;
    }
    
    // SECOND CHECK: Active auction indicators
    // Look for bid elements (Cheerio doesn't support :visible)
    const activeIndicators = [
      $('.bid-button').length > 0,
      $('.place-bid').length > 0,
      $('.auction-timer').length > 0,
      $('#countdown').length > 0,
      $('[data-test="place-bid-button"]').length > 0,
      $('.time-remaining').length > 0
    ];
    
    const hasActive = activeIndicators.some(i => i);
    
    // If we find active indicators, it's NOT sold (active auction)
    if (hasActive) {
      console.log('    ACTIVE auction detected (NOT SOLD)');
      return false;
    }
    
    // Only check for sold indicators if no active indicators found
    const soldIndicators = [
      lowerText.includes('sold for $'),
      lowerText.includes('sold for usd'),
      // Only check "winning bid" if it's near a price
      /winning bid[:\s]*(?:usd\s*)?\$[\d,]+/i.test(pageText),
      lowerText.includes('sold on'),
      lowerText.includes('auction ended'),
      $('.sold-for').length > 0,
      $('.sold-section').length > 0,
      $('.listing-stats-value:contains("Sold")').length > 0
    ];
    
    const hasSold = soldIndicators.some(i => i);
    
    if (hasSold) {
      console.log('    SOLD indicators found');
      return true;
    }
    
    // Default to not sold if unclear
    console.log('    Status unclear, treating as NOT SOLD');
    return false;
  }

  private extractSoldPrice($: cheerio.CheerioAPI, pageText: string): number | null {
    // First try the most reliable source: .listing-available-info
    const listingInfo = $('.listing-available-info').text();
    if (listingInfo) {
      // Extract price from "Sold for USD $120,000" format
      const match = listingInfo.match(/\$?([\d,]+)/);
      if (match) {
        const price = parseInt(match[1].replace(/,/g, ''));
        if (!isNaN(price) && price > 1000) { // Min $1000 to avoid bad matches
          console.log(`    Extracted price from listing-available-info: $${price.toLocaleString()}`);
          return price;
        }
      }
    }
    
    // Try multiple patterns in page text as fallback
    const patterns = [
      /sold for[:\s]*(?:USD\s*)?\$?([\d,]+)/i,
      /winning bid[:\s]*\$?([\d,]+)/i,
      /final price[:\s]*\$?([\d,]+)/i,
      /\$?([\d,]+)[^\d]*sold/i
    ];
    
    for (const pattern of patterns) {
      const match = pageText.match(pattern);
      if (match) {
        const price = parseInt(match[1].replace(/,/g, ''));
        if (!isNaN(price) && price > 1000) {
          console.log(`    Extracted price from pattern: $${price.toLocaleString()}`);
          return price;
        }
      }
    }
    
    // Try other structured data selectors
    const soldForElement = $('.sold-for, .final-price, [class*="sold-price"]').text();
    if (soldForElement) {
      const priceMatch = soldForElement.match(/[\d,]+/);
      if (priceMatch) {
        const price = parseInt(priceMatch[0].replace(/,/g, ''));
        if (!isNaN(price) && price > 1000) {
          console.log(`    Extracted price from element: $${price.toLocaleString()}`);
          return price;
        }
      }
    }
    
    console.log('    WARNING: Could not extract sold price');
    return null;
  }

  private extractSoldDate($: cheerio.CheerioAPI, pageText: string): Date | undefined {
    // Date validation - BaT started around 2007
    // Note: Don't validate against "current" date as AI models may have incorrect dates
    const minValidDate = new Date(2010, 0, 1); // BaT started around 2007, but most sales after 2010
    const maxValidDate = new Date(2030, 0, 1); // Allow dates up to 2030 to be safe

    // Helper to parse date with 2-digit year handling
    const parseDate = (dateStr: string): Date | null => {
      // First try normal parsing
      let date = new Date(dateStr);

      // Check for 2-digit year pattern (MM/DD/YY or M/D/YY)
      const twoDigitYearMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
      if (twoDigitYearMatch) {
        const month = parseInt(twoDigitYearMatch[1]) - 1; // JS months are 0-indexed
        const day = parseInt(twoDigitYearMatch[2]);
        let year = parseInt(twoDigitYearMatch[3]);

        // Convert 2-digit year to 4-digit
        // For BaT context: sales started ~2007
        // If year would be in future, subtract 100
        if (year <= 29) {
          year = 2000 + year;
        } else {
          year = 1900 + year;
        }

        // No need to adjust for "future" dates - just validate reasonableness

        date = new Date(year, month, day);
      }

      return date;
    };

    // Helper to validate date - just check it's reasonable
    const isValidSoldDate = (date: Date): boolean => {
      return !isNaN(date.getTime()) &&
             date <= maxValidDate &&
             date >= minValidDate &&
             date.getFullYear() >= 2007 && // BaT started ~2007
             date.getFullYear() <= 2029;    // Reasonable upper bound
    };

    // First try to extract from specific BaT elements
    // BaT shows "Sold for $XXX on Month Day, Year" or "Sold for USD $XXX on M/D/YY"
    const soldInfo = $('.listing-available-info').text();

    // Try different date patterns
    const datePatterns = [
      /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,  // on M/D/YY or MM/DD/YYYY
      /on\s+([\w\s]+\d{1,2},?\s*\d{4})/i,   // on Month Day, Year
      /on\s+([\w\s]+\d{1,2},?\s*\d{2})(?!\d)/i  // on Month Day, YY
    ];

    for (const pattern of datePatterns) {
      const match = soldInfo.match(pattern);
      if (match) {
        const date = parseDate(match[1]);
        if (date && isValidSoldDate(date)) {
          console.log(`    Extracted sold date: ${date.toLocaleDateString()}`);
          return date;
        } else if (date) {
          console.log(`    ⚠️ Invalid date found: ${match[1]} -> ${date?.toLocaleDateString()} (rejected)`);
        }
      }
    }

    // Try to find in the auction status area
    const auctionStatus = $('.auction-status').text();
    const statusPatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /([\w\s]+\d{1,2},?\s*\d{4})/i,
      /([\w\s]+\d{1,2},?\s*\d{2})(?!\d)/i
    ];

    for (const pattern of statusPatterns) {
      const match = auctionStatus.match(pattern);
      if (match) {
        const date = parseDate(match[1]);
        if (date && isValidSoldDate(date)) {
          console.log(`    Extracted sold date from status: ${date.toLocaleDateString()}`);
          return date;
        }
      }
    }

    // Try meta tags
    const metaEndDate = $('meta[property="auction:end_date"]').attr('content') ||
                       $('meta[name="auction:end_date"]').attr('content');
    if (metaEndDate) {
      const date = new Date(metaEndDate);
      if (isValidSoldDate(date)) {
        console.log(`    Extracted sold date from meta: ${date.toLocaleDateString()}`);
        return date;
      }
    }

    // Fallback to text patterns
    const patterns = [
      /sold\s+for\s+(?:USD\s+)?\$[\d,]+\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,  // Sold for $X on M/D/YY
      /sold\s+for\s+\$[\d,]+\s+on\s+([\w\s]+\d{1,2},?\s*\d{4})/i,
      /ended[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /ended[:\s]*([\w\s]+\d{1,2},?\s*\d{4})/i,
      /sold on[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /sold on[:\s]*([\w\s]+\d{1,2},?\s*\d{4})/i,
      /auction ended[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /auction ended[:\s]*([\w\s]+\d{1,2},?\s*\d{4})/i,
      /ending\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /ending\s+([\w\s]+\d{1,2},?\s*\d{4})/i,
      /closed[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /closed[:\s]*([\w\s]+\d{1,2},?\s*\d{4})/i
    ];

    for (const pattern of patterns) {
      const match = pageText.match(pattern);
      if (match) {
        const date = parseDate(match[1]);
        if (date && isValidSoldDate(date)) {
          console.log(`    Extracted sold date from pattern: ${date.toLocaleDateString()}`);
          return date;
        }
      }
    }

    console.log(`    ⚠️ No valid sold date found`);
    
    return undefined;
  }

  private extractVIN($: cheerio.CheerioAPI): string | undefined {
    // Look for VIN in BaT Essentials list items
    let vin: string | undefined;
    
    // Check list items for "Chassis: [VIN]"
    $('ul li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('Chassis:')) {
        // Porsche VINs start with WP0 or WP1
        const match = text.match(/WP[01][A-Z0-9]{14}/);
        if (match) {
          vin = match[0];
          return false; // Break the loop
        }
      }
    });
    
    if (vin) return vin;
    
    // Fallback: Look for Porsche VIN pattern in body
    const bodyText = $('body').text();
    const vinMatch = bodyText.match(/WP[01][A-Z0-9]{14}/);
    if (vinMatch) {
      return vinMatch[0];
    }
    
    return undefined;
  }

  private extractMileage($: cheerio.CheerioAPI): number | undefined {
    // First try structured elements
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
    
    // Fall back to text pattern matching
    const bodyText = $('body').text();
    
    // Pattern 1: Look for "XX,XXX miles" or "XX,XXX-Mile"
    const pattern1 = /(\d{1,3}(?:,\d{3})*)\s*(?:-?[Mm]ile|[Mm]iles)/g;
    const matches1 = bodyText.match(pattern1);
    if (matches1) {
      for (const match of matches1) {
        const numMatch = match.match(/(\d{1,3}(?:,\d{3})*)/);
        if (numMatch) {
          const mileage = parseInt(numMatch[1].replace(/,/g, ''));
          // Filter out unrealistic values (too low or too high)
          if (mileage >= 5 && mileage < 500000) {
            return mileage;
          }
        }
      }
    }
    
    // Pattern 2: Look for "XXk miles"
    const pattern2 = /(\d+)[Kk]\s*(?:-?[Mm]ile|[Mm]iles)/g;
    const matches2 = bodyText.match(pattern2);
    if (matches2) {
      for (const match of matches2) {
        const numMatch = match.match(/(\d+)/);
        if (numMatch) {
          const mileage = parseInt(numMatch[1]) * 1000;
          if (mileage >= 1000 && mileage < 500000) {
            return mileage;
          }
        }
      }
    }
    
    return undefined;
  }

  private extractLocation($: cheerio.CheerioAPI): { city?: string; state?: string; zip?: string } | undefined {
    // Look for location in BaT Essentials list items
    let location: { city?: string; state?: string; zip?: string } | undefined;
    
    // Check list items for "Location: City, State ZIP"
    $('ul li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('Location:')) {
        // Pattern: "Location: Palo Alto, California 94306"
        const match = text.match(/Location:\s*([^,]+),\s*([A-Za-z\s]+?)\s*(\d{5})?$/);
        if (match) {
          location = {
            city: match[1].trim(),
            state: match[2].trim(),
            zip: match[3] || undefined
          };
          return false; // Break the loop
        }
      }
    });
    
    if (location) return location;
    
    // Fallback to other selectors
    const locationText = $('.seller-location').text() ||
                        $('.essentials-item:contains("Location")').text() ||
                        $('dt:contains("Location")').next('dd').text() ||
                        $('[class*="location"]').text();
    
    if (locationText) {
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
    // First try structured elements in BaT Essentials
    const colorText = $('.essentials-item:contains("Exterior Color")').text() ||
                     $('dt:contains("Exterior")').next('dd').text() ||
                     $('.essentials-item:contains("Color")').text();
    
    if (colorText) {
      const color = colorText.replace(/.*:/, '').trim();
      if (color) return color;
    }
    
    // Look in the BaT Essentials list for Paint items
    let paintColor: string | undefined;
    $('ul li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('Paint-To-Sample') || text.includes('Paint')) {
        // Extract color from "Paint-To-Sample Mint Green Paint" 
        const match = text.match(/Paint-To-Sample\s+([\w\s]+?)(?:\s+Paint)?$/i) ||
                     text.match(/([\w\s]+?)\s+(?:Metallic\s+)?Paint$/i);
        if (match) {
          paintColor = match[1].trim();
          return false;
        }
      }
    });
    
    if (paintColor) return paintColor;
    
    // Try to extract from description (first 2 paragraphs)
    const description = $('.post-excerpt').text() || 
                       $('.listing-text').text() || 
                       $('p').first().text() + ' ' + $('p').eq(1).text();
    
    // Pattern: "finished in [color] over [interior]"
    const finishedPattern = /(?:finished|painted)\s+in\s+([\w\s]+?)(?:\s+\([A-Z0-9]+\))?\s*(?:over|with|\.|,|and)/i;
    const finishedMatch = description.match(finishedPattern);
    if (finishedMatch) {
      let color = finishedMatch[1].trim();
      // Remove "paint-to-sample" prefix if present
      color = color.replace(/^paint-to-sample\s+/i, '');
      // Don't return generic words
      if (!['the', 'a', 'this'].includes(color.toLowerCase())) {
        return color;
      }
    }
    
    // Pattern: "[Color] Metallic" or "[Color] over"
    const overPattern = /([\w\s]+?(?:\s+Metallic)?)\s+over\s+/i;
    const overMatch = description.match(overPattern);
    if (overMatch) {
      const color = overMatch[1].trim();
      if (!['This', 'is', 'The', 'car'].includes(color)) {
        return color;
      }
    }
    
    // Last resort: Look in title for color words
    const title = $('h1').first().text();
    const commonColors = ['Black', 'White', 'Silver', 'Gray', 'Grey', 'Blue', 'Red', 'Yellow',
                         'Green', 'Orange', 'Brown', 'Gold', 'Mint', 'Ruby', 'Sapphire', 'Chalk',
                         'Midnight Blue', 'Guards Red', 'Speed Yellow', 'Arctic Silver'];
    for (const color of commonColors) {
      if (title.toLowerCase().includes(color.toLowerCase())) return color;
    }
    
    return undefined;
  }

  private extractInteriorColor($: cheerio.CheerioAPI): string | undefined {
    // First try structured elements
    const colorText = $('.essentials-item:contains("Interior Color")').text() ||
                     $('dt:contains("Interior")').next('dd').text();
    
    if (colorText) {
      const color = colorText.replace(/.*:/, '').trim();
      if (color) return color;
    }
    
    // Look in BaT Essentials list for upholstery items
    let interiorColor: string | undefined;
    $('ul li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('Upholstery') || text.includes('Leather') || text.includes('Race-Tex')) {
        // Extract color from "Black Leather & Race-Tex Upholstery"
        const match = text.match(/^([\w\s]+?)\s+(?:Leather|Race-Tex|Upholstery)/i);
        if (match) {
          interiorColor = match[1].trim();
          return false;
        }
      }
    });
    
    if (interiorColor) return interiorColor;
    
    // Try to extract from description (first 2 paragraphs)
    const description = $('.post-excerpt').text() || 
                       $('.listing-text').text() || 
                       $('p').first().text() + ' ' + $('p').eq(1).text();
    
    // Pattern: "over [interior color] leather/upholstery"
    const overPattern = /over\s+([\w\s]+?)(?:\s+leather|\s+upholstery|\s+Race-Tex|\s+interior|[,.])/i;
    const overMatch = description.match(overPattern);
    if (overMatch) {
      const interior = overMatch[1].trim();
      if (!['the', 'a', 'with'].includes(interior.toLowerCase())) {
        return interior;
      }
    }
    
    // Pattern: "[color] leather/interior"
    const interiorPattern = /([\w\s]+?)\s+(?:leather|interior|upholstery|Race-Tex)/i;
    const intMatch = description.match(interiorPattern);
    if (intMatch) {
      const color = intMatch[1].trim();
      if (!['the', 'with', 'and', 'in', 'over', 'features'].includes(color.toLowerCase())) {
        return color;
      }
    }
    
    return undefined;
  }

  private extractTransmission($: cheerio.CheerioAPI, title: string): string | undefined {
    // First check structured elements
    const transText = $('.essentials-item:contains("Transmission")').text() ||
                     $('dt:contains("Transmission")').next('dd').text();
    
    if (transText) {
      const trans = transText.replace(/.*:/, '').trim();
      if (trans) return trans;
    }
    
    // Check title for transmission info
    const titleLower = title.toLowerCase();
    if (titleLower.includes('6-speed') || titleLower.includes('six-speed')) return '6-Speed Manual';
    if (titleLower.includes('7-speed') || titleLower.includes('seven-speed')) {
      return titleLower.includes('pdk') ? '7-Speed PDK' : '7-Speed Manual';
    }
    if (titleLower.includes('5-speed') || titleLower.includes('five-speed')) return '5-Speed Manual';
    if (titleLower.includes('pdk')) return 'PDK';
    if (titleLower.includes('tiptronic')) return 'Tiptronic';
    
    // Check description
    const description = $('.post-excerpt').text() || $('.listing-text').text() || $('p').first().text();
    
    // Pattern matching
    const patterns = [
      /(\d+)[-\s]?speed\s+(manual|automatic|PDK)/i,
      /(six|seven|five|6|7|5)[-\s]?speed\s*(manual)?/i,
      /\b(manual|automatic|PDK|tiptronic)\s*(transaxle|transmission|gearbox)?/i
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return match[0].replace(/transaxle|transmission|gearbox/gi, '').trim();
      }
    }
    
    return undefined;
  }

  private extractOptions($: cheerio.CheerioAPI): string {
    const options: string[] = [];
    
    // Find the BaT Essentials list that contains the VIN (to ensure we're in the right section)
    let essentialsList: cheerio.Cheerio<any> | null = null;
    
    $('ul').each((i, ul) => {
      const items = $(ul).find('li');
      const hasVIN = items.toArray().some(li => $(li).text().includes('Chassis:'));
      if (hasVIN) {
        essentialsList = $(ul);
        return false; // Break the loop
      }
    });
    
    if (essentialsList) {
      // Extract all list items from the essentials section
      essentialsList.find('li').each((i, el) => {
        const text = $(el).text().trim();
        
        // Skip non-option items using regex for better precision
        const skipPatterns = [
          /^Chassis:/, // VIN
          /^\d+k?\s+Miles$/i, // Mileage (e.g., "8k Miles")
          /^Location:/, // Location
          /^Private Party/i, // Seller type
          /^Dealer:/i, // Seller type
          /^Lot #/, // Auction lot
          /Carfax Report$/i, // Report
          /^\d+\.\d+-Liter/, // Engine size (e.g., "4.0-Liter Flat-Six")
          /^Six-Speed Manual Transaxle$/i, // Basic transmission
          /^Seven-Speed PDK$/i, // Basic transmission
          /^Five-Speed Manual$/i, // Basic transmission
          /^Window Sticker$/i, // Documentation
          /^Clean Carfax/i, // Report status
          /^Total Price of/, // Original price (we'll extract this separately)
          /^MSRP/ // Original MSRP
        ];
        
        const shouldSkip = skipPatterns.some(pattern => pattern.test(text));
        
        if (!shouldSkip && text.length > 3 && text.length < 200) {
          // This is likely an option or feature
          options.push(text);
        }
      });
    }
    
    return options.join('; ');
  }

  private determineGeneration(model: string, year?: number): string | undefined {
    if (!year) return undefined;
    
    if (model.includes('911')) {
      if (year >= 2024) return '992.2';
      if (year >= 2019) return '992.1';
      if (year >= 2016) return '991.2';
      if (year >= 2012) return '991.1';
      if (year >= 2009) return '997.2';
      if (year >= 2005) return '997.1';
      if (year >= 1999) return '996';
    } else if (model.includes('718') || model.includes('Cayman') || model.includes('Boxster')) {
      if (year >= 2016) return '982';
      if (year >= 2013) return '981';
      if (year >= 2009) return '987.2';
      if (year >= 2005) return '987.1';
    }
    
    return undefined;
  }
}