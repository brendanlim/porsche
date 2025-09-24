import { BaseScraper, ScraperResult } from './base'
import { HTMLStorageService } from '../services/html-storage'
import axios from 'axios'
import * as cheerio from 'cheerio'

export class CarfaxScraper extends BaseScraper {
  constructor() {
    super('carfax');
  }

  private getSearchUrl(model?: string, page = 1): string {
    const baseUrl = 'https://www.carfax.com';

    if (model && model !== 'all') {
      return `${baseUrl}/Used-Porsche-${model}_w577`;
    }

    return `${baseUrl}/Used-Porsche_m28`;
  }

  async scrapeListings(params?: {
    model?: string;
    maxPages?: number;
    storeHtml?: boolean;
  }): Promise<ScraperResult[]> {
    console.log(`🔄 Starting Carfax scraping...`);

    const maxPages = params?.maxPages || 3;
    const model = params?.model || 'all';
    const storeHtml = params?.storeHtml !== false;

    const allListings: ScraperResult[] = [];
    const htmlStorage = new HTMLStorageService();

    try {
      const searchUrl = this.getSearchUrl(model);
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
          source: 'carfax',
          type: 'search',
          model: model || 'all',
          html: response.data,
          url: searchUrl
        });
      }

      // Parse HTML
      const $ = cheerio.load(response.data);

      // Look for vehicle listings
      const listings = await this.parseVehicleListings($, searchUrl);
      allListings.push(...listings);

      // Look for pagination and additional pages
      for (let page = 2; page <= maxPages; page++) {
        const nextPageUrl = this.findNextPageUrl($, searchUrl, page);
        if (!nextPageUrl) break;

        console.log(`📄 Scraping Carfax page ${page}/${maxPages}...`);
        console.log(`🔗 URL: ${nextPageUrl}`);

        try {
          const pageResponse = await axios.get(nextPageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 30000
          });

          if (storeHtml) {
            await htmlStorage.storeScrapedHTML({
              source: 'carfax',
              type: 'search',
              model: model || 'all',
              html: pageResponse.data,
              url: nextPageUrl,
              metadata: { page }
            });
          }

          const $page = cheerio.load(pageResponse.data);
          const pageListings = await this.parseVehicleListings($page, nextPageUrl);
          allListings.push(...pageListings);

          // Rate limiting
          const delay = 2000 + Math.random() * 2000; // 2-4 seconds
          console.log(`⏱️  Waiting ${Math.round(delay)}ms before next page...`);
          await this.delay(delay);

        } catch (error) {
          console.error(`❌ Failed to scrape page ${page}:`, error);
          break;
        }
      }

      console.log(`✅ Carfax scraping completed: ${allListings.length} listings found`);
      return allListings;

    } catch (error) {
      console.error('❌ Carfax scraping failed:', error);
      throw error;
    }
  }

  private async parseVehicleListings($: cheerio.CheerioAPI, searchUrl: string): Promise<ScraperResult[]> {
    const listings: ScraperResult[] = [];

    // Look for vehicle cards or listings
    $('.srp-list-item, .vehicle-details, .listing-container, [data-test="vehicle-card"]').each((_, element) => {
      try {
        const $card = $(element);

        // Extract title
        const title = $card.find('h4 a, .vehicle-details h4 a, .title a, h3 a').first().text().trim();

        // Extract price
        const priceElement = $card.find('.price-section .primary-price, .price, .listing-price');
        const priceText = priceElement.text().replace(/[^0-9]/g, '');
        const price = parseInt(priceText) || 0;

        // Extract mileage
        const mileageElement = $card.find('.badge-section .odometer, .mileage, .vehicle-mileage');
        const mileageText = mileageElement.text().replace(/[^0-9]/g, '');
        const mileage = parseInt(mileageText) || undefined;

        // Extract detail URL
        const detailLink = $card.find('h4 a, .vehicle-details h4 a, .title a, h3 a').first();
        const detailUrl = detailLink.attr('href');
        const fullDetailUrl = detailUrl ? (detailUrl.startsWith('http') ? detailUrl : `https://www.carfax.com${detailUrl}`) : searchUrl;

        // Extract location
        const locationElement = $card.find('.dealer-distance, .location, .dealer-location');
        const locationText = locationElement.text().trim();
        const location = this.parseLocation(locationText);

        // Extract dealer name
        const dealerElement = $card.find('.dealer-name, .seller-name');
        const dealerName = dealerElement.text().trim() || undefined;

        // Extract Carfax-specific data
        const oneOwner = $card.find('.one-owner, .ownership-badge').length > 0;
        const accidentFree = $card.find('.no-accidents, .accident-free').length > 0;
        const serviceRecords = $card.find('.service-records, .maintenance-badge').length > 0;

        if (title && price > 0) {
          // Parse year, make, model from title
          const titleParts = title.split(' ');
          const year = parseInt(titleParts[0]) || undefined;
          const make = titleParts[1] || '';
          const model = titleParts[2] || '';
          const trim = titleParts.slice(3).join(' ') || undefined;

          // Only include Porsche vehicles
          if (make.toLowerCase() === 'porsche') {
            const result: ScraperResult = {
              title,
              price,
              year,
              model,
              trim,
              mileage,
              source_url: fullDetailUrl,
              location,
              dealer_name: dealerName,
              is_dealer: true, // Carfax primarily shows dealer listings
              source: 'carfax',
              raw_data: {
                oneOwner,
                accidentFree,
                serviceRecords,
                originalTitle: title,
                originalPrice: priceElement.text().trim(),
                originalMileage: mileageElement.text().trim()
              }
            };

            listings.push(result);
          }
        }
      } catch (error) {
        console.error('Error parsing Carfax listing:', error);
      }
    });

    console.log(`📊 Found ${listings.length} Carfax listings`);
    return listings;
  }

  private findNextPageUrl($: cheerio.CheerioAPI, currentUrl: string, page: number): string | null {
    // Look for pagination links
    const nextPageLink = $(`.pagination a[data-page="${page}"], .page-numbers a:contains("${page}"), .srp-pagination a:contains("${page}")`).first();
    if (nextPageLink.length > 0) {
      const href = nextPageLink.attr('href');
      return href ? (href.startsWith('http') ? href : `https://www.carfax.com${href}`) : null;
    }

    // Try constructing URL with page parameter
    const url = new URL(currentUrl);
    url.searchParams.set('start', ((page - 1) * 20).toString()); // Assuming 20 results per page
    return url.toString();
  }

  private parseLocation(locationText: string): any {
    if (!locationText) return {};

    // Try to extract city, state from various formats
    // "City, ST", "City, State", "Distance • City, ST"
    const parts = locationText.split('•').pop()?.trim() || locationText;
    const locationParts = parts.split(',').map(p => p.trim());

    if (locationParts.length >= 2) {
      return {
        city: locationParts[0],
        state: locationParts[1]
      };
    }

    return { city: parts };
  }

  async scrapeDetail(url: string): Promise<ScraperResult> {
    console.log(`🔍 Scraping Carfax detail page: ${url}`);

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

      // Extract detailed information
      const title = $('h1, .vehicle-title, .vdp-title').first().text().trim() || 'Unknown Vehicle';

      const priceElement = $('.price-section .primary-price, .price, .vdp-price');
      const priceText = priceElement.text().replace(/[^0-9]/g, '');
      const price = parseInt(priceText) || 0;

      // Extract VIN
      const vinElement = $('[data-test="vin"], .vin-number, .vehicle-vin');
      const vin = vinElement.text().replace(/[^A-Z0-9]/g, '') || undefined;

      // Extract mileage
      const mileageElement = $('.odometer, .mileage, .vehicle-mileage');
      const mileageText = mileageElement.text().replace(/[^0-9]/g, '');
      const mileage = parseInt(mileageText) || undefined;

      // Extract colors
      const exteriorColor = $('.exterior-color, .color-exterior').text().trim() || undefined;
      const interiorColor = $('.interior-color, .color-interior').text().trim() || undefined;

      // Extract transmission
      const transmission = $('.transmission, .drivetrain').text().trim() || undefined;

      // Extract Carfax report data
      const oneOwner = $('.one-owner, .ownership-badge').length > 0;
      const accidentFree = $('.no-accidents, .accident-free').length > 0;
      const serviceRecords = $('.service-records, .maintenance-badge').length > 0;
      const recalls = $('.recalls, .recall-badge').length > 0;

      // Parse year, make, model from title
      const titleParts = title.split(' ');
      const year = parseInt(titleParts[0]) || undefined;
      const make = titleParts[1] || '';
      const model = titleParts[2] || '';
      const trim = titleParts.slice(3).join(' ') || undefined;

      const result: ScraperResult = {
        title,
        price,
        year,
        model,
        trim,
        mileage,
        vin,
        exterior_color: exteriorColor,
        interior_color: interiorColor,
        transmission,
        source_url: url,
        html: response.data,
        source: 'carfax',
        raw_data: {
          oneOwner,
          accidentFree,
          serviceRecords,
          recalls,
          carfaxReport: true
        }
      };

      return result;

    } catch (error) {
      console.error(`❌ Failed to scrape Carfax detail page ${url}:`, error);
      throw error;
    }
  }
}