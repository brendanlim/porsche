import * as cheerio from 'cheerio';
import { ScrapedListing } from './base';
import { CurlFetcher } from './curl-fetcher';
import { HTMLStorageService } from '@/lib/services/html-storage';

interface ClassicModel {
  model: string;
  trim?: string;
  generation?: string;
  searchUrl: string;
}

// Use Classic.com's specific URLs for high-priority models with sold filter
const CLASSIC_MODELS: ClassicModel[] = [
  // GT4 RS - Top priority
  { model: '718 Cayman', trim: 'GT4 RS', searchUrl: 'https://www.classic.com/m/porsche/718/cayman/gt4-rs?listing_status=sold' },

  // GT4 models
  { model: '718 Cayman', trim: 'GT4', searchUrl: 'https://www.classic.com/m/porsche/718/cayman/gt4?listing_status=sold' },
  { model: '718 Cayman', trim: 'GTS', searchUrl: 'https://www.classic.com/m/porsche/718/cayman/gts?listing_status=sold' },
  { model: '718 Cayman', trim: 'GTS 4.0', searchUrl: 'https://www.classic.com/m/porsche/718/cayman/gts?listing_status=sold' },

  // 991 GT3 models
  { model: '911', trim: 'GT3', generation: '991.1', searchUrl: 'https://www.classic.com/m/porsche/911/991/9911/gt3?listing_status=sold' },
  { model: '911', trim: 'GT3', generation: '991.2', searchUrl: 'https://www.classic.com/m/porsche/911/991/9912/gt3?listing_status=sold' },
  { model: '911', trim: 'GT3 RS', generation: '991.1', searchUrl: 'https://www.classic.com/m/porsche/911/991/9911/gt3-rs?listing_status=sold' },
  { model: '911', trim: 'GT3 RS', generation: '991.2', searchUrl: 'https://www.classic.com/m/porsche/911/991/9912/gt3-rs?listing_status=sold' },

  // 996 GT3 models
  { model: '911', trim: 'GT3', generation: '996.1', searchUrl: 'https://www.classic.com/m/porsche/911/996/9961/gt3?listing_status=sold' },
  { model: '911', trim: 'GT3', generation: '996.2', searchUrl: 'https://www.classic.com/m/porsche/911/996/9962/gt3?listing_status=sold' },
  { model: '911', trim: 'GT3 RS', generation: '996', searchUrl: 'https://www.classic.com/m/porsche/911/996/9962/gt3-rs?listing_status=sold' },

  // 997 GT3 models
  { model: '911', trim: 'GT3', generation: '997.1', searchUrl: 'https://www.classic.com/m/porsche/911/997/9971/gt3?listing_status=sold' },
  { model: '911', trim: 'GT3', generation: '997.2', searchUrl: 'https://www.classic.com/m/porsche/911/997/9972/gt3?listing_status=sold' },
  { model: '911', trim: 'GT3 RS', generation: '997.1', searchUrl: 'https://www.classic.com/m/porsche/911/997/9971/gt3-rs?listing_status=sold' },
  { model: '911', trim: 'GT3 RS', generation: '997.2', searchUrl: 'https://www.classic.com/m/porsche/911/997/9972/gt3-rs?listing_status=sold' },

  // 992 GT3 models
  { model: '911', trim: 'GT3', generation: '992', searchUrl: 'https://www.classic.com/m/porsche/911/992/gt3?listing_status=sold' },
  { model: '911', trim: 'GT3 RS', generation: '992', searchUrl: 'https://www.classic.com/m/porsche/911/992/gt3-rs?listing_status=sold' },

  // GT2 models
  { model: '911', trim: 'GT2', generation: '997', searchUrl: 'https://www.classic.com/m/porsche/911/997/gt2?listing_status=sold' },
  { model: '911', trim: 'GT2 RS', generation: '997', searchUrl: 'https://www.classic.com/m/porsche/911/997/gt2-rs?listing_status=sold' },
  { model: '911', trim: 'GT2 RS', generation: '991', searchUrl: 'https://www.classic.com/m/porsche/911/991/gt2-rs?listing_status=sold' },

  // Regular Turbo models
  { model: '911', trim: 'Turbo', generation: '991', searchUrl: 'https://www.classic.com/m/porsche/911/991/turbo?listing_status=sold' },
  { model: '911', trim: 'Turbo S', generation: '991', searchUrl: 'https://www.classic.com/m/porsche/911/991/turbo-s?listing_status=sold' },
  { model: '911', trim: 'Turbo', generation: '992', searchUrl: 'https://www.classic.com/m/porsche/911/992/turbo?listing_status=sold' },
  { model: '911', trim: 'Turbo S', generation: '992', searchUrl: 'https://www.classic.com/m/porsche/911/992/turbo-s?listing_status=sold' },

  // General models for broader coverage
  { model: '911', searchUrl: 'https://www.classic.com/m/porsche/911?listing_status=sold' },
  { model: '718 Cayman', searchUrl: 'https://www.classic.com/m/porsche/718/cayman?listing_status=sold' },
  { model: '718 Boxster', searchUrl: 'https://www.classic.com/m/porsche/718/boxster?listing_status=sold' },
  { model: 'Cayman', searchUrl: 'https://www.classic.com/m/porsche/cayman?listing_status=sold' },
  { model: 'Boxster', searchUrl: 'https://www.classic.com/m/porsche/boxster?listing_status=sold' }
];

