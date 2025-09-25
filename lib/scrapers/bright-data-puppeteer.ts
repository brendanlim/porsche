import puppeteer from 'puppeteer-core';

export class BrightDataPuppeteer {
  private browserWSEndpoint: string;
  private customerId: string;
  private password: string;
  private zone: string;
  private sessionId: string;
  private requestCount: number = 0;
  private maxRequestsPerSession: number = 30;
  private lastSessionReset: number = Date.now();

  constructor() {
    this.customerId = process.env.BRIGHT_DATA_CUSTOMER_ID || 'hl_cd9a1035';
    this.password = process.env.BRIGHT_DATA_BROWSER_PASSWORD || 'y2w8rf96p2na';
    this.zone = 'pt_scraping_browser_z1';
    this.refreshSession();
  }

  /**
   * Generate new session for IP rotation
   */
  private refreshSession() {
    // Multiple zones for IP diversity
    const zones = [
      'pt_scraping_browser_z1',
      'pt_scraping_browser_z2',
      'pt_scraping_browser_z3'
    ];

    // Rotate zones and include more entropy
    this.zone = zones[Math.floor(Math.random() * zones.length)];
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 12)}_${Math.floor(Math.random() * 9999)}`;
    this.browserWSEndpoint = `wss://brd-customer-${this.customerId}-zone-${this.zone}-session-${this.sessionId}:${this.password}@brd.superproxy.io:9222`;
    this.requestCount = 0;
    this.lastSessionReset = Date.now();

    console.log(`🔄 New Bright Data session: ${this.sessionId.slice(-12)} (zone: ${this.zone})`);
  }

  /**
   * Check if we should rotate session based on requests or time
   */
  private shouldRotateSession(): boolean {
    const timeSinceReset = Date.now() - this.lastSessionReset;
    const maxSessionTime = 10 * 60 * 1000; // 10 minutes

    return this.requestCount >= this.maxRequestsPerSession ||
           timeSinceReset >= maxSessionTime;
  }
  
  /**
   * Scrape BaT auction results with real browser rendering
   * @param modelUrl - The URL to scrape
   * @param existingUrls - Set of URLs we've already saved (for duplicate detection)
   * @param maxPages - Maximum number of "pages" to load (each Show More click loads ~35 items)
   */
  async scrapeBaTResults(modelUrl: string, existingUrls: Set<string> = new Set(), maxPages: number = 2): Promise<any> {
    console.log(`\n🌐 Connecting to Bright Data...`);

    // Check if we should rotate session
    if (this.shouldRotateSession()) {
      console.log(`🔄 Session rotation triggered (${this.requestCount} requests, ${Math.round((Date.now() - this.lastSessionReset) / 60000)}min)`);
      this.refreshSession();
    }

    this.requestCount++;
    let browser;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Connect to Bright Data's browser
        browser = await puppeteer.connect({
          browserWSEndpoint: this.browserWSEndpoint,
        });

      const page = await browser.newPage();

      // Random viewport and user agent for stealth
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      ];

      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 }
      ];

      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
      const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];

      await page.setViewport(randomViewport);
      await page.setUserAgent(randomUA);

      // Enhanced headers for stealth
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      // Add stealth behaviors
      await page.evaluateOnNewDocument(() => {
        // Hide webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });

      console.log(`🎭 Using viewport: ${randomViewport.width}x${randomViewport.height}`);

      // Random delay before navigation (human-like behavior)
      const randomDelay = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

      const initialDelay = randomDelay(1000, 3000);
      console.log(`⏳ Random delay: ${initialDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, initialDelay));

      console.log('📄 Loading page...');
      await page.goto(modelUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      console.log('⏳ Finding auction results...');
      
      // First, scroll down to load the auction results section
      await page.evaluate(() => {
        // Find the results anchor or section
        const resultsSection = document.querySelector('#results-anchor') || 
                              document.querySelector('.auctions-completed') ||
                              document.querySelector('[class*="results"]');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          // Scroll to bottom to trigger lazy loading
          window.scrollTo(0, document.body.scrollHeight);
        }
      });
      
      // Wait a bit for content to load after scrolling
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Click "Show More" button repeatedly until all listings are loaded
      let clickCount = 0;
      // Each "Show More" click loads about 35-40 items, so maxPages * 35 gives us a reasonable approximation
      const maxClicks = Math.min(maxPages, 50); // Use maxPages but cap at 50 for safety
      const clicksToCheck = 3; // Check duplicates after every N clicks
      const itemsPerLoad = 20; // Approximate items loaded per click
      const duplicateThreshold = 0.8; // Stop if 80% of recent items are duplicates
      
      while (clickCount < maxClicks) {
        try {
          // After every few clicks, check if recent batches are mostly duplicates
          if (existingUrls.size > 0 && clickCount > 0 && clickCount % clicksToCheck === 0) {
            const recentDuplicates = await page.evaluate((existingUrlsArray, itemsToCheck) => {
              const items = document.querySelectorAll('.content');
              let duplicates = 0;
              let totalChecked = 0;
              
              // Check the last N * 20 items (items from last N "Show More" clicks)
              const startIndex = Math.max(0, items.length - itemsToCheck);
              for (let i = startIndex; i < items.length; i++) {
                const linkEl = items[i].querySelector('h3 a') as HTMLAnchorElement;
                if (linkEl) {
                  totalChecked++;
                  if (existingUrlsArray.includes(linkEl.href)) {
                    duplicates++;
                  }
                }
              }
              
              return { duplicates, totalChecked };
            }, Array.from(existingUrls), clicksToCheck * itemsPerLoad);
            
            const duplicateRatio = recentDuplicates.totalChecked > 0 
              ? recentDuplicates.duplicates / recentDuplicates.totalChecked 
              : 0;
            
            if (duplicateRatio >= duplicateThreshold) {
              console.log(`🛑 Found ${recentDuplicates.duplicates}/${recentDuplicates.totalChecked} duplicates (${Math.round(duplicateRatio * 100)}%) in last ${clicksToCheck} loads`);
              console.log('Stopping pagination - mostly seeing listings we already have');
              break;
            } else if (recentDuplicates.duplicates > 0) {
              console.log(`📊 Found ${recentDuplicates.duplicates}/${recentDuplicates.totalChecked} duplicates in recent loads, continuing...`);
            }
          }
          
          // Look for the exact button element from user's HTML
          const showMoreButton = await page.$('button.button.button-show-more[data-bind="click: loadNextPage"]');
          
          if (!showMoreButton) {
            console.log('✓ No more "Show More" buttons found - all listings loaded');
            break;
          }
          
          // Check if button is visible and not loading
          const isVisible = await page.evaluate((btn) => {
            const loadingSpan = btn.querySelector('span[data-bind="visible: itemsLoading"]');
            const showSpan = btn.querySelector('span[data-bind="hidden: itemsLoading"]');
            
            // Button is ready if "Show More" span is visible
            return showSpan && showSpan.style.display !== 'none';
          }, showMoreButton);
          
          if (!isVisible) {
            console.log('⏳ Waiting for listings to load...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          clickCount++;
          console.log(`🔄 Loading more listings... (${clickCount}/${maxClicks})`);

          await showMoreButton.click();
          
          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (e) {
          console.log('✓ Error clicking button - likely all content loaded');
          break;
        }
      }
      
      if (clickCount === maxClicks) {
        console.log('✓ Reached pagination limit');
      }
      
      // Extract sold listings after all content is loaded
      const soldListings = await page.evaluate(() => {
        const listings: any[] = [];
        
        // BaT structure: <a class="listing-card"><div class="content">...</div></a>
        const items = document.querySelectorAll('.content');
        console.log(`Found ${items.length} .content items`);
        
        items.forEach((item: any) => {
          // Check if this has the "Sold for" text in item-results
          const resultsEl = item.querySelector('.item-results');
          if (!resultsEl) return;
          
          const resultsText = resultsEl.textContent || '';
          
          // Check if it's sold (not just bid to)
          if (resultsText.includes('Sold for')) {
            // The parent <a> tag contains the URL
            const parentLink = item.closest('a.listing-card');
            // The title is in the h3 inside .content
            const titleEl = item.querySelector('h3');
            
            if (!parentLink || !titleEl) return;
            
            const url = parentLink.href;
            const title = titleEl.textContent?.trim() || '';
            
            // Extract price from "Sold for USD $XXX"
            const priceMatch = resultsText.match(/\$([0-9,]+)/);
            const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
            
            // Skip if price too low (not a real car) or if it's parts/accessories
            if (price < 15000) return;
            
            // Skip non-car items (wheels, seats, tools, etc.)
            const titleLower = title.toLowerCase();
            if (titleLower.includes('wheel') || titleLower.includes('seat') || 
                titleLower.includes('tool') || titleLower.includes('kit') ||
                titleLower.includes('emblem') || titleLower.includes('manual')) {
              // But don't skip if it's actually a car (e.g., "1985 Porsche 911 with Tool Kit")
              // Only skip if Porsche model number is NOT in the title
              if (!titleLower.includes('911') && !titleLower.includes('718') && 
                  !titleLower.includes('boxster') && !titleLower.includes('cayman') &&
                  !titleLower.includes('gt3') && !titleLower.includes('gt2') &&
                  !titleLower.includes('gt4') && !titleLower.includes('turbo')) {
                return;
              }
            }
            
            listings.push({
              url: url,
              title: title,
              price: price,
              text: resultsText,
            });
          }
        });
        
        console.log(`Extracted ${listings.length} sold listings from DOM`);
        return listings;
      });
      
      console.log(`📦 Extracted ${soldListings.length} sold listings from page`);
      
      // Get the full HTML for storage
      const html = await page.content();
      
      await browser.close();

        return { listings: soldListings, html };

      } catch (error: any) {
        retryCount++;
        const errorMsg = error.message.includes('timeout')
          ? 'Page load timeout (60s)'
          : error.message;

        // Check if it's a retryable error
        const isRetryableError = error.message.includes('403') ||
                                error.message.includes('500') ||
                                error.message.includes('timeout') ||
                                error.message.includes('Navigation');

        console.error(`❌ Browser error (attempt ${retryCount}/${maxRetries}): ${errorMsg}`);

        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            // Ignore close errors
          }
          browser = undefined;
        }

        if (retryCount < maxRetries && isRetryableError) {
          // Force session rotation on retryable errors
          console.log(`🔄 Rotating session due to error: ${errorMsg}`);
          this.refreshSession();

          // Exponential backoff with jitter
          const baseDelay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          const jitter = Math.random() * 1000; // 0-1s random
          const delay = baseDelay + jitter;

          console.log(`⏳ Waiting ${Math.round(delay/1000)}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry the loop
        }

        // All retries exhausted or non-retryable error
        throw error;
      }
    }
  }
  
  /**
   * Scrape a single BaT listing page
   */
  async scrapeListingPage(url: string): Promise<any> {
    // Check if we should rotate session for individual listings
    if (this.shouldRotateSession()) {
      this.refreshSession();
    }

    this.requestCount++;
    let browser;
    let retryCount = 0;
    const maxRetries = 2; // Fewer retries for individual listings

    while (retryCount < maxRetries) {
      try {
        browser = await puppeteer.connect({
          browserWSEndpoint: this.browserWSEndpoint,
        });

      const page = await browser.newPage();
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });
      
      // Extract listing data
      const listingData = await page.evaluate(() => {
        const data: any = {};
        
        // Title
        data.title = document.querySelector('h1')?.textContent?.trim();
        
        // Price (sold or current bid)
        const priceText = document.body.textContent || '';
        const soldMatch = priceText.match(/Sold for \$([0-9,]+)/);
        const bidMatch = priceText.match(/Current Bid:.*?\$([0-9,]+)/);
        
        if (soldMatch) {
          data.price = parseInt(soldMatch[1].replace(/,/g, ''));
          data.status = 'sold';
        } else if (bidMatch) {
          data.price = parseInt(bidMatch[1].replace(/,/g, ''));
          data.status = 'active';
        }
        
        // Other details
        data.year = priceText.match(/(\d{4})\s+Porsche/)?.[1];
        data.mileage = priceText.match(/([0-9,]+)\s+miles/i)?.[1];
        
        return data;
      });
      
      const html = await page.content();
      
      await browser.close();
        return { ...listingData, html };

      } catch (error: any) {
        retryCount++;
        const isRetryableError = error.message.includes('403') ||
                                error.message.includes('500') ||
                                error.message.includes('timeout');

        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            // Ignore close errors
          }
          browser = undefined;
        }

        if (retryCount < maxRetries && isRetryableError) {
          // Rotate session on error
          this.refreshSession();
          const delay = 2000 + Math.random() * 2000; // 2-4s delay
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        }

        // Rethrow after exhausting retries
        throw error;
      }
    }
  }
}