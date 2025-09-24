import { BaseScraper, ScraperResult } from './base'
import { HTMLStorageService } from '../services/html-storage'
import axios from 'axios'
import * as cheerio from 'cheerio'

export class CarMaxScraper extends BaseScraper {
  constructor() {
    super('carmax');
  }

  private getSearchUrl(model?: string, page = 1): string {
    const baseUrl = 'https://www.carmax.com/cars/porsche';

    if (model && model !== 'all') {
      return `${baseUrl}/${model.toLowerCase()}`;
    }

    // Add page parameter if needed
    const params = new URLSearchParams();
    if (page > 1) {
      params.set('page', page.toString());
    }

    return baseUrl + (params.toString() ? `?${params.toString()}` : '');
  }

  async scrapeListings(params?: {
    model?: string;
    maxPages?: number;
    storeHtml?: boolean;
  }): Promise<ScraperResult[]> {
    console.log(`🔄 Starting CarMax scraping...`);

    const maxPages = params?.maxPages || 5;
    const model = params?.model || 'all';
    const storeHtml = params?.storeHtml !== false;

    const allListings: ScraperResult[] = [];
    const htmlStorage = new HTMLStorageService();

    try {
      for (let page = 1; page <= maxPages; page++) {
        console.log(`📄 Scraping CarMax page ${page}/${maxPages} for ${model}...`);

        const searchUrl = this.getSearchUrl(model, page);
        console.log(`🔗 URL: ${searchUrl}`);

        // Fetch page with proper headers
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none'
          },
          timeout: 30000
        });

        if (storeHtml) {
          await htmlStorage.storeScrapedHTML({
            source: 'carmax',
            url: searchUrl,
            html: response.data,
            type: 'search',
            model: model || 'all',
            metadata: { page }
          });
        }

        // Parse HTML
        const $ = cheerio.load(response.data);

        // Look for JSON data in script tags
        let vehicleData: any[] = [];
        $('script').each((_, element) => {
          try {
            const scriptContent = $(element).html() || '';

            // Look for vehicle data in various formats
            if (scriptContent.includes('window.__INITIAL_STATE__') ||
                scriptContent.includes('window.__APOLLO_STATE__') ||
                scriptContent.includes('"vehicles"') ||
                scriptContent.includes('"searchResults"')) {

              // Try to extract JSON
              const jsonMatch = scriptContent.match(/(\{.*\})/s);
              if (jsonMatch) {
                const data = JSON.parse(jsonMatch[1]);

                // Look for vehicle arrays in various paths
                const vehicles = this.extractVehiclesFromData(data);
                if (vehicles.length > 0) {
                  vehicleData.push(...vehicles);
                }
              }
            }
          } catch (error) {
            // Continue searching other scripts
          }
        });

        console.log(`📊 Found ${vehicleData.length} vehicles in script data`);

        // Process each vehicle from JSON data
        for (const vehicle of vehicleData) {
          try {
            const listing = await this.parseVehicleData(vehicle);
            if (listing) {
              allListings.push(listing);
            }
          } catch (error) {
            console.error('Error parsing vehicle data:', error);
          }
        }

        // If no JSON data found, try HTML parsing
        if (vehicleData.length === 0) {
          const htmlListings = await this.parseHtmlListings($, searchUrl);
          allListings.push(...htmlListings);
        }

        // Check if there are more pages
        const hasNextPage = this.checkForNextPage($, page);
        if (!hasNextPage && page < maxPages) {
          console.log(`📄 No more pages found after page ${page}`);
          break;
        }