export class ClassicEnhancedScraper {
  private curlFetcher: CurlFetcher;
  private htmlStorage: HTMLStorageService;
  private source = 'classic';
  private htmlCache = new Map<string, string>();

  constructor() {
    this.curlFetcher = new CurlFetcher();
    this.htmlStorage = new HTMLStorageService();
  }

  async scrapeListings(params?: {
    model?: string;
    trim?: string;
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<ScrapedListing[]> {
    const allListings: ScrapedListing[] = [];
    const maxPages = params?.maxPages || 3;
    const processedUrls = new Set<string>();

    // Filter models based on parameters
    let modelsToScrape = CLASSIC_MODELS;

    if (params?.model) {
      modelsToScrape = CLASSIC_MODELS.filter(m =>
        m.model.toLowerCase().includes(params.model!.toLowerCase())
      );
    }

    if (params?.trim) {
      modelsToScrape = modelsToScrape.filter(m =>
        m.trim && m.trim.toLowerCase().includes(params.trim!.toLowerCase())
      );
    }

    console.log(`\n📋 Classic.com Enhanced Scraper`);
    console.log(`   • Models to scrape: ${modelsToScrape.length}`);
    console.log(`   • Max pages per model: ${maxPages}`);
    console.log(`   • Focus: Sold listings only`);

    for (const modelConfig of modelsToScrape.slice(0, 5)) { // Limit to top 5 for performance
      console.log(`\n🔍 Scraping ${modelConfig.model} ${modelConfig.trim || ''} ${modelConfig.generation || ''}`);

      // Scrape multiple pages for each model
      for (let page = 1; page <= maxPages; page++) {
        const pageUrl = page === 1
          ? modelConfig.searchUrl
          : `${modelConfig.searchUrl}&page=${page}`;

        console.log(`   📄 Page ${page}: ${pageUrl}`);

        try {
          const html = await this.fetchUrl(pageUrl);
          const $ = cheerio.load(html);

          // Classic.com shows listings in a table within div.listings-table
          const $listingsTable = $('.listings-table');

          // Get all rows from the table (could be tr elements or divs acting as rows)
          const listings = $listingsTable.find('tr, [class*="row"]').toArray();

          // Also try to find links to /veh/ pages within the table
          const vehicleLinks = $listingsTable.find('a[href^="/veh/"]').toArray();

          if (listings.length === 0 && vehicleLinks.length === 0) {
            console.log(`   ✓ No more listings on page ${page}`);
            break; // No more pages
          }

          console.log(`   ✓ Found ${listings.length || vehicleLinks.length} listings on page ${page}`);

          // Process table rows
          for (const element of listings.length > 0 ? listings : vehicleLinks) {
            let href: string | undefined;
            let $row: any;

            if (listings.length > 0) {
              // We're processing table rows
              $row = $(element);
              href = $row.find('a[href^="/veh/"]').first().attr('href');
            } else {
              // We're processing direct links
              href = $(element).attr('href');
              $row = $(element).closest('tr, [class*="row"], div');

            }

            if (!href) continue;

            const listingUrl = `https://www.classic.com${href}`;

            // Skip duplicates
            if (processedUrls.has(listingUrl)) continue;
            processedUrls.add(listingUrl);

            // Extract basic info from the row
            const rowText = $row.text();
            const title = $row.find('a[href^="/veh/"]').first().text().trim() ||
                         $row.find('[class*="title"], h2, h3').first().text().trim() ||
                         rowText.split('\n')[0].trim();

            // Check for non-US listings and skip them
            const locationIndicators = rowText.toLowerCase();
            const nonUSIndicators = [
              'canada', 'mexico', 'uk', 'germany', 'japan', 'australia',
              'france', 'italy', 'spain', 'netherlands', 'belgium', 'switzerland',
              'austria', 'sweden', 'norway', 'denmark', 'portugal', 'monaco',
              '€', '£', '¥', 'cad', 'eur', 'gbp', 'jpy', 'aud',
              'kilometres', 'km', 'ontario', 'quebec', 'british columbia',
              'alberta', 'tokyo', 'london', 'paris', 'berlin', 'munich'
            ];

            if (nonUSIndicators.some(indicator => locationIndicators.includes(indicator))) {
              continue; // Skip non-US listings
            }

            // Identify the original source from Classic.com
            let originalSource = 'unknown';
            const sourcePatterns = [
              { pattern: /bring a trailer|bringatrailer|bat/i, name: 'bring-a-trailer' },
              { pattern: /pcarmarket|pcarm/i, name: 'pcarmarket' },
              { pattern: /cars[\s&]*bids|carsandbids/i, name: 'cars-and-bids' },
              { pattern: /rm sotheby|rmsotheby|sothebys/i, name: 'rm-sothebys' },
              { pattern: /bonhams/i, name: 'bonhams' },
              { pattern: /barrett[\s-]*jackson/i, name: 'barrett-jackson' },
              { pattern: /mecum/i, name: 'mecum' },
              { pattern: /hemmings/i, name: 'hemmings' },
              { pattern: /gooding/i, name: 'gooding' },
              { pattern: /dealer/i, name: 'dealer' },
              { pattern: /private/i, name: 'private-party' }
            ];

            for (const { pattern, name } of sourcePatterns) {
              if (pattern.test(rowText)) {
                originalSource = name;
                break;
              }
            }

            // For now, let's keep all listings but mark their original source
            // This gives us coverage of smaller auction houses we don't scrape directly
            const isDuplicateSource = ['bring-a-trailer', 'pcarmarket', 'cars-and-bids', 'rm-sothebys']
              .includes(originalSource);

            // You can uncomment this to skip duplicates if desired:
            // if (isDuplicateSource) continue;

            // Extract price from row (usually in a td with price class or containing $)
            const priceText = $row.find('[class*="price"], td:contains("$")').text() ||
                             $row.find('td').filter((i, el) => $(el).text().includes('$')).first().text();
            const price = this.extractPrice(priceText);

            // Only process if we have a valid price (sold listing) in USD
            if (!price || price < 10000) continue;
            if (!priceText.includes('$') && !priceText.includes('USD')) continue; // Skip non-USD prices

            // Extract year from title
            const year = this.extractYear(title);

            // Extract mileage from row
            const mileageText = rowText.match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi\b)/i)?.[0];
            const mileage = mileageText ? this.extractMileage(mileageText) : null;

            // Determine sold date if available (might be in a separate column)
            const soldDateMatch = rowText.match(/(?:Sold|Sale Date)[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i) ||
                                 rowText.match(/(\w+\s+\d{1,2},?\s+\d{4})/i);
            const soldDate = soldDateMatch ? new Date(soldDateMatch[1]) : undefined;

            const listing: ScrapedListing = {
              source_url: listingUrl,
              title,
              price,
              year,
              model: modelConfig.model,
              trim: modelConfig.trim,
              generation: modelConfig.generation,
              mileage,
              sold_date: soldDate,
              status: 'sold',
              source: this.source, // 'classic'
              scraped_at: new Date(),
              // Store original source in description or metadata
              description: `Originally listed on: ${originalSource}${isDuplicateSource ? ' (duplicate source)' : ''}`
            };

            allListings.push(listing);
          }

          // Rate limiting between pages
          if (page < maxPages) {
            await this.delay(2000 + Math.random() * 1000);
          }

        } catch (error) {
          console.error(`   ❌ Error on page ${page}:`, error);
          continue;
        }
      }

      // Rate limiting between models
      await this.delay(3000 + Math.random() * 2000);
    }

    console.log(`\n✅ Classic.com scraping complete: ${allListings.length} sold listings found`);

    // Now fetch details for each listing (VINs, etc.)
    console.log(`\n📋 Fetching details for ${Math.min(allListings.length, 50)} listings...`);

    for (const listing of allListings.slice(0, 50)) { // Limit detail fetching
      try {
        const details = await this.scrapeDetail(listing.source_url);
        if (details) {
          // Merge detailed data
          Object.assign(listing, details);
        }
      } catch (error) {
        console.error(`Failed to fetch details for ${listing.source_url}:`, error);
      }

      // Rate limiting
      await this.delay(1000 + Math.random() * 1000);
    }

    return allListings;
  }

  async scrapeDetail(url: string): Promise<Partial<ScrapedListing> | null> {
    try {
      const html = await this.fetchUrl(url, 'detail');
      const $ = cheerio.load(html);

      // Extract VIN from page
      const bodyText = $('body').text();
      const vinMatch = bodyText.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
      const vin = vinMatch ? vinMatch[1] : undefined;

      // Extract sold date more precisely
      const soldDateMatch = bodyText.match(/Sale Date[:\s]+(\w+\s+\d{1,2},?\s+\d{4})/i);
      const sold_date = soldDateMatch ? new Date(soldDateMatch[1]) : undefined;

      // Extract location
      const locationMatch = bodyText.match(/Location[:\s]+([^,]+),\s*([A-Z]{2})/i);
      const location = locationMatch ? {
        city: locationMatch[1],
        state: locationMatch[2]
      } : undefined;

      // Get high-res images
      const images: string[] = [];
      $('img[src*="cdn"], img[src*="classic"]').each((_, img) => {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !src.includes('placeholder') && images.length < 10) {
          images.push(src);
        }
      });

      // Extract exterior and interior colors
      const exteriorMatch = bodyText.match(/Exterior[:\s]+([^,\n]+)/i);
      const exterior_color = exteriorMatch ? exteriorMatch[1].trim() : undefined;

      const interiorMatch = bodyText.match(/Interior[:\s]+([^,\n]+)/i);
      const interior_color = interiorMatch ? interiorMatch[1].trim() : undefined;

      return {
        vin,
        sold_date,
        location,
        images,
        exterior_color,
        interior_color
      };
    } catch (error) {
      console.error(`Error scraping Classic.com detail for ${url}:`, error);
      return null;
    }
  }

