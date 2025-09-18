import * as cheerio from 'cheerio';
import { SharedScraper } from './shared-scraper';
import { ScrapedListing } from './base';

export class EdmundsScraper extends SharedScraper {
  constructor() {
    super({
      name: 'Edmunds',
      source: 'edmunds',
      baseUrl: 'https://www.edmunds.com',
      searchPaths: [
        // Focus on used inventory - Edmunds is primarily for current for-sale listings
        '/inventory/srp.html?inventorytype=used%2Ccpo&make=porsche&model=porsche%7C911&radius=6000&page_size=100',
        '/inventory/srp.html?inventorytype=used%2Ccpo&make=porsche&model=porsche%7C718-cayman&radius=6000&page_size=100',
        '/inventory/srp.html?inventorytype=used%2Ccpo&make=porsche&model=porsche%7C718-boxster&radius=6000&page_size=100'
      ],
      selectors: {
        // Updated selectors based on current Edmunds structure
        listings: 'article[data-testid="vehicle-card"], .usurp-inventory-card',
        title: 'h1, [data-testid="vehicle-card-title"], .usurp-inventory-card-title',
        price: '[data-testid="vehicle-card-price"], .usurp-inventory-card-price, .vehicle-price',
        vin: '[data-vin], .vin-number',
        year: '[data-year]',
        mileage: '[data-testid="vehicle-card-mileage"], .vehicle-mileage',
        location: '[data-testid="dealer-name"], .dealer-name',
        status: '.availability-status',
        images: 'img[data-testid="vehicle-image"]',
        description: '.vehicle-description'
      },
      pagination: {
        type: 'page',
        param: 'page'
      }
    });
  }

  // Override scrapeDetail to handle Edmunds-specific data extraction
  async scrapeDetail(url: string): Promise<ScrapedListing | null> {
    try {
      const html = await this.fetchUrl(url, 'detail');
      const $ = cheerio.load(html);
      
      // Edmunds embeds vehicle data in JSON-LD or script tags
      let vehicleData: any = null;
      
      // Look for structured data
      $('script[type="application/ld+json"]').each((_, script) => {
        try {
          const data = JSON.parse($(script).html() || '');
          if (data['@type'] === 'Car' || data['@type'] === 'Vehicle') {
            vehicleData = data;
          }
        } catch (e) {
          // Continue searching
        }
      });
      
      // Extract from page content if no structured data
      const title = $('h1').first().text().trim() || 
                   $('[data-testid="vehicle-title"]').text().trim();
                   
      const priceText = $('[data-testid="vehicle-price"]').text().trim() ||
                       $('.price-display').text().trim() ||
                       $('.vehicle-price').text().trim();
      const price = this.extractPrice(priceText);
      
      // Extract year from title or structured data
      const year = vehicleData?.modelYear || this.extractYear(title);
      
      // Extract VIN
      const vin = vehicleData?.vehicleIdentificationNumber ||
                 $('[data-vin]').attr('data-vin') ||
                 this.extractVinFromText($('body').text());
      
      // Extract mileage
      const mileageText = $('[data-testid="vehicle-mileage"]').text().trim() ||
                         $('.vehicle-mileage').text().trim();
      const mileage = this.extractMileage(mileageText);
      
      // Extract dealer/location
      const dealerName = $('[data-testid="dealer-name"]').text().trim() ||
                        $('.dealer-name').text().trim();
      
      // Extract model and trim from title
      const { model, trim } = this.parseModelTrim(title);
      
      return {
        url,
        source_url: url,
        title,
        price: price || 0,
        vin,
        year,
        model,
        trim,
        mileage,
        status: 'available', // Edmunds shows current inventory
        source: this.source,
        seller_type: 'dealer',
        scraped_at: new Date(),
        raw_data: vehicleData
      };
    } catch (error) {
      console.error(`Error scraping Edmunds detail:`, error);
      return null;
    }
  }

  private extractPrice(text: string): number | null {
    const cleaned = text.replace(/[^0-9]/g, '');
    const price = parseInt(cleaned);
    return isNaN(price) || price < 1000 ? null : price;
  }

  private extractYear(text: string): number | null {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
  }

  private extractMileage(text: string): number | null {
    const mileageMatch = text.match(/(\d{1,3}(?:,\d{3})*)/);
    return mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : null;
  }

  private extractVinFromText(text: string): string | null {
    const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/);
    return vinMatch ? vinMatch[1] : null;
  }

  private parseModelTrim(title: string): { model: string; trim?: string } {
    let model = '911'; // Default
    let trim: string | undefined;
    
    if (title.includes('718')) {
      model = title.includes('Cayman') ? '718 Cayman' : '718 Boxster';
    }
    
    // Extract trim
    const trimPatterns = ['GT4 RS', 'GT4', 'GT3 RS', 'GT3', 'GT2 RS', 'GT2', 'Turbo S', 'Turbo', 'Carrera S', 'Carrera', 'GTS'];
    for (const pattern of trimPatterns) {
      if (title.includes(pattern)) {
        trim = pattern;
        break;
      }
    }
    
    return { model, trim };
  }
}