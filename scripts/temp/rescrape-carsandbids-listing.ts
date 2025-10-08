import { CarsAndBidsScraperSB } from '@/lib/scrapers/carsandbids-sb';
import { createClient } from '@supabase/supabase-js';

async function rescrapeListing() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const url = 'https://carsandbids.com/auctions/rjjO65ko/2001-porsche-911-carrera-4-coupe';
  const vin = 'WP0AA29981S620549';

  console.log('Rescraping Cars and Bids listing...\n');

  const scraper = new CarsAndBidsScraperSB();
  const listing = await scraper.scrapeDetail(url);

  console.log('\n=== SCRAPED DATA ===');
  console.log('VIN:', listing.vin);
  console.log('Transmission:', listing.transmission);
  console.log('Options:', listing.options_text?.split('\n').length || 0, 'items');

  // Update the database
  console.log('\n=== UPDATING DATABASE ===');
  const { data, error } = await supabase
    .from('listings')
    .update({
      transmission: listing.transmission,
      options_text: listing.options_text,
      exterior_color: listing.exterior_color,
      interior_color: listing.interior_color
    })
    .eq('vin', vin)
    .select();

  if (error) {
    console.error('Error updating:', error);
  } else {
    console.log('✅ Updated successfully');
    console.log('Transmission:', data[0].transmission);
    console.log('Options text length:', data[0].options_text?.length || 0);
  }
}

rescrapeListing().catch(console.error);
