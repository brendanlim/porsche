import { SharedScraper } from './shared-scraper';

export class ClassicScraper extends SharedScraper {
  constructor() {
    super({
      name: 'Classic.com',
      source: 'classic',
      baseUrl: 'https://www.classic.com',
      searchPaths: [
        // GT MODELS - HIGH PRIORITY!
        '/m/porsche/718/cayman/gt4-rs/',
        '/m/porsche/718/cayman/gt4/',
        '/m/porsche/911/992/gt3/',
        '/m/porsche/911/992/gt3-rs/',
        '/m/porsche/911/991/gt3/',
        '/m/porsche/911/991/gt3-rs/',
        '/m/porsche/911/991/gt2-rs/',
        '/m/porsche/911/997/gt3/',
        '/m/porsche/911/997/gt3-rs/',
        '/m/porsche/911/997/gt2/',
        '/m/porsche/911/997/gt2-rs/',
        // Regular sports cars
        '/m/porsche/911/',
        '/m/porsche/718/cayman/',
        '/m/porsche/718/boxster/',
        '/m/porsche/718/spyder/'
      ],
      selectors: {
        // Classic.com uses /veh/ URLs for individual listings
        listings: 'a[href^="/veh/"]',
        title: 'h1, h2, .font-bold',
        price: '[class*="price"], .text-xl',
        vin: '.vin, [class*="vin"]',
        year: '[class*="year"]',
        mileage: '[class*="mileage"], [class*="miles"]',
        location: '[class*="location"]',
        status: '[class*="status"], [class*="sold"]',
        images: 'img[src*="cdn"], img[src*="classic"]',
        description: '[class*="description"]'
      },
      pagination: {
        type: 'page',
        param: 'page'
      }
    });
  }
}