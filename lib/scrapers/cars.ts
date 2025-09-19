import * as cheerio from 'cheerio';
import { SharedScraper } from './shared-scraper';
import { ScraperResult } from './base';

const CARS_CONFIG = {
  name: 'Cars.com',
  source: 'cars',
  baseUrl: 'https://www.cars.com',
  searchPaths: [
    // Using the same URL pattern from the Python script
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-911&page_size=50&zip=90210',
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-718_cayman&page_size=50&zip=90210',
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-718_boxster&page_size=50&zip=90210',
  ],
  selectors: {
    listings: 'div.vehicle-card, article.car-card, a[href*="/vehicledetail/"]',
    title: 'h1.listing-title, h1',  // h1 works for detail pages
    price: 'span.primary-price',  // Better selector for price
    year: '',  // Will extract from title
    mileage: 'dd:contains("mi.")',  // Mileage is in dd element
    location: '.dealer-name, .seller-name',
    status: '[class*="sold"]',
    images: 'img.vehicle-image, img[data-testid="vehicle-image"]',
    description: '.description'
  },
  pagination: {
    type: 'page' as const,
    param: 'page'
  }
};

export class CarsScraper extends SharedScraper {
  constructor() {
    super(CARS_CONFIG);
  }

  async scrapeDetail(url: string): Promise<ScraperResult | null> {
    try {
      const html = await this.fetchUrl(url, 'detail');
      const $ = cheerio.load(html);
      
      // Get title from h1
      const title = $('h1').first().text().trim();
      
      // Extract year from title
      const year = this.extractYear(title);
      
      // Get price from span.primary-price
      const priceText = $('span.primary-price').first().text().trim();
      const price = this.extractPrice(priceText);
      
      // Extract VIN from page
      const bodyText = $('body').text();
      const vinMatch = bodyText.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
      const vin = vinMatch ? vinMatch[1] : undefined;
      
      // Get mileage - look for dd element after "Mileage" dt
      let mileage: number | undefined;
      $('dt').each((i, el) => {
        if ($(el).text().includes('Mileage')) {
          const mileageText = $(el).next('dd').text().trim();
          mileage = this.extractMileage(mileageText);
        }
      });
      
      // Get location/dealer
      const dealer = $('.dealer-name').first().text().trim() || 
                    $('.seller-name').first().text().trim();
      
      // Extract model and trim from title
      let model = '911';  // Default
      let trim: string | undefined;
      
      if (title.includes('718')) {
        model = title.includes('Cayman') ? '718 Cayman' : '718 Boxster';
      }
      
      // Extract trim (GT3, GT4, Turbo, etc.)
      const trimPatterns = ['GT4 RS', 'GT4', 'GT3 RS', 'GT3', 'GT2 RS', 'GT2', 'Turbo S', 'Turbo', 'Carrera S', 'Carrera', 'Targa', 'GTS', 'S'];
      for (const pattern of trimPatterns) {
        if (title.includes(pattern)) {
          trim = pattern;
          break;
        }
      }
      
      // Check if listing is sold (Cars.com marks sold vehicles)
      const isSold = $('.sold-badge').length > 0 || 
                     $('[class*="sold"]').length > 0 ||
                     bodyText.toLowerCase().includes('sold');
      
      // Get listing date if available
      const listingDate = $('[data-testid="listed-date"]').text().trim() ||
                         $('.listing-date').text().trim();
      
      // Get exterior color
      let exteriorColor: string | undefined;
      $('dt').each((i, el) => {
        if ($(el).text().includes('Exterior')) {
          exteriorColor = $(el).next('dd').text().trim();
        }
      });
      
      return {
        title,
        price: price || 0,
        year,
        model,
        trim,
        mileage,
        vin,
        source_url: url,
        source_id: `cars_${vin || url.split('/').slice(-2)[0]}`,
        dealer_name: dealer,
        is_dealer: !!dealer,
        status: isSold ? 'sold' : 'active',
        scraped_at: new Date(),
        exterior_color: exteriorColor,
        raw_data: { title, price: priceText, mileage, status: isSold ? 'sold' : 'active' }
      };
    } catch (error) {
      console.error('Error scraping Cars.com detail:', error);
      return null;
    }
  }

  protected extractPrice(text: string): number | null {
    const cleaned = text.replace(/[^0-9]/g, '');
    const price = parseInt(cleaned);
    return isNaN(price) || price < 1000 ? null : price;
  }

  protected extractYear(text: string): number | null {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
  }

  protected extractMileage(text: string): number | null {
    const cleaned = text.replace(/[^0-9]/g, '');
    const mileage = parseInt(cleaned);
    return isNaN(mileage) ? null : mileage;
  }