  private async fetchUrl(url: string, type: 'search' | 'detail' = 'search'): Promise<string> {
    // Check cache first
    if (this.htmlCache.has(url)) {
      return this.htmlCache.get(url)!;
    }

    try {
      const html = await this.curlFetcher.fetchWithRetry(url, 3);

      if (!html) {
        throw new Error(`Failed to fetch ${url}`);
      }

      // Store HTML
      try {
        await this.htmlStorage.storeScrapedHTML({
          source: this.source,
          url,
          html,
          type,
          metadata: {
            timestamp: new Date().toISOString(),
            fetchMethod: 'curl'
          }
        });
      } catch (storageError) {
        console.error(`Failed to store HTML:`, storageError);
      }

      // Cache for session
      this.htmlCache.set(url, html);
      return html;
    } catch (error) {
      console.error(`Fetch failed for ${url}:`, error);
      throw error;
    }
  }

  private extractPrice(text: string): number | null {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const price = parseFloat(cleaned);

    if (isNaN(price) || price < 1000) {
      return null;
    }

    return Math.round(price);
  }

  private extractYear(text: string): number | null {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      return parseInt(yearMatch[0]);
    }
    return null;
  }

  private extractMileage(text: string): number | null {
    const patterns = [
      /(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi\b)/i,
      /(\d+)k\s*(?:miles?|mi\b)/i
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

    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}