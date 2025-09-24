import { ClassicEnhancedScraper } from '../../lib/scrapers/classic-enhanced';

async function testClassicEnhanced() {
  console.log('Testing Enhanced Classic.com Scraper');
  console.log('=====================================\n');

  const scraper = new ClassicEnhancedScraper();

  try {
    // Test with GT4 RS (high priority)
    console.log('Test 1: Scraping GT4 RS sold listings...');
    const results = await scraper.scrapeListings({
      model: '718',
      trim: 'GT4 RS',
      maxPages: 1, // Just test first page
      onlySold: true
    });

    console.log(`\n✅ Found ${results.length} GT4 RS listings`);

    // Show first few results
    if (results.length > 0) {
      console.log('\nSample listings:');
      results.slice(0, 3).forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   Price: $${listing.price?.toLocaleString() || 'N/A'}`);
        console.log(`   Year: ${listing.year || 'N/A'}`);
        console.log(`   Mileage: ${listing.mileage?.toLocaleString() || 'N/A'} miles`);
        console.log(`   Original Source: ${listing.description}`);
        console.log(`   URL: ${listing.source_url}`);
        console.log(`   VIN: ${listing.vin || 'Not fetched yet'}`);
      });
    }

    // Test with 996 GT3
    console.log('\n\nTest 2: Scraping 996 GT3 sold listings...');
    const gt3Results = await scraper.scrapeListings({
      model: '911',
      trim: 'GT3',
      maxPages: 1,
      onlySold: true
    });

    console.log(`\n✅ Found ${gt3Results.length} GT3 listings`);

    if (gt3Results.length > 0) {
      console.log('\nFirst GT3 listing:');
      const first = gt3Results[0];
      console.log(`   ${first.title}`);
      console.log(`   Price: $${first.price?.toLocaleString() || 'N/A'}`);
      console.log(`   Generation: ${first.generation || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testClassicEnhanced().catch(console.error);