  async scrapeListings(params?: { 
    model?: string; 
    maxPages?: number;
    onlySold?: boolean;
  }): Promise<ScraperResult[]> {
    const results: ScraperResult[] = [];
    const processedUrls = new Set<string>();
    const maxPages = params?.maxPages || 3;
    
    try {
      await this.startIngestion();
      
      for (const searchPath of this.config.searchPaths.slice(0, 3)) {
        console.log(`Scraping Cars.com: ${this.baseUrl}${searchPath}`);
        
        for (let page = 1; page <= maxPages; page++) {
          const url = this.buildSearchUrl(searchPath, page);
          
          try {
            const html = await this.fetchUrl(url, 'search');
            const $ = cheerio.load(html);
            
            // CRITICAL: First try to extract embedded JSON data (like BaT)
            const jsonListings = this.extractJsonListings($);
            console.log(`Found ${jsonListings.length} Cars.com listings in embedded JSON`);
            
            for (const listing of jsonListings) {
              if (!processedUrls.has(listing.source_url)) {
                processedUrls.add(listing.source_url);
                results.push(listing);
                await this.saveListing(listing);
                console.log(`Saved Cars.com listing: ${listing.title} - $${listing.price}`);
              }
            }
            
            // Then try HTML scraping as fallback
            const htmlListings = $(this.config.selectors.listings).toArray();
            console.log(`Found ${htmlListings.length} Cars.com listings in HTML`);
            
            if (htmlListings.length === 0 && jsonListings.length === 0) {
              console.log(`No listings found on Cars.com page ${page}`);
              break;
            }
            
            // Process HTML listings
            for (const element of htmlListings.slice(0, 10)) {
              const $card = $(element);
              
              let listingUrl: string | undefined;
              const link = $card.find('a[href*="/vehicledetail/"]').first();
              if (link.length) {
                listingUrl = link.attr('href');
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
                  results.push(detail);
                  await this.saveListing(detail);
                  console.log(`Successfully scraped Cars.com: ${detail.title} - $${detail.price}`);
                }
              } catch (error) {
                console.error(`Failed to scrape Cars.com detail:`, error);
              }
              
              await this.delay(1000 + Math.random() * 500);
            }
          } catch (error) {
            console.error(`Failed to scrape Cars.com page ${page}:`, error);
          }
        }
      }
      
      await this.completeIngestion();
      return results;
    } catch (error) {
      console.error(`Cars.com scraping failed:`, error);
      await this.updateIngestion({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private extractJsonListings($: cheerio.CheerioAPI): ScraperResult[] {
    const listings: ScraperResult[] = [];
    
    try {
      // Look for embedded JSON in script tags (same approach as Python script)
      $('script').each((_, script) => {
        const scriptText = $(script).html();
        if (!scriptText) return;
        
        // Check for Cars.com's JSON data patterns
        if (scriptText.includes('window.__CARS_DATA__') || 
            scriptText.includes('window.__INITIAL_STATE__')) {
          
          // Extract JSON using regex
          const jsonMatch = scriptText.match(/=\s*({.*?});/s);
          if (jsonMatch) {
            try {
              const data = JSON.parse(jsonMatch[1]);
              
              // Navigate through possible data structures (from Python script)
              let vehicles: any[] = [];
              if (data.listings) {
                vehicles = data.listings;
              } else if (data.searchResults?.listings) {
                vehicles = data.searchResults.listings;
              } else if (data.initialState?.search?.listings) {
                vehicles = data.initialState.search.listings;
              }
              
              for (const vehicle of vehicles) {
                const listing: ScraperResult = {
                  title: `${vehicle.year || ''} Porsche ${vehicle.model || ''} ${vehicle.trim || ''}`.trim(),
                  price: vehicle.price || vehicle.listPrice || 0,
                  year: vehicle.year,
                  model: this.normalizeModel(vehicle.model),
                  trim: vehicle.trim,
                  mileage: vehicle.mileage,
                  vin: vehicle.vin,
                  source_url: vehicle.url || `https://www.cars.com/vehicledetail/${vehicle.id || vehicle.vin}/`,
                  source_id: `cars_${vehicle.id || vehicle.vin}`,
                  exterior_color: vehicle.exteriorColor,
                  interior_color: vehicle.interiorColor,
                  transmission: vehicle.transmission,
                  dealer_name: vehicle.dealerName,
                  is_dealer: !!vehicle.dealerName,
                  location: {
                    city: vehicle.city,
                    state: vehicle.state,
                    zip: vehicle.zip
                  },
                  raw_data: vehicle
                };
                
                if (listing.price && listing.price >= 15000) {
                  listings.push(listing);
                }
              }
            } catch (parseError) {
              console.error('Failed to parse Cars.com JSON:', parseError);
            }
          }
        }
      });
    } catch (error) {
      console.error('Error extracting Cars.com JSON listings:', error);
    }
    
    return listings;
  }

  private normalizeModel(model: string): string {
    if (!model) return '911'; // Default
    
    if (model.includes('718') || model.includes('Cayman')) {
      return '718 Cayman';
    }
    if (model.includes('718') || model.includes('Boxster')) {
      return '718 Boxster';
    }
    if (model.includes('911')) {
      return '911';
    }
    
    return model;
  }
}