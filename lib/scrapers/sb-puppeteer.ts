export class ScrapingBeePuppeteer {
  private apiKey: string;
  private baseUrl: string = 'https://app.scrapingbee.com/api/v1';
  private requestCount: number = 0;
  private maxRequestsPerSession: number = 30;
  private lastSessionReset: number = Date.now();

  constructor() {
    this.apiKey = process.env.SCRAPINGBEE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('SCRAPINGBEE_API_KEY environment variable is required');
    }
    console.log('🐝 ScrapingBee initialized');
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
   * Reset session counters
   */
  private resetSession() {
    this.requestCount = 0;
    this.lastSessionReset = Date.now();
    console.log(`🔄 ScrapingBee session reset`);
  }

  /**
   * Make a request through ScrapingBee API
   */
  private async makeScrapingBeeRequest(url: string, options: any = {}): Promise<any> {
    // Build base parameters
    const params: any = {
      api_key: this.apiKey,
      url: url,
      render_js: 'true',
      premium_proxy: 'true',
      country_code: 'us',
      block_ads: 'true',
      json_response: 'true',  // Get detailed response with js_scenario_report
    };

    // Add js_scenario if provided (must be stringified)
    if (options.js_scenario) {
      params.js_scenario = options.js_scenario;
      delete options.js_scenario;
    }

    // Add extract_rules if provided (must be stringified)
    if (options.extract_rules) {
      params.extract_rules = options.extract_rules;
      delete options.extract_rules;
    }

    // Add any other options
    Object.assign(params, options);

    // Convert to URLSearchParams
    const urlParams = new URLSearchParams(params);

    const response = await fetch(`${this.baseUrl}?${urlParams.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ScrapingBee error (${response.status}): ${errorText}`);
    }

    const responseData = await response.json();
    return responseData;
  }

  /**
   * Scrape BaT auction results with ScrapingBee
   * @param modelUrl - The URL to scrape
   * @param existingUrls - Set of URLs we've already saved (for duplicate detection)
   * @param maxPages - Maximum number of "pages" to load (each Show More click loads ~35 items)
   */
  async scrapeBaTResults(modelUrl: string, existingUrls: Set<string> = new Set(), maxPages: number = 2): Promise<any> {
    console.log(`\n🐝 Connecting to ScrapingBee...`);

    // Check if we should rotate session
    if (this.shouldRotateSession()) {
      console.log(`🔄 Session rotation triggered (${this.requestCount} requests, ${Math.round((Date.now() - this.lastSessionReset) / 60000)}min)`);
      this.resetSession();
    }

    this.requestCount++;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log('📄 Loading page via ScrapingBee...');

        // Build JavaScript scenario instructions
        const instructions: any[] = [
          // Wait for initial content
          { wait_for: '.content' },
          // Scroll to results section
          { evaluate: `
            const resultsSection = document.querySelector('#results-anchor') ||
                                 document.querySelector('.auctions-completed') ||
                                 document.querySelector('[class*="results"]');
            if (resultsSection) {
              resultsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
              window.scrollTo(0, document.body.scrollHeight);
            }
          ` },
          { wait: 2000 }
        ];

        // Add Show More clicks based on maxPages
        for (let i = 0; i < maxPages; i++) {
          // Try to click Show More button
          instructions.push({
            evaluate: `
              (function() {
                const showMoreButton = document.querySelector('button.button.button-show-more[data-bind="click: loadNextPage"]');
                if (showMoreButton) {
                  const loadingSpan = showMoreButton.querySelector('span[data-bind="visible: itemsLoading"]');
                  const showSpan = showMoreButton.querySelector('span[data-bind="hidden: itemsLoading"]');

                  // Check if button is visible and not loading
                  if (showSpan && window.getComputedStyle(showSpan).display !== 'none') {
                    showMoreButton.click();
                    console.log('Clicked Show More button ${i + 1}');
                    return true;
                  }
                }
                return false;
              })()
            `
          });
          instructions.push({ wait: 3000 });
        }

        // Final extraction of listings - wrap in IIFE to allow return
        instructions.push({
          evaluate: `
            (function() {
              const listings = [];
              const items = document.querySelectorAll('.content');

              items.forEach((item) => {
                const resultsEl = item.querySelector('.item-results');
                if (!resultsEl) return;

                const resultsText = resultsEl.textContent || '';

                if (resultsText.includes('Sold for')) {
                  const parentLink = item.closest('a.listing-card');
                  const titleEl = item.querySelector('h3');

                  if (!parentLink || !titleEl) return;

                  const url = parentLink.href;
                  const title = titleEl.textContent?.trim() || '';

                  const priceMatch = resultsText.match(/\\$([0-9,]+)/);
                  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;

                  if (price < 15000) return;

                  // Skip non-car items
                  const titleLower = title.toLowerCase();
                  if (titleLower.includes('wheel') || titleLower.includes('seat') ||
                      titleLower.includes('tool') || titleLower.includes('kit') ||
                      titleLower.includes('emblem') || titleLower.includes('manual')) {
                    // But don't skip if it's actually a car
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
                    text: resultsText
                  });
                }
              });

              return listings;
            })()
          `
        });

        // Make the request with JavaScript scenario
        const jsScenario = { instructions };

        const response = await this.makeScrapingBeeRequest(modelUrl, {
          js_scenario: JSON.stringify(jsScenario),
          wait: '5000',  // Additional wait after scenario completes
          wait_browser: 'domcontentloaded'
        });

        // Parse the response
        let soldListings = [];
        let html = '';

        if (response.body) {
          html = response.body;

          // Check if we got evaluate results
          if (response.evaluate_results && response.evaluate_results.length > 0) {
            // Get the last evaluate result (our listing extraction)
            const lastResult = response.evaluate_results[response.evaluate_results.length - 1];
            if (Array.isArray(lastResult)) {
              soldListings = lastResult;
            }
          }

          // If no evaluate results, parse HTML manually
          if (soldListings.length === 0) {
            console.log('📦 No evaluate results, parsing HTML...');
            const cheerio = await import('cheerio');
            const $ = cheerio.load(html);

            $('.content').each((i, item) => {
              const resultsEl = $(item).find('.item-results');
              if (!resultsEl.length) return;

              const resultsText = resultsEl.text() || '';

              if (resultsText.includes('Sold for')) {
                const parentLink = $(item).closest('a.listing-card');
                const titleEl = $(item).find('h3');

                if (!parentLink.length || !titleEl.length) return;

                const url = parentLink.attr('href') || '';
                const title = titleEl.text()?.trim() || '';

                const priceMatch = resultsText.match(/\$([0-9,]+)/);
                const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;

                if (price >= 15000) {
                  soldListings.push({
                    url: url.startsWith('http') ? url : `https://bringatrailer.com${url}`,
                    title: title,
                    price: price,
                    text: resultsText
                  });
                }
              }
            });
          }
        }

        console.log(`📦 Extracted ${soldListings.length} sold listings from page`);

        // Log js_scenario_report if available
        if (response.js_scenario_report) {
          console.log(`📊 Scenario execution: ${response.js_scenario_report.status || 'completed'}`);
        }

        return { listings: soldListings, html };

      } catch (error: any) {
        retryCount++;
        const errorMsg = error.message.includes('timeout')
          ? 'Page load timeout'
          : error.message;

        // Check if it's a retryable error
        const isRetryableError = error.message.includes('403') ||
                                error.message.includes('500') ||
                                error.message.includes('timeout') ||
                                error.message.includes('Navigation');

        console.error(`❌ ScrapingBee error (attempt ${retryCount}/${maxRetries}): ${errorMsg}`);

        if (retryCount < maxRetries && isRetryableError) {
          // Reset session on retryable errors
          console.log(`🔄 Resetting session due to error: ${errorMsg}`);
          this.resetSession();

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

    throw new Error('Max retries exhausted');
  }

  /**
   * Scrape a single BaT listing page
   */
  async scrapeListingPage(url: string): Promise<any> {
    // Check if we should rotate session for individual listings
    if (this.shouldRotateSession()) {
      this.resetSession();
    }

    this.requestCount++;
    let retryCount = 0;
    const maxRetries = 2; // Fewer retries for individual listings

    while (retryCount < maxRetries) {
      try {
        // Simple wait for page load - detail pages don't need complex scenarios
        const response = await this.makeScrapingBeeRequest(url, {
          wait_for: 'h1.listing-title, h1',
          wait: '3000'
        });

        // Return the HTML from response
        const listingData = {
          html: response.body || '',
          title: response.title || null,
          status: response.status || 200
        };

        return listingData;

      } catch (error: any) {
        retryCount++;
        const isRetryableError = error.message.includes('403') ||
                                error.message.includes('500') ||
                                error.message.includes('timeout');

        if (retryCount < maxRetries && isRetryableError) {
          // Reset session on error
          this.resetSession();
          const delay = 2000 + Math.random() * 2000; // 2-4s delay
          await new Promise(resolve => setTimeout(resolve, delay));
          continue; // Retry
        }

        // Rethrow after exhausting retries
        throw error;
      }
    }

    throw new Error('Max retries exhausted');
  }
}