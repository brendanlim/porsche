import { BaseScraper, ScraperResult } from './base'
import { HTMLStorageService } from '../services/html-storage-service'
import axios from 'axios'
import * as cheerio from 'cheerio'

export class TrueCarScraper extends BaseScraper {
  constructor() {
    super('truecar');
  }

  private getSearchUrl(model?: string, page = 1): string {
    const baseUrl = 'https://www.truecar.com/used-cars-for-sale/listings/porsche/';
    const params = new URLSearchParams();

    if (model && model !== 'all') {
      return `${baseUrl}${model.toLowerCase()}/`;
    }

    // Add page parameter if needed
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
    console.log(`🔄 Starting TrueCar scraping...`);

    const maxPages = params?.maxPages || 5;
    const model = params?.model || 'all';
    const storeHtml = params?.storeHtml !== false;

    const allListings: ScraperResult[] = [];
    const htmlStorage = new HTMLStorageService();

    try {
      for (let page = 1; page <= maxPages; page++) {
        console.log(`📄 Scraping TrueCar page ${page}/${maxPages} for ${model}...`);

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
            source: 'truecar',
            type: 'search',
            model: model || 'all',
            content: response.data,
            url: searchUrl
          });
        }

        // Parse HTML
        const $ = cheerio.load(response.data);

        // Look for JSON-LD structured data
        const structuredData: any[] = [];
        $('script[type="application/ld+json"]').each((_, element) => {
          try {
            const jsonText = $(element).html();
            if (jsonText) {
              const data = JSON.parse(jsonText);
              if (Array.isArray(data)) {
                structuredData.push(...data);
              } else {
                structuredData.push(data);
              }
            }
          } catch (error) {
            console.warn('Failed to parse JSON-LD:', error);
          }
        });

        // Look for vehicle listings in structured data
        const vehicleListings = structuredData.filter(item =>
          item['@type'] === 'Car' ||
          item['@type'] === 'Vehicle' ||
          (item.offers && item.model)
        );

        console.log(`📊 Found ${vehicleListings.length} vehicles in structured data`);

        // Process each vehicle listing
        for (const vehicle of vehicleListings) {
          try {
            const listing = await this.parseVehicleListing(vehicle, $);
            if (listing) {
              allListings.push(listing);
            }
          } catch (error) {
            console.error('Error parsing vehicle listing:', error);
          }
        }

        // If no structured data found, try HTML parsing
        if (vehicleListings.length === 0) {
          const htmlListings = await this.parseHtmlListings($, searchUrl);
          allListings.push(...htmlListings);
        }

