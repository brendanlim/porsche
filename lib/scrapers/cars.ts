import { SharedScraper } from './shared-scraper';

const CARS_CONFIG = {
  name: 'Cars.com',
  baseUrl: 'https://www.cars.com',
  searchPaths: [
    // GT MODELS - HIGH PRIORITY!
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-911&list_price_max=&maximum_distance=all&zip=90210&keywords=GT3+RS',
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-911&list_price_max=&maximum_distance=all&zip=90210&keywords=GT3',
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-911&list_price_max=&maximum_distance=all&zip=90210&keywords=GT2+RS',
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-911&list_price_max=&maximum_distance=all&zip=90210&keywords=GT2',
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-718_cayman&list_price_max=&maximum_distance=all&zip=90210&keywords=GT4+RS',
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-718_cayman&list_price_max=&maximum_distance=all&zip=90210&keywords=GT4',
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-718_boxster&list_price_max=&maximum_distance=all&zip=90210&keywords=Spyder+RS',
    
    // Sports cars
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-911&list_price_max=&maximum_distance=all&zip=90210',
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-718_cayman&list_price_max=&maximum_distance=all&zip=90210',
    '/shopping/results/?stock_type=all&makes[]=porsche&models[]=porsche-718_boxster&list_price_max=&maximum_distance=all&zip=90210',
  ],
  selectors: {
    listings: 'div.vehicle-card, article.car-card',
    title: 'h2.title',
    price: '.primary-price',
    year: 'h2.title',
    mileage: '.mileage',
    link: 'a[href*="/vehicledetail/"]',
    dealer: '.dealer-name',
    vin: 'a[href*="/vehicledetail/"]',
    image: 'img.vehicle-image, img[data-testid="vehicle-image"]'
  }
};

export class CarsScraper extends SharedScraper {
  constructor() {
    super(CARS_CONFIG);
  }

  protected getModelFromPath(path: string): string {
    if (path.includes('porsche-911')) {
      if (path.includes('GT3') || path.includes('GT2')) {
        return '911';
      }
      return '911';
    }
    if (path.includes('porsche-718_cayman')) {
      if (path.includes('GT4')) {
        return '718 Cayman';
      }
      return '718 Cayman';
    }
    if (path.includes('porsche-718_boxster')) {
      if (path.includes('Spyder')) {
        return '718 Boxster';
      }
      return '718 Boxster';
    }
    return 'Unknown';
  }

  protected getTrimFromPath(path: string): string | null {
    // Extract GT models from keywords
    if (path.includes('GT3+RS')) return 'GT3 RS';
    if (path.includes('GT3')) return 'GT3';
    if (path.includes('GT2+RS')) return 'GT2 RS';
    if (path.includes('GT2')) return 'GT2';
    if (path.includes('GT4+RS')) return 'GT4 RS';
    if (path.includes('GT4')) return 'GT4';
    if (path.includes('Spyder+RS')) return 'Spyder RS';
    return null;
  }

  protected extractListingData($: any, element: any, path: string): any {
    const listing = super.extractListingData($, element, path);
    
    // Cars.com specific: extract VIN from URL
    const link = $(element).find(this.config.selectors.link).attr('href');
    if (link) {
      const vinMatch = link.match(/\/vehicledetail\/detail\/([^\/]+)\//);
      if (vinMatch) {
        listing.vin = vinMatch[1];
      }
      
      // Ensure full URL
      listing.url = link.startsWith('http') ? link : `${this.config.baseUrl}${link}`;
    }
    
    // Extract dealer from dealer-name class
    const dealer = $(element).find(this.config.selectors.dealer).text().trim();
    if (dealer) {
      listing.dealer = dealer;
      listing.sellerType = 'Dealer';
    }
    
    // Cars.com specific title parsing for trim
    const title = $(element).find(this.config.selectors.title).text().trim();
    if (title) {
      // Check for GT models in title
      if (title.includes('GT4 RS')) listing.trim = 'GT4 RS';
      else if (title.includes('GT4')) listing.trim = 'GT4';
      else if (title.includes('GT3 RS')) listing.trim = 'GT3 RS';
      else if (title.includes('GT3')) listing.trim = 'GT3';
      else if (title.includes('GT2 RS')) listing.trim = 'GT2 RS';
      else if (title.includes('GT2')) listing.trim = 'GT2';
      else if (title.includes('Spyder RS')) listing.trim = 'Spyder RS';
      else if (title.includes('Turbo S')) listing.trim = 'Turbo S';
      else if (title.includes('Turbo')) listing.trim = 'Turbo';
      else if (title.includes('Carrera S')) listing.trim = 'Carrera S';
      else if (title.includes('Carrera')) listing.trim = 'Carrera';
      else if (title.includes('Targa')) listing.trim = 'Targa';
      else if (title.includes('GTS')) listing.trim = 'GTS';
      else if (title.includes('S')) listing.trim = 'S';
    }
    
    // Cars.com shows mileage as "X,XXX mi" - extract number
    const mileageText = $(element).find(this.config.selectors.mileage).text().trim();
    if (mileageText) {
      const mileageMatch = mileageText.match(/([\d,]+)\s*mi/i);
      if (mileageMatch) {
        listing.mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
      }
    }
    
    return listing;
  }
}