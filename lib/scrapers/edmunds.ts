import { SharedScraper } from './shared-scraper';

export class EdmundsScraper extends SharedScraper {
  constructor() {
    super({
      name: 'Edmunds',
      source: 'edmunds',
      baseUrl: 'https://www.edmunds.com',
      searchPaths: [
        // GT MODELS - HIGH PRIORITY!
        '/inventory/srp.html?make=Porsche&model=911&keywords=GT3%20RS',
        '/inventory/srp.html?make=Porsche&model=911&keywords=GT3',
        '/inventory/srp.html?make=Porsche&model=911&keywords=GT2%20RS',
        '/inventory/srp.html?make=Porsche&model=911&keywords=GT2',
        '/inventory/srp.html?make=Porsche&model=718%20Cayman&keywords=GT4%20RS',
        '/inventory/srp.html?make=Porsche&model=718%20Cayman&keywords=GT4',
        '/inventory/srp.html?make=Porsche&model=718%20Boxster&keywords=Spyder%20RS',
        
        // Sports cars - all years
        '/inventory/srp.html?make=Porsche&model=911',
        '/inventory/srp.html?make=Porsche&model=718%20Cayman',
        '/inventory/srp.html?make=Porsche&model=718%20Boxster',
        '/inventory/srp.html?make=Porsche&model=Cayman',
        '/inventory/srp.html?make=Porsche&model=Boxster',
      ],
      selectors: {
        listings: '.inventory-listing, .vehicle-card, a[href*="/inventory/"]',
        title: 'h1, .vehicle-title, .listing-title',
        price: '.price, .vehicle-price, .listing-price',
        vin: '.vin, [data-vin]',
        year: '.year, [data-year]',
        mileage: '.mileage, .vehicle-mileage',
        location: '.location, .dealer-location',
        status: '.status, .availability',
        images: '.gallery img, .vehicle-images img',
        description: '.description, .vehicle-description'
      },
      pagination: {
        type: 'page',
        param: 'pageNum'
      }
    });
  }
}