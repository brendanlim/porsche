import { SharedScraper } from './shared-scraper';

export class AutotraderScraper extends SharedScraper {
  constructor() {
    super({
      name: 'Autotrader',
      source: 'autotrader',
      baseUrl: 'https://www.autotrader.com',
      searchPaths: [
        // GT models - HIGH PRIORITY
        '/cars-for-sale/porsche/911?searchRadius=0&trimCodeList=911%7CGT3,911%7CGT3%20RS,911%7CGT2%20RS',
        // Regular sports cars
        '/cars-for-sale/porsche/911',
        '/cars-for-sale/porsche/718-cayman',
        '/cars-for-sale/porsche/718-boxster'
      ],
      selectors: {
        listings: '.inventory-listing, .listing-card, a[href*="/cars-for-sale/vehicledetails"]',
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
        type: 'offset',
        param: 'firstRecord',
        increment: 25
      }
    });
  }
}