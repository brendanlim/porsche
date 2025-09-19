import * as cheerio from 'cheerio';
import { SharedScraper } from './shared-scraper';
import { ScraperResult } from './base';

export class AutoTraderScraper extends SharedScraper {
  constructor() {
    super('autotrader', {
      baseUrl: 'https://www.autotrader.com',
      name: 'AutoTrader',
      selectors: {
        listings: '[data-testid="inventory-listing"], .inventory-listing, article[data-listing-id]',
        title: 'h2, .listing-title',
        price: '[data-testid="price"], .price-main',
        mileage: '[data-testid="mileage"], .item:contains("miles")',
        vin: '[data-testid="vin"], .vin',
        dealer: '[data-testid="dealer-name"], .dealer-name',
        location: '[data-testid="location"], .location'
      }
    });
  }

  async scrapeListings(model: string, trim?: string, onlySold: boolean = false): Promise<ScraperResult[]> {
    const results: ScraperResult[] = [];
    
    // AutoTrader doesn't have sold listings - it's for active inventory only
    if (onlySold) {
      console.log('AutoTrader only provides active listings');
      return results;
    }

    try {
      // Build search URL for AutoTrader
      const baseUrl = 'https://www.autotrader.com/cars-for-sale/all-cars/porsche';
      const modelPath = model.toLowerCase().replace(' ', '-');
      const searchUrl = `${baseUrl}/${modelPath}/los-angeles-ca?searchRadius=500&marketExtension=include&showAccelerateBanner=false&sortBy=relevance&numRecords=100`;

      console.log(`🔍 Scraping AutoTrader for ${model} ${trim || ''}`);
      
      const html = await this.fetchUrl(searchUrl, 'search');
      const $ = cheerio.load(html);

      // Find all listing cards
      const listings = $('[data-testid="inventory-listing"], .inventory-listing, article[data-listing-id]');
      
      console.log(`Found ${listings.length} listings on AutoTrader`);

      for (let i = 0; i < listings.length; i++) {
        const listing = listings.eq(i);
        
        try {
          // Extract basic info from listing card
          const title = listing.find('h2, .listing-title').text().trim();
          const priceText = listing.find('[data-testid="price"], .price-main').text().trim();
          const price = this.extractPrice(priceText);
          
          // Extract year from title
          const year = this.extractYear(title);
          
          // Extract mileage
          const mileageText = listing.find('[data-testid="mileage"], .item:contains("miles")').text().trim();
          const mileage = this.extractMileage(mileageText);
          
          // Get detail URL
          const detailLink = listing.find('a[href*="/detail/"]').attr('href') ||
                           listing.find('a').first().attr('href');
          
          if (!detailLink) continue;
          
          const detailUrl = detailLink.startsWith('http') ? 
                           detailLink : 
                           `https://www.autotrader.com${detailLink}`;
          
          // Extract VIN if available on listing card
          let vin: string | undefined;
          const vinText = listing.find('[data-testid="vin"], .vin').text().trim();
          if (vinText && vinText.length === 17) {
            vin = vinText;
          }
          
          // Get dealer info
          const dealer = listing.find('[data-testid="dealer-name"], .dealer-name').text().trim();
          const location = listing.find('[data-testid="location"], .location').text().trim();
          
          // Extract trim from title
          let modelName = model;
          let trimName = trim;
          
          if (!trimName) {
            const trimPatterns = ['GT4 RS', 'GT4', 'GT3 RS', 'GT3', 'GT2 RS', 'Turbo S', 'Turbo', 'GTS', 'Carrera'];
            for (const pattern of trimPatterns) {
              if (title.includes(pattern)) {
                trimName = pattern;
                break;
              }
            }
          }
          
          // Get more details from the detail page if needed
          if (!vin && detailUrl) {
            const detailResult = await this.scrapeDetail(detailUrl);
            if (detailResult) {
              vin = detailResult.vin;
            }
          }
          
          const result: ScraperResult = {
            source_url: detailUrl,
            source_id: `autotrader_${vin || detailUrl.split('/').pop()}`,
            title,
            price: price || 0,
            year,
            model: modelName,
            trim: trimName,
            mileage,
            vin,
            dealer_name: dealer,
            location: location ? { city: location } : undefined,
            is_dealer: true, // AutoTrader is primarily dealers
            status: 'active', // All AutoTrader listings are active
            listing_date: new Date().toISOString(),
            raw_data: {
              title,
              price: priceText,
              mileage: mileageText,
              dealer,
              location
            }
          };
          
          results.push(result);
          
        } catch (error) {
          console.error(`Error parsing AutoTrader listing ${i}:`, error);
        }
      }

      // Check for pagination
      const nextButton = $('a[aria-label="Next"], .pagination-next');
      if (nextButton.length > 0 && results.length > 0) {
        console.log('More pages available on AutoTrader');
      }
      
    } catch (error) {
      console.error('Error scraping AutoTrader:', error);
    }

    console.log(`✅ Scraped ${results.length} active listings from AutoTrader`);
    return results;
  }