        // Rate limiting
        if (page < maxPages) {
          const delay = 2000 + Math.random() * 2000; // 2-4 seconds
          console.log(`⏱️  Waiting ${Math.round(delay)}ms before next page...`);
          await this.delay(delay);
        }
      }

      console.log(`✅ CarMax scraping completed: ${allListings.length} listings found`);
      return allListings;

    } catch (error) {
      console.error('❌ CarMax scraping failed:', error);
      throw error;
    }
  }

  private extractVehiclesFromData(data: any): any[] {
    const vehicles: any[] = [];

    // Recursively search for vehicle arrays
    const search = (obj: any) => {
      if (Array.isArray(obj)) {
        // Check if this array contains vehicle objects
        obj.forEach(item => {
          if (item && typeof item === 'object') {
            if (this.isVehicleObject(item)) {
              vehicles.push(item);
            } else {
              search(item);
            }
          }
        });
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(value => {
          if (value && typeof value === 'object') {
            search(value);
          }
        });
      }
    };

    search(data);
    return vehicles;
  }

  private isVehicleObject(obj: any): boolean {
    // Check if object has vehicle-like properties
    const vehicleProps = ['make', 'model', 'year', 'price', 'mileage', 'vin'];
    const hasProps = vehicleProps.filter(prop => obj.hasOwnProperty(prop)).length;
    return hasProps >= 3; // At least 3 vehicle properties
  }

  private async parseVehicleData(vehicle: any): Promise<ScraperResult | null> {
    try {
      // Extract basic vehicle information
      const year = parseInt(vehicle.year || vehicle.modelYear || '');
      const make = vehicle.make || vehicle.manufacturer || '';
      const model = vehicle.model || '';
      const trim = vehicle.trim || vehicle.trimLevel || '';

      // Skip non-Porsche vehicles
      if (make.toLowerCase() !== 'porsche') {
        return null;
      }

      // Extract pricing
      const price = parseInt(vehicle.price || vehicle.listPrice || vehicle.internetPrice || '0');

      // Extract mileage
      const mileage = parseInt(vehicle.mileage || vehicle.odometer || '0');

      // Extract colors
      const exteriorColor = vehicle.exteriorColor || vehicle.color || '';
      const interiorColor = vehicle.interiorColor || '';

      // Extract transmission
      const transmission = vehicle.transmission || vehicle.transmissionType || '';

      // Extract VIN
      const vin = vehicle.vin || vehicle.vehicleIdentificationNumber || '';

      // Extract URL
      const stockId = vehicle.stockId || vehicle.id || '';
      const url = stockId ? `https://www.carmax.com/car/${stockId}` : '';

      // Extract location (CarMax store)
      let location: any = {};
      if (vehicle.store || vehicle.location) {
        const store = vehicle.store || vehicle.location;
        location = {
          city: store.city || '',
          state: store.state || store.stateCode || '',
          zip: store.zipCode || store.zip || ''
        };
      }

      // CarMax-specific features
      const carMaxWarranty = true; // CarMax offers warranty on all vehicles
      const carMaxInspection = true; // CarMax 125-point inspection

      const result: ScraperResult = {
        title: `${year} ${make} ${model} ${trim}`.trim(),
        price,
        year,
        model,
        trim: trim || undefined,
        mileage: mileage > 0 ? mileage : undefined,
        vin: vin || undefined,
        exterior_color: exteriorColor || undefined,
        interior_color: interiorColor || undefined,
        transmission: transmission || undefined,
        source_url: url || '',
        location,
        dealer_name: 'CarMax',
        is_dealer: true,
        raw_data: {
          ...vehicle,
          carMaxWarranty,
          carMaxInspection,
          stockId
        },
        source: 'carmax'
      };

      return result;

    } catch (error) {
      console.error('Error parsing CarMax vehicle data:', error);
      return null;
    }
  }

  private async parseHtmlListings($: cheerio.CheerioAPI, searchUrl: string): Promise<ScraperResult[]> {
    console.log('📋 Falling back to CarMax HTML parsing...');

    const listings: ScraperResult[] = [];

    // Try to find vehicle cards or listings in HTML
    $('.car-tile, .vehicle-card, .search-result, [data-test="car-tile"]').each((_, element) => {
      try {
        const $card = $(element);

        // Extract basic info from HTML
        const title = $card.find('h3, h4, .car-make-model, [data-test="car-year-make-model"]').first().text().trim();
        const priceText = $card.find('.car-price, .price, [data-test="car-price"]').first().text().replace(/[^0-9]/g, '');
        const price = parseInt(priceText) || 0;

        // Extract mileage
        const mileageText = $card.find('.car-miles, .mileage, [data-test="car-mileage"]').first().text().replace(/[^0-9]/g, '');
        const mileage = parseInt(mileageText) || undefined;

        // Extract detail URL
        const detailLink = $card.find('a[href*="/car/"]').first();
        const detailUrl = detailLink.attr('href');
        const fullDetailUrl = detailUrl ? (detailUrl.startsWith('http') ? detailUrl : `https://www.carmax.com${detailUrl}`) : searchUrl;

        if (title && price > 0) {
          // Parse year, make, model from title
          const titleParts = title.split(' ');
          const year = parseInt(titleParts[0]) || undefined;
          const make = titleParts[1] || '';
          const model = titleParts[2] || '';
          const trim = titleParts.slice(3).join(' ') || '';

          if (make.toLowerCase() === 'porsche') {
            const result: ScraperResult = {
              title,
              price,
              year,
              model,
              trim: trim || undefined,
              mileage,
              source_url: fullDetailUrl,
              dealer_name: 'CarMax',
              is_dealer: true,
              source: 'carmax'
            };

            listings.push(result);
          }
        }
      } catch (error) {
        console.error('Error parsing CarMax HTML listing:', error);
      }
    });

    console.log(`📊 Found ${listings.length} listings via HTML parsing`);
    return listings;
  }

  private checkForNextPage($: cheerio.CheerioAPI, currentPage: number): boolean {
    // Look for next page button or higher page numbers
    const nextPageExists = $(`.pagination a:contains("${currentPage + 1}"), .next-page, [data-test="next-page"]`).length > 0;
    return nextPageExists;
  }

  async scrapeDetail(url: string): Promise<ScraperResult> {
    console.log(`🔍 Scraping CarMax detail page: ${url}`);

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // Look for vehicle data in script tags first
      let vehicleData: any = null;
      $('script').each((_, element) => {
        try {
          const scriptContent = $(element).html() || '';
          if (scriptContent.includes('"vehicle"') || scriptContent.includes('"car"')) {
            const jsonMatch = scriptContent.match(/(\{.*\})/s);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[1]);
              const vehicles = this.extractVehiclesFromData(data);
              if (vehicles.length > 0) {
                vehicleData = vehicles[0];
                return false; // Break the loop
              }
            }
          }
        } catch (error) {
          // Continue searching
        }
      });

      if (vehicleData) {
        const listing = await this.parseVehicleData(vehicleData);
        if (listing) {
          listing.html = response.data;
          return listing;
        }
      }

      // Fallback to HTML parsing
      const title = $('h1, .vehicle-title, .car-year-make-model').first().text().trim() || 'Unknown Vehicle';
      const priceText = $('.car-price, .price, .vehicle-price').first().text().replace(/[^0-9]/g, '');
      const price = parseInt(priceText) || 0;

      const result: ScraperResult = {
        title,
        price,
        source_url: url,
        html: response.data,
        dealer_name: 'CarMax',
        is_dealer: true,
        source: 'carmax'
      };

      return result;

    } catch (error) {
      console.error(`❌ Failed to scrape CarMax detail page ${url}:`, error);
      throw error;
    }
  }
}