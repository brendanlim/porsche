import { BaseScraper, ScraperResult } from './base'
import { HTMLStorageService } from '../services/html-storage-service'
import axios from 'axios'
import * as cheerio from 'cheerio'

export class CarvanaScraper extends BaseScraper {
  constructor() {
    super('carvana');
  }

  private getSearchUrl(model?: string, page = 1): string {
    const baseUrl = 'https://www.carvana.com/cars';
    const params = new URLSearchParams();

    // Add make filter
    params.set('make', 'Porsche');

    if (model && model !== 'all') {
      params.set('model', model);
    }

    if (page > 1) {
      params.set('page', page.toString());
    }

    return `${baseUrl}?${params.toString()}`;
  }

  async scrapeListings(params?: {
    model?: string;
    maxPages?: number;
    storeHtml?: boolean;
  }): Promise<ScraperResult[]> {
    console.log(`🔄 Starting Carvana scraping...`);

    const maxPages = params?.maxPages || 3;
    const model = params?.model || 'all';
    const storeHtml = params?.storeHtml !== false;

    const allListings: ScraperResult[] = [];
    const htmlStorage = new HTMLStorageService();

    try {
      for (let page = 1; page <= maxPages; page++) {
        console.log(`📄 Scraping Carvana page ${page}/${maxPages} for ${model}...`);

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
          await htmlStorage.storeHtml({
            source: 'carvana',
            type: 'search',
            model: model || 'all',
            content: response.data,
            url: searchUrl,
            metadata: { page }
          });
        }

        // Parse HTML
        const $ = cheerio.load(response.data);

        // Look for vehicle data in script tags (Carvana uses React/Next.js)
        let vehicleData: any[] = [];
        $('script[id="__NEXT_DATA__"], script[type="application/json"]').each((_, element) => {
          try {
            const jsonText = $(element).html();
            if (jsonText) {
              const data = JSON.parse(jsonText);
              const vehicles = this.extractVehiclesFromNextData(data);
              vehicleData.push(...vehicles);
            }
          } catch (error) {
            console.warn('Failed to parse Carvana JSON data:', error);
          }
        });

        console.log(`📊 Found ${vehicleData.length} vehicles in JSON data`);

        // Process each vehicle
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

        // Check for next page
        const hasNextPage = $('.pagination .next, [data-test="next-page"]').length > 0;
        if (!hasNextPage) {
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

      console.log(`✅ Carvana scraping completed: ${allListings.length} listings found`);
      return allListings;

    } catch (error) {
      console.error('❌ Carvana scraping failed:', error);
      throw error;
    }
  }

  private extractVehiclesFromNextData(data: any): any[] {
    const vehicles: any[] = [];

    // Navigate the Next.js data structure to find vehicles
    try {
      if (data.props?.pageProps?.initialState?.vehicles) {
        vehicles.push(...data.props.pageProps.initialState.vehicles);
      }

      if (data.props?.pageProps?.searchResults?.vehicles) {
        vehicles.push(...data.props.pageProps.searchResults.vehicles);
      }

      // Look for vehicle arrays in other possible locations
      const search = (obj: any) => {
        if (Array.isArray(obj)) {
          obj.forEach(item => {
            if (item && typeof item === 'object' && this.isVehicleObject(item)) {
              vehicles.push(item);
            }
          });
        } else if (obj && typeof obj === 'object') {
          Object.values(obj).forEach(value => {
            if (Array.isArray(value)) {
              search(value);
            }
          });
        }
      };

      search(data);
    } catch (error) {
      console.warn('Error extracting vehicles from Next.js data:', error);
    }

    return vehicles;
  }

  private isVehicleObject(obj: any): boolean {
    // Check if object has vehicle-like properties
    const vehicleProps = ['make', 'model', 'year', 'price', 'mileage', 'vin'];
    const hasProps = vehicleProps.filter(prop => obj.hasOwnProperty(prop)).length;
    return hasProps >= 3;
  }

  private async parseVehicleData(vehicle: any): Promise<ScraperResult | null> {
    try {
      // Extract basic vehicle information
      const year = parseInt(vehicle.year || vehicle.modelYear || '');
      const make = vehicle.make || '';
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
      const transmission = vehicle.transmission || '';

      // Extract VIN
      const vin = vehicle.vin || '';

      // Extract URL
      const vehicleId = vehicle.id || vehicle.vehicleId || '';
      const url = vehicleId ? `https://www.carvana.com/vehicle/${vehicleId}` : '';

      // Carvana-specific features
      const carvanaCertified = true; // Carvana has their own inspection process
      const deliveryAvailable = true; // Carvana delivers cars
      const sevenDayReturn = true; // Carvana's 7-day return policy

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
        dealer_name: 'Carvana',
        is_dealer: true,
        raw_data: {
          ...vehicle,
          carvanaCertified,
          deliveryAvailable,
          sevenDayReturn
        },
        source: 'carvana'
      };

      return result;

    } catch (error) {
      console.error('Error parsing Carvana vehicle data:', error);
      return null;
    }
  }

  private async parseHtmlListings($: cheerio.CheerioAPI, searchUrl: string): Promise<ScraperResult[]> {
    console.log('📋 Falling back to Carvana HTML parsing...');

    const listings: ScraperResult[] = [];

    // Try to find vehicle cards in HTML
    $('.vehicle-card, .car-tile, .search-result-item, [data-test="vehicle-card"]').each((_, element) => {
      try {
        const $card = $(element);

        // Extract basic info from HTML
        const title = $card.find('h3, h4, .vehicle-title, [data-test="vehicle-name"]').first().text().trim();
        const priceText = $card.find('.price, .vehicle-price, [data-test="price"]').first().text().replace(/[^0-9]/g, '');
        const price = parseInt(priceText) || 0;

        // Extract mileage
        const mileageText = $card.find('.mileage, .vehicle-mileage, [data-test="mileage"]').first().text().replace(/[^0-9]/g, '');
        const mileage = parseInt(mileageText) || undefined;

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
              source_url: searchUrl,
              dealer_name: 'Carvana',
              is_dealer: true,
              source: 'carvana'
            };

            listings.push(result);
          }
        }
      } catch (error) {
        console.error('Error parsing Carvana HTML listing:', error);
      }
    });

    console.log(`📊 Found ${listings.length} listings via HTML parsing`);
    return listings;
  }

  async scrapeDetail(url: string): Promise<ScraperResult> {
    console.log(`🔍 Scraping Carvana detail page: ${url}`);

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

      // Look for vehicle data in Next.js data
      let vehicleData: any = null;
      $('script[id="__NEXT_DATA__"]').each((_, element) => {
        try {
          const jsonText = $(element).html();
          if (jsonText) {
            const data = JSON.parse(jsonText);
            const vehicles = this.extractVehiclesFromNextData(data);
            if (vehicles.length > 0) {
              vehicleData = vehicles[0];
              return false; // Break the loop
            }
          }
        } catch (error) {
          console.warn('Failed to parse Next.js data:', error);
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
      const title = $('h1, .vehicle-title').first().text().trim() || 'Unknown Vehicle';
      const priceText = $('.price, .vehicle-price').first().text().replace(/[^0-9]/g, '');
      const price = parseInt(priceText) || 0;

      const result: ScraperResult = {
        title,
        price,
        source_url: url,
        html: response.data,
        dealer_name: 'Carvana',
        is_dealer: true,
        source: 'carvana'
      };

      return result;

    } catch (error) {
      console.error(`❌ Failed to scrape Carvana detail page ${url}:`, error);
      throw error;
    }
  }
}