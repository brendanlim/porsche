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

// PCarMarket URLs for completed Porsche auctions by generation
const PCARMARKET_MODELS: PCarMarketModel[] = [
  // 911 Models by generation
  { name: '911', slug: '991', generation: '991', searchUrl: 'https://www.pcarmarket.com/auction/completed/?category=all&make=porsche&year_beg=2016&year_end=2024&series=991' },
  { name: '911', slug: '992', generation: '992', searchUrl: 'https://www.pcarmarket.com/auction/completed/?category=all&make=porsche&year_beg=2013&year_end=2016&series=992' },
  { name: '911', slug: '996', generation: '996', searchUrl: 'https://www.pcarmarket.com/auction/completed/?category=all&make=porsche&year_beg=2012&year_end=2020&series=996' },
  { name: '911', slug: '997', generation: '997', searchUrl: 'https://www.pcarmarket.com/auction/completed/?category=all&make=porsche&year_beg=1993&year_end=2025&series=997' },

  // Cayman/Boxster by generation
  { name: 'Cayman', slug: '982', generation: '982', searchUrl: 'https://www.pcarmarket.com/auction/completed/?category=all&make=porsche&year_beg=1920&year_end=2025&series=982' },
  { name: 'Cayman', slug: '981', generation: '981', searchUrl: 'https://www.pcarmarket.com/auction/completed/?category=all&make=porsche&year_beg=1951&year_end=2025&series=981' },
  { name: 'Cayman', slug: '987', generation: '987', searchUrl: 'https://www.pcarmarket.com/auction/completed/?category=all&make=porsche&year_beg=2005&year_end=2013&series=987' },
  { name: 'Boxster', slug: '986', generation: '986', searchUrl: 'https://www.pcarmarket.com/auction/completed/?category=all&make=porsche&year_beg=1999&year_end=2005&series=986' },
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
   * Scrape PCarMarket completed auctions page with authentication
   */
  private async scrapeCompletedAuctions(
    url: string,
    existingUrls: Set<string> = new Set(),
    maxPages: number = 3
  ): Promise<any> {
    console.log(`\n🌐 Connecting to Bright Data for PCarMarket...`);

    let browser;
    try {
      browser = await this.puppeteerScraper.connectBrowser();
    } catch (error: any) {
      console.error(`❌ Failed to connect to Bright Data: ${error.message}`);
      throw error;
    }
    const page = await browser.newPage();

    try {
      // First, navigate to home page to get proper login link
      console.log('🔐 Navigating to PCarMarket...');
      await page.goto('https://www.pcarmarket.com', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Click on Log In link
      const loginLinkSelector = 'a:contains("Log In"), a[href*="login"]';
      await page.waitForSelector('a', { timeout: 30000 });

      // Click the login link
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const loginLink = links.find(a => a.textContent?.trim() === 'Log In');
        if (loginLink) {
          (loginLink as HTMLElement).click();
        }
      });

      // Wait for navigation to login page
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check current URL to see if we're on the login page
      const loginPageUrl = page.url();
      console.log(`    Current URL: ${loginPageUrl}`);

      // Now we should be on the login page
      // Wait for the username/email field (first required textbox)
      try {
        await page.waitForSelector('input[type="text"], input[type="email"], input[type="password"]', { timeout: 10000 });
      } catch (error) {
        // Take a screenshot for debugging
        const html = await page.content();
        console.log(`    Page title: ${await page.title()}`);
        console.log(`    HTML snippet: ${html.substring(0, 500)}`);
        throw new Error(`Login form not found at ${loginPageUrl}`);
      }

      const email = process.env.PCARMARKET_EMAIL;
      const username = 'brendanlim';  // Fallback username
      const password = process.env.PCARMARKET_PASSWORD;

      if (!password) {
        throw new Error('PCARMARKET_PASSWORD environment variable is required');
      }

      // Find and fill the form fields
      // The form has two text inputs - username/email and password
      const inputs = await page.$$('input');
      console.log(`    Found ${inputs.length} input fields`);

      // Filter for visible text/email and password inputs
      let usernameInput = null;
      let passwordInput = null;

      for (const input of inputs) {
        const type = await input.evaluate((el: any) => el.type);
        const isVisible = await input.evaluate((el: any) => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });

        if (isVisible) {
          if ((type === 'text' || type === 'email') && !usernameInput) {
            usernameInput = input;
          } else if (type === 'password' && !passwordInput) {
            passwordInput = input;
          }
        }
      }

      if (usernameInput && passwordInput) {
        await usernameInput.type(email || username);
        await passwordInput.type(password);
      } else {
        throw new Error('Could not find login form inputs');
      }

      // Click the Log in button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loginBtn = buttons.find(b => b.textContent?.includes('Log in') || b.textContent?.includes('LOGIN'));
        if (loginBtn) {
          (loginBtn as HTMLElement).click();
        } else {
          // Fallback to any submit button
          const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
          if (submitBtn) (submitBtn as HTMLElement).click();
        }
      });

      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

      // Check if we're logged in by checking the URL or looking for logout link
      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('/login') && !currentUrl.includes('/sign');

      if (!isLoggedIn) {
        console.log('⚠️ Email login failed, trying username...');
        // Navigate back to login
        await page.goto('https://www.pcarmarket.com', { waitUntil: 'networkidle2' });
        await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const loginLink = links.find(a => a.textContent?.trim() === 'Log In');
          if (loginLink) (loginLink as HTMLElement).click();
        });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Try with username
        const inputs2 = await page.$$('input[type="text"], input[type="email"], input[type="password"]');
        if (inputs2.length >= 2) {
          await inputs2[0].clear();
          await inputs2[0].type(username);
          await inputs2[1].clear();
          await inputs2[1].type(password);
        }
        await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loginBtn = buttons.find(b => b.textContent?.includes('Log in'));
        if (loginBtn) (loginBtn as HTMLElement).click();
      });
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      }

      console.log('✅ Successfully logged into PCarMarket');

      // Now navigate to the completed auctions page
      console.log(`📄 Loading completed auctions: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Handle pagination - PCarMarket uses Load More or pagination
      let currentPage = 1;
      let allHtml = '';

      while (currentPage <= maxPages) {
        console.log(`  📄 Page ${currentPage}/${maxPages}`);

        // Get current page HTML
        const pageHtml = await page.content();
        allHtml += pageHtml;

        // Check for next page button
        const hasNextPage = await page.evaluate(() => {
          const nextBtn = document.querySelector('.pagination .next:not(.disabled)');
          const loadMoreBtn = document.querySelector('button:contains("Load More"), button:contains("Show More")');
          return nextBtn !== null || loadMoreBtn !== null;
        });

        if (!hasNextPage || currentPage >= maxPages) {
          break;
        }

        // Click next page or load more
        const clicked = await page.evaluate(() => {
          const nextBtn = document.querySelector('.pagination .next:not(.disabled) a');
          const loadMoreBtn = document.querySelector('button:contains("Load More"), button:contains("Show More")');

          if (nextBtn) {
            (nextBtn as HTMLElement).click();
            return true;
          } else if (loadMoreBtn) {
            (loadMoreBtn as HTMLElement).click();
            return true;
          }
          return false;
        });

        if (clicked) {
          // Wait for new content to load
          await new Promise(resolve => setTimeout(resolve, 3000));
          currentPage++;
        } else {
          break;
        }
      }

      console.log(`✅ Scraped ${currentPage} page(s) of completed auctions`);

      return { html: allHtml, pageCount: currentPage };

    } catch (error: any) {
      console.error(`❌ Error scraping PCarMarket: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Scrape a single PCarMarket listing page (authenticated)
   */
  private async scrapeListingPage(url: string): Promise<any> {
    const browser = await this.puppeteerScraper.connectBrowser();
    const page = await browser.newPage();

    try {
      // Login first
      console.log('    🔐 Logging in...');
      await page.goto('https://www.pcarmarket.com', { waitUntil: 'networkidle2' });

      // Click login link
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const loginLink = links.find(a => a.textContent?.trim() === 'Log In');
        if (loginLink) (loginLink as HTMLElement).click();
      });
      await new Promise(resolve => setTimeout(resolve, 3000));

      const email = process.env.PCARMARKET_EMAIL || 'brendanlim';
      const password = process.env.PCARMARKET_PASSWORD;

      // Fill login form
      const inputs = await page.$$('input[type="text"], input[type="email"], input[type="password"]');
      if (inputs.length >= 2) {
        await inputs[0].type(email);
        await inputs[1].type(password);
      }

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loginBtn = buttons.find(b => b.textContent?.includes('Log in'));
        if (loginBtn) (loginBtn as HTMLElement).click();
      });
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Navigate to listing
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

      // Wait for content to load
      await page.waitForSelector('.auction-details, .listing-details', { timeout: 30000 });

      const html = await page.content();
      return { html };

    } catch (error: any) {
      console.error(`    ❌ Error fetching listing: ${error.message}`);
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Extract listings from a PCarMarket page
   */
  private async extractListingsFromPage($: cheerio.CheerioAPI, modelConfig: PCarMarketModel): Promise<ScrapedListing[]> {
    const listings: ScrapedListing[] = [];

    // PCarMarket uses auction cards in grid layout
    const auctionCards = $('.auction-card, .listing-card, article.auction').toArray();

    console.log(`  Found ${auctionCards.length} auction cards`);

    for (const card of auctionCards) {
      const $card = $(card);

      // Extract listing URL
      const link = $card.find('a[href*="/auction/"]').first();
      const relativeUrl = link.attr('href');
      if (!relativeUrl) continue;

      const listingUrl = `https://www.pcarmarket.com${relativeUrl}`;

      // Extract title
      const title = $card.find('.title, h3, h4').first().text().trim();

      // Extract year from title
      const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

      // Extract price (if visible when logged in)
      const priceText = $card.find('.price, .sold-price, .winning-bid').first().text().trim();
      const priceMatch = priceText.match(/\$([\d,]+)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : undefined;

      // Extract sold date
      const dateText = $card.find('.date, .end-date, .sold-date').first().text().trim();

      // Extract mileage if visible
      const detailsText = $card.find('.details, .specs').text();
      const mileageMatch = detailsText.match(/([\d,]+)\s*(miles?|mi)/i);
      const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : undefined;

      listings.push({
        source_url: listingUrl,
        title,
        year,
        price,
        mileage,
        status: 'sold',
        model: modelConfig.name,
        generation_code: modelConfig.generation,
      });
    }

    return listings;
  }

  /**
   * Parse individual listing page HTML
   */
  private async parseListing(html: string, url: string): Promise<ScrapedListing | null> {
    const $ = cheerio.load(html);

    // Extract title
    const title = $('h1, .auction-title').first().text().trim();
    if (!title) return null;

    // Extract year
    const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

    // Extract VIN
    let vin: string | undefined;
    const vinSection = $('dt:contains("VIN")').next('dd').text().trim();
    if (vinSection) {
      vin = vinSection;
    } else {
      // Alternative selectors
      const vinMatch = html.match(/VIN[:\s]+([A-HJ-NPR-Z0-9]{17})/i);
      if (vinMatch) vin = vinMatch[1];
    }

    // Extract mileage
    let mileage: number | undefined;
    const mileageSection = $('dt:contains("Mileage"), dt:contains("Odometer")').next('dd').text().trim();
    if (mileageSection) {
      const mileageMatch = mileageSection.match(/([\d,]+)/);
      if (mileageMatch) {
        mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
      }
    }

    // Extract sold price (when logged in)
    let price: number | undefined;
    const priceSelectors = [
      '.sold-price',
      '.winning-bid',
      '.final-price',
      'dt:contains("Sold For")~dd',
      'dt:contains("Winning Bid")~dd'
    ];

    for (const selector of priceSelectors) {
      const priceText = $(selector).first().text().trim();
      if (priceText) {
        const priceMatch = priceText.match(/\$([\d,]+)/);
        if (priceMatch) {
          price = parseInt(priceMatch[1].replace(/,/g, ''));
          break;
        }
      }
    }

    // Extract sold date
    let soldDate: string | undefined;
    const dateSection = $('dt:contains("Ended"), dt:contains("Sold")').next('dd').text().trim();
    if (dateSection) {
      // Try to parse the date
      const date = new Date(dateSection);
      if (!isNaN(date.getTime())) {
        soldDate = date.toISOString();
      }
    }

    // Extract color
    const colorSection = $('dt:contains("Exterior Color"), dt:contains("Color")').next('dd').text().trim();
    const exterior_color = colorSection || undefined;

    // Extract transmission
    const transSection = $('dt:contains("Transmission")').next('dd').text().trim();
    const transmission = transSection ? (transSection.toLowerCase().includes('manual') ? 'Manual' : 'Automatic') : undefined;

    // Extract model details from title
    let model = '911'; // default
    let trim: string | undefined;

    if (title.toLowerCase().includes('cayman')) model = 'Cayman';
    else if (title.toLowerCase().includes('boxster')) model = 'Boxster';

    // Extract trim
    const trimPatterns = ['GT4 RS', 'GT4', 'GT3 RS', 'GT3', 'GT2 RS', 'GT2', 'Turbo S', 'Turbo', 'Spyder', 'GTS', 'S', 'Carrera', 'Targa'];
    for (const pattern of trimPatterns) {
      if (title.includes(pattern)) {
        trim = pattern;
        break;
      }
    }

    return {
      source_url: url,
      title,
      price,
      status: 'sold',
      year,
      vin,
      mileage,
      sold_date: soldDate,
      exterior_color,
      transmission,
      model,
      trim,
    };
  }
}