  async scrapeDetail(url: string): Promise<ScraperResult | null> {
    try {
      const html = await this.fetchUrl(url, 'detail');
      const $ = cheerio.load(html);
      
      // Extract basic info
      const title = $('h1').first().text().trim();
      const priceText = $('[data-testid="price"], .price-value').first().text().trim();
      const price = this.extractPrice(priceText);
      const year = this.extractYear(title);
      
      // Extract VIN
      const vinElement = $('[data-testid="vin"], .vin-value, dt:contains("VIN") + dd');
      const vin = vinElement.text().trim();
      
      // Extract mileage
      const mileageText = $('[data-testid="mileage"], dt:contains("Mileage") + dd').text().trim();
      const mileage = this.extractMileage(mileageText);
      
      // Extract colors
      const exteriorColor = $('dt:contains("Exterior") + dd, [data-testid="exterior-color"]').text().trim();
      const interiorColor = $('dt:contains("Interior") + dd, [data-testid="interior-color"]').text().trim();
      
      // Extract dealer
      const dealer = $('[data-testid="dealer-name"], .dealer-name').text().trim();
      
      // Extract model and trim from title
      let model = '911';  // Default
      let trim: string | undefined;
      
      if (title.includes('718')) {
        model = title.includes('Cayman') ? '718 Cayman' : '718 Boxster';
      }
      
      const trimPatterns = ['GT4 RS', 'GT4', 'GT3 RS', 'GT3', 'GT2 RS', 'Turbo S', 'Turbo', 'GTS', 'Carrera'];
      for (const pattern of trimPatterns) {
        if (title.includes(pattern)) {
          trim = pattern;
          break;
        }
      }
      
      return {
        source_url: url,
        source_id: `autotrader_${vin || url.split('/').pop()}`,
        title,
        price: price || 0,
        year,
        model,
        trim,
        mileage,
        vin: vin.length === 17 ? vin : undefined,
        exterior_color: exteriorColor,
        interior_color: interiorColor,
        dealer_name: dealer,
        is_dealer: true,
        status: 'active',
        raw_data: { title, price: priceText, mileage: mileageText }
      };
      
    } catch (error) {
      console.error('Error scraping AutoTrader detail page:', error);
      return null;
    }
  }

  private async scrapeDetailPage(url: string): Promise<Partial<ScraperResult> | null> {
    try {
      const html = await this.fetchUrl(url, 'detail');
      const $ = cheerio.load(html);
      
      // Extract VIN from detail page
      const vinElement = $('[data-testid="vin"], .vin-value, dt:contains("VIN") + dd');
      const vin = vinElement.text().trim();
      
      // Extract color
      const colorElement = $('dt:contains("Exterior") + dd, [data-testid="exterior-color"]');
      const exteriorColor = colorElement.text().trim();
      
      // Extract interior color
      const interiorElement = $('dt:contains("Interior") + dd, [data-testid="interior-color"]');
      const interiorColor = interiorElement.text().trim();
      
      // Extract options text
      const optionsText = $('.features-list, .options-list').text().trim();
      
      return {
        vin: vin.length === 17 ? vin : undefined,
        exterior_color: exteriorColor,
        interior_color: interiorColor,
        options_text: optionsText
      };
      
    } catch (error) {
      console.error('Error scraping AutoTrader detail page:', error);
      return null;
    }
  }

  private extractYear(text: string): number {
    const match = text.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0]) : new Date().getFullYear();
  }

  private extractMileage(text: string): number | undefined {
    const cleaned = text.replace(/[^0-9]/g, '');
    const mileage = parseInt(cleaned);
    return !isNaN(mileage) && mileage > 0 ? mileage : undefined;
  }

  private extractPrice(text: string): number | undefined {
    const cleaned = text.replace(/[^0-9]/g, '');
    const price = parseInt(cleaned);
    return !isNaN(price) && price > 0 ? price : undefined;
  }
}