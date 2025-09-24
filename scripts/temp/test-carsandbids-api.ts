#!/usr/bin/env npx tsx

import { CarsAndBidsAPIScraper } from '../../lib/scrapers/carsandbids-api';

async function testCarsAndBidsAPI() {
  console.log('Testing Cars and Bids API Scraper\n');

  const scraper = new CarsAndBidsAPIScraper();

  try {
    // Test searching for GT4 RS
    console.log('Searching for GT4 RS listings...');
    const gt4rsListings = await scraper.searchPorsche({
      model: 'GT4 RS',
      limit: 5,
      status: 'closed'
    });

    console.log(`\nFound ${gt4rsListings.length} GT4 RS listings:`);
    gt4rsListings.forEach((listing, i) => {
      console.log(`\n${i + 1}. ${listing.title}`);
      console.log(`   Price: $${listing.price?.toLocaleString()}`);
      console.log(`   VIN: ${listing.vin || 'N/A'}`);
      console.log(`   Mileage: ${listing.mileage?.toLocaleString() || 'N/A'} miles`);
      console.log(`   Location: ${listing.location?.city}, ${listing.location?.state}`);
      console.log(`   Sold Date: ${listing.sold_date}`);
      console.log(`   URL: ${listing.url}`);
    });

    // Test general Porsche search
    console.log('\n' + '='.repeat(60));
    console.log('Testing general Porsche search...');
    const porscheListings = await scraper.searchPorsche({
      limit: 10,
      status: 'closed'
    });

    console.log(`\nFound ${porscheListings.length} Porsche listings`);

    // Group by model
    const modelCounts = new Map<string, number>();
    porscheListings.forEach(listing => {
      const model = listing.model || 'Unknown';
      modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
    });

    console.log('\nModels found:');
    Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([model, count]) => {
        console.log(`  - ${model}: ${count}`);
      });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCarsAndBidsAPI().catch(console.error);