        // Rate limiting
        if (page < maxPages) {
          const delay = 2000 + Math.random() * 2000; // 2-4 seconds
          console.log(`⏱️  Waiting ${Math.round(delay)}ms before next page...`);
          await this.delay(delay);
        }
      }

      console.log(`✅ TrueCar scraping completed: ${allListings.length} listings found`);
      return allListings;

    } catch (error) {
      console.error('❌ TrueCar scraping failed:', error);
      throw error;
    }
  }

  private async parseVehicleListing(vehicle: any, $: cheerio.CheerioAPI): Promise<ScraperResult | null> {
    try {
      // Extract basic vehicle information
      const year = parseInt(vehicle.modelDate || vehicle.vehicleModelDate || '');
      const make = vehicle.manufacturer?.name || vehicle.brand?.name || '';
      const model = vehicle.model || '';
      const trim = vehicle.vehicleConfiguration || '';

      // Skip non-Porsche vehicles
      if (make.toLowerCase() !== 'porsche') {
        return null;
      }

      // Extract pricing
      let price = 0;
      if (vehicle.offers) {
        if (Array.isArray(vehicle.offers)) {
          price = parseFloat(vehicle.offers[0]?.price || vehicle.offers[0]?.priceSpecification?.price || '0');
        } else {
          price = parseFloat(vehicle.offers.price || vehicle.offers.priceSpecification?.price || '0');
        }
      }

      // Extract mileage
      const mileage = parseInt(vehicle.mileageFromOdometer?.value || vehicle.mileage || '0');

      // Extract colors
      const exteriorColor = vehicle.color || vehicle.bodyType?.color || '';
      const interiorColor = vehicle.vehicleInteriorColor || '';

      // Extract transmission
      const transmission = vehicle.vehicleTransmission || '';

      // Extract VIN
      const vin = vehicle.vehicleIdentificationNumber || '';

      // Extract URL
      const url = vehicle.url || '';

      // Extract location
      let location: any = {};
      if (vehicle.availableAtOrFrom) {
        location = {
          city: vehicle.availableAtOrFrom.address?.addressLocality || '',
          state: vehicle.availableAtOrFrom.address?.addressRegion || '',
          zip: vehicle.availableAtOrFrom.address?.postalCode || ''
        };
      }

      // Extract dealer information
      const dealerName = vehicle.availableAtOrFrom?.name || '';
      const isDealer = true; // TrueCar primarily works with dealers

      const result: ScraperResult = {
        title: `${year} ${make} ${model} ${trim}`.trim(),
        price,
        year,
        model,
        trim,
        mileage: mileage > 0 ? mileage : undefined,
        vin: vin || undefined,
        exterior_color: exteriorColor || undefined,
        interior_color: interiorColor || undefined,
        transmission: transmission || undefined,
        source_url: url || '',
        location,
        dealer_name: dealerName || undefined,
        is_dealer: isDealer,
        raw_data: vehicle,
        source: 'truecar'
      };

      return result;

    } catch (error) {
      console.error('Error parsing vehicle listing:', error);
      return null;
    }
  }

  private async parseHtmlListings($: cheerio.CheerioAPI, searchUrl: string): Promise<ScraperResult[]> {
    console.log('📋 Falling back to HTML parsing...');

    const listings: ScraperResult[] = [];

    // Try to find vehicle cards or listings in HTML
    // This is a fallback method if structured data isn't available
    $('.vehicle-card, .listing-item, [data-test="vehicle-card"]').each((_, element) => {
      try {
        const $card = $(element);

        // Extract basic info from HTML
        const title = $card.find('h3, h4, .vehicle-title, [data-test="vehicle-title"]').first().text().trim();
        const priceText = $card.find('.price, [data-test="price"]').first().text().replace(/[^0-9]/g, '');
        const price = parseInt(priceText) || 0;

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
              source_url: searchUrl,
              source: 'truecar'
            };

            listings.push(result);
          }
        }
      } catch (error) {
        console.error('Error parsing HTML listing:', error);
      }
    });

    console.log(`📊 Found ${listings.length} listings via HTML parsing`);
    return listings;
  }

  async scrapeDetail(url: string): Promise<ScraperResult> {
    console.log(`🔍 Scraping TrueCar detail page: ${url}`);

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

      // Look for structured data first
      let vehicleData: any = null;
      $('script[type="application/ld+json"]').each((_, element) => {
        try {
          const jsonText = $(element).html();
          if (jsonText) {
            const data = JSON.parse(jsonText);
            if (data['@type'] === 'Car' || data['@type'] === 'Vehicle' || data.model) {
              vehicleData = data;
              return false; // Break the loop
            }
          }
        } catch (error) {
          console.warn('Failed to parse JSON-LD:', error);
        }
      });

      if (vehicleData) {
        const listing = await this.parseVehicleListing(vehicleData, $);
        if (listing) {
          listing.html = response.data;
          return listing;
        }
      }

      // Fallback to HTML parsing
      const title = $('h1, .vehicle-title').first().text().trim() || 'Unknown Vehicle';
      const priceText = $('.price, [data-test="price"]').first().text().replace(/[^0-9]/g, '');
      const price = parseInt(priceText) || 0;

      const result: ScraperResult = {
        title,
        price,
        source_url: url,
        html: response.data,
        source: 'truecar'
      };

      return result;

    } catch (error) {
      console.error(`❌ Failed to scrape TrueCar detail page ${url}:`, error);
      throw error;
    }
  }
}