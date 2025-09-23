import { BaseScraper, ScrapedListing } from './base';
import { BrightDataPuppeteer } from './bright-data-puppeteer';
import * as cheerio from 'cheerio';
import { HTMLStorageService } from '../services/html-storage';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface PCarMarketModel {
  name: string;
  slug: string;
  trim?: string;
  generation?: string;
  searchUrl: string;
}

// PCarMarket URLs for completed Porsche auctions
const PCARMARKET_MODELS: PCarMarketModel[] = [
  // 911 Models - Using their completed auction filters
  { name: '911', slug: '911', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=911' },
  { name: '911', slug: '911', trim: 'GT3', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=911&trim=gt3' },
  { name: '911', slug: '911', trim: 'GT3 RS', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=911&trim=gt3-rs' },
  { name: '911', slug: '911', trim: 'GT2', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=911&trim=gt2' },
  { name: '911', slug: '911', trim: 'GT2 RS', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=911&trim=gt2-rs' },
  { name: '911', slug: '911', trim: 'Turbo', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=911&trim=turbo' },
  { name: '911', slug: '911', trim: 'Turbo S', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=911&trim=turbo-s' },
  { name: '911', slug: '911', trim: 'Carrera', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=911&trim=carrera' },
  { name: '911', slug: '911', trim: 'Targa', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=911&trim=targa' },

  // Cayman/718 Models
  { name: '718 Cayman', slug: '718-cayman', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=718-cayman' },
  { name: 'Cayman', slug: 'cayman', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=cayman' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GT4', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=718-cayman&trim=gt4' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GT4 RS', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=718-cayman&trim=gt4-rs' },

  // Boxster Models
  { name: '718 Boxster', slug: '718-boxster', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=718-boxster' },
  { name: 'Boxster', slug: 'boxster', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=boxster' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'Spyder', searchUrl: 'https://pcarmarket.com/auction/completed/?make=porsche&model=718-boxster&trim=spyder' },
];

/**
 * PCarMarket scraper - focuses on completed auctions only since active listings don't have final prices
 *
 * Key challenges:
 * 1. Prices are hidden behind authentication - requires login
 * 2. Site uses heavy JavaScript - requires browser automation
 * 3. Need to handle pagination on completed auctions
 *
 * Strategy:
 * 1. Use Bright Data Puppeteer for browser automation
 * 2. Focus on completed auctions only (sold listings)
 * 3. Extract VIN, mileage, sold price, and sold date where available
 */
export class PCarMarketScraper extends BaseScraper {
  private puppeteerScraper: BrightDataPuppeteer;
  private htmlStorage: HTMLStorageService;

  constructor() {
    super('pcarmarket');
    this.puppeteerScraper = new BrightDataPuppeteer();
    this.htmlStorage = new HTMLStorageService();
  }

  // Required abstract method - scrape individual listing
  async scrapeDetail(url: string): Promise<ScrapedListing> {
    console.log(`📄 Fetching PCarMarket listing: ${url}`);

    try {
      const listingData = await this.scrapeListingPage(url);

      if (!listingData || !listingData.html) {
        throw new Error('No HTML returned from scraper');
      }

      // Parse the listing data
      const parsed = await this.parseListing(listingData.html, url);
      if (!parsed) {
        throw new Error('Failed to parse listing data');
      }

      return parsed;
    } catch (error: any) {
      console.error(`❌ Error scraping ${url}: ${error.message}`);
      throw error;
    }
  }

  async scrapeListings(options: {
    model?: string;
    trim?: string;
    maxPages?: number;
    onlySold?: boolean;
  } = {}): Promise<ScrapedListing[]> {
    const { model, trim, maxPages = 3 } = options;
    const allListings: ScrapedListing[] = [];

    // Filter models based on provided parameters
    let modelsToScrape = PCARMARKET_MODELS;

    if (model || trim) {
      modelsToScrape = PCARMARKET_MODELS.filter(m => {
        // Check model match if provided
        if (model) {
          const modelMatch = m.slug.toLowerCase().includes(model.toLowerCase()) ||
                           m.name.toLowerCase().includes(model.toLowerCase());
          if (!modelMatch) return false;
        }

        // Check trim match if provided
        if (trim) {
          if (!m.trim) return false;
          const trimMatch = m.trim.toLowerCase().replace(' ', '-') === trim.toLowerCase().replace(' ', '-');
          if (!trimMatch) return false;
        }

        return true;
      });
    }

    console.log('\n' + '█'.repeat(70));
    console.log(' '.repeat(20) + 'PCARMARKET SCRAPER');
    console.log('█'.repeat(70));
    console.log(`\n📋 Configuration:`);
    console.log(`   • Models to scrape: ${modelsToScrape.length}/${PCARMARKET_MODELS.length}`);
    if (model) console.log(`   • Model filter: ${model}`);
    if (trim) console.log(`   • Trim filter: ${trim}`);
    console.log(`   • Max pages per model: ${maxPages}`);
    console.log(`   • Using Bright Data Scraping Browser`);
    console.log('─'.repeat(70));

    // Fetch existing URLs from database to detect duplicates
    console.log('📊 Checking for existing PCarMarket listings in database...');
    const { data: existingListings } = await supabaseAdmin
      .from('listings')
      .select('source_url')
      .eq('source', 'pcarmarket');

    const existingUrls = new Set(existingListings?.map(l => l.source_url) || []);
    console.log(`Found ${existingUrls.size} existing PCarMarket listings`);

    // Process each model/trim combination
    for (let configIdx = 0; configIdx < modelsToScrape.length; configIdx++) {
      const modelConfig = modelsToScrape[configIdx];

      console.log('\n' + '═'.repeat(70));
      console.log(`📊 [${configIdx + 1}/${modelsToScrape.length}] ${modelConfig.name} ${modelConfig.trim || ''}`);
      console.log('─'.repeat(70));
      console.log(`🔗 ${modelConfig.searchUrl}`);

      try {
        // Scrape the completed auctions page
        const result = await this.scrapeCompletedAuctions(modelConfig.searchUrl, existingUrls, maxPages);

        if (!result || !result.html) {
          console.log('❌ No HTML returned from scraper');
          continue;
        }

        // Store the search page HTML
        const storageResult = await this.htmlStorage.storeScrapedHTML({
          source: 'pcarmarket',
          url: modelConfig.searchUrl,
          html: result.html,
          type: 'search',
          model: modelConfig.name || 'unknown',
          trim: modelConfig.trim || 'unknown',
        });

        if (storageResult) {
          console.log(`✓ Stored search page: ${storageResult.path}`);
        }

        // Parse the HTML to extract listings
        const $ = cheerio.load(result.html);
        const extractedListings = await this.extractListingsFromPage($, modelConfig);

        console.log(`  ✓ Extracted ${extractedListings.length} listings from page`);
        allListings.push(...extractedListings);

        // Rate limit between models
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error: any) {
        console.error(`\n❌ Error processing ${modelConfig.name}: ${error.message}`);
        console.log('─'.repeat(70));
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ SEARCH COMPLETE - Found ${allListings.length} total listings`);
    console.log('═'.repeat(70));

    // Now fetch individual listing pages for detailed data
    if (allListings.length > 0) {
      console.log('\n' + '▓'.repeat(70));
      console.log('📥 FETCHING INDIVIDUAL LISTING DETAILS');
      console.log('▓'.repeat(70));
      console.log(`\n📊 Total listings to process: ${allListings.length}`);

      // Process in batches to avoid memory issues
      const batchSize = 25;
      const totalBatches = Math.ceil(allListings.length / batchSize);
      let totalFetched = 0;
      let totalErrors = 0;

      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const startIdx = batchNum * batchSize;
        const endIdx = Math.min(startIdx + batchSize, allListings.length);
        const batch = allListings.slice(startIdx, endIdx);

        console.log('\n' + '·'.repeat(60));
        console.log(`📦 Batch ${batchNum + 1}/${totalBatches} (items ${startIdx + 1}-${endIdx})`);
        console.log('·'.repeat(60));

        for (let i = 0; i < batch.length; i++) {
          const listing = batch[i];
          const globalIdx = startIdx + i + 1;

          // Skip if we've had too many consecutive errors
          if (totalErrors >= 5) {
            console.error('\n  ⚠️ Too many consecutive errors, stopping detail fetching');
            break;
          }

          try {
            const carInfo = `${listing.model || 'Unknown'} ${listing.trim || ''}`.trim();
            console.log(`\n  [${globalIdx}/${allListings.length}] ${carInfo}`);

            // Fetch the listing detail page
            const listingData = await this.scrapeListingPage(listing.source_url);

            if (listingData && listingData.html) {
              // Store the detail page HTML
              const storageResult = await this.htmlStorage.storeScrapedHTML({
                source: 'pcarmarket',
                url: listing.source_url,
                html: listingData.html,
                type: 'detail',
                model: listing.model || 'unknown',
                trim: listing.trim || '',
              });

              if (storageResult) {
                const sizeKB = Math.round(listingData.html.length / 1024);
                console.log(`    ✓ Stored HTML (${sizeKB}KB)`);
              }

              // Parse the detail page for full data
              const parsed = await this.parseListing(listingData.html, listing.source_url);
              if (parsed) {
                // Merge the parsed data with the listing
                Object.assign(listing, parsed);

                // Log key extracted data
                const details = [];
                if (parsed.vin) details.push(`VIN: ${parsed.vin}`);
                if (parsed.mileage) details.push(`${parsed.mileage.toLocaleString()} mi`);
                if (parsed.sold_date) details.push(`Sold: ${new Date(parsed.sold_date).toLocaleDateString()}`);
                if (details.length > 0) {
                  console.log(`    📊 ${details.join(' | ')}`);
                }

                totalFetched++;
                totalErrors = 0; // Reset error counter on success
              }
            }

            // Rate limit between requests
            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (error: any) {
            totalErrors++;
            console.error(`    ❌ Error: ${error.message}`);

            // Shorter delay on errors
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // Break if we've had too many errors
        if (totalErrors >= 5) break;
      }

      console.log('\n' + '═'.repeat(70));
      console.log(`📊 DETAIL FETCH COMPLETE: ${totalFetched}/${allListings.length} successfully processed`);
      console.log('═'.repeat(70));
    }

    return allListings;
  }

  /**
   * Scrape PCarMarket completed auctions page
   */
  private async scrapeCompletedAuctions(
    url: string,
    existingUrls: Set<string> = new Set(),
    maxPages: number = 3
  ): Promise<any> {
    console.log(`\n🌐 Connecting to Bright Data for PCarMarket...`);

    // Note: This is a simplified version. In a real implementation, we'd need:
    // 1. Login functionality to see prices
    // 2. Pagination handling
    // 3. More sophisticated duplicate detection

    // For now, we'll implement basic page fetching
    // This will need to be enhanced with authentication once we have PCarMarket credentials

    throw new Error('PCarMarket scraping requires authentication - login credentials needed to access sold prices');
  }

  /**
   * Scrape a single PCarMarket listing page
   */
  private async scrapeListingPage(url: string): Promise<any> {
    // This would use Bright Data Puppeteer to fetch individual listing pages
    // For now, placeholder implementation

    throw new Error('PCarMarket listing page scraping not yet implemented - requires authentication');
  }

  /**
   * Extract listings from a PCarMarket page
   */
  private async extractListingsFromPage($: cheerio.CheerioAPI, modelConfig: PCarMarketModel): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    // This would parse the completed auctions page structure
    // Based on the research, we'd look for:
    // - Listing cards with auction details
    // - Final sale prices (if logged in)
    // - Auction end dates
    // - Links to individual listing pages

    // Placeholder implementation
    return listings;
  }

  /**
   * Parse individual listing page HTML
   */
  private async parseListing(html: string, url: string): Promise<ScrapedListing | null> {
    const $ = cheerio.load(html);

    // Extract basic info
    const title = $('h1').first().text().trim();
    if (!title) return null;

    // This would extract:
    // - VIN from listing details
    // - Mileage
    // - Final sale price (if available)
    // - Sale date
    // - Vehicle details (color, transmission, etc.)

    // Extract year from title
    const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

    // Placeholder parsing - would need to be implemented based on actual PCarMarket HTML structure
    return {
      source_url: url,
      title,
      price: 0, // Would extract from page
      status: 'sold',
      year,
      // Additional fields would be extracted here
    };
  }
}