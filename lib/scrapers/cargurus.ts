import { SharedScraper } from './shared-scraper';

export class CarGurusScraper extends SharedScraper {
  constructor() {
    super({
      name: 'CarGurus',
      source: 'cargurus',
      baseUrl: 'https://www.cargurus.com',
      searchPaths: [
        // GT models first - HIGH PRIORITY
        '/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=m47', // GT3
        '/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=m47', // GT3 RS
        '/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=m47', // GT2 RS
        '/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=m47', // GT4
        // Then regular sports cars
        '/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=d177', // 911
        '/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=d2536', // 718 Cayman
        '/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&entitySelectingHelper.selectedEntity=d2535' // 718 Boxster
      ],
      selectors: {
        listings: '.listing-card, .car-listing, a[href*="/Cars/link/"]',
        title: 'h1, .listing-title, .car-title',
        price: '.price, .listing-price, .car-price',
        vin: '.vin, [data-vin]',
        year: '.year, [data-year]',
        mileage: '.mileage, .car-mileage',
        location: '.location, .dealer-location',
        status: '.status, .availability',
        images: '.gallery img, .car-images img',
        description: '.description, .car-description'
      },
      pagination: {
        type: 'offset',
        param: 'startIndex',
        increment: 15
      }
    });
  }
}