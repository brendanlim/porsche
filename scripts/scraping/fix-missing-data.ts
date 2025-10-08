import { createClient } from '@supabase/supabase-js';
import { CarsAndBidsScraperSB } from '@/lib/scrapers/carsandbids-sb';
import { BaTScraperSB } from '@/lib/scrapers/bat-sb';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixCarsAndBidsListings(limit: number = 100) {
  console.log('\n🔧 Fixing Cars and Bids listings with missing data...\n');

  // Find listings missing VIN, options_text, or transmission
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, source_url, title')
    .eq('source', 'carsandbids')
    .or('vin.is.null,options_text.is.null,transmission.is.null')
    .limit(limit);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  if (!listings || listings.length === 0) {
    console.log('✅ No Cars and Bids listings need fixing');
    return;
  }

  console.log(`📋 Found ${listings.length} listings to fix`);

  const scraper = new CarsAndBidsScraperSB();
  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`\n[${i + 1}/${listings.length}] ${listing.title}`);

    try {
      const scraped = await scraper.scrapeDetail(listing.source_url);

      const updates: any = {};

      // Check if VIN already exists before updating
      if (scraped.vin && !listing.vin) {
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('vin', scraped.vin)
          .single();

        if (!existing) {
          updates.vin = scraped.vin;
        } else {
          console.log(`  ⚠️ VIN ${scraped.vin} already exists in another listing`);
        }
      }

      if (scraped.options_text) updates.options_text = scraped.options_text;
      if (scraped.transmission) updates.transmission = scraped.transmission;
      if (scraped.exterior_color) updates.exterior_color = scraped.exterior_color;
      if (scraped.interior_color) updates.interior_color = scraped.interior_color;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('listings')
          .update(updates)
          .eq('id', listing.id);

        if (updateError) {
          console.error(`  ❌ Update failed:`, updateError);
          failed++;
        } else {
          console.log(`  ✅ Updated: ${Object.keys(updates).join(', ')}`);
          fixed++;
        }
      } else {
        console.log(`  ⚠️ No new data found`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err) {
      console.error(`  ❌ Scrape failed:`, err);
      failed++;
    }
  }

  console.log(`\n📊 Cars and Bids Summary: ${fixed} fixed, ${failed} failed`);
}

async function fixBaTListings(limit: number = 100) {
  console.log('\n🔧 Fixing BaT listings with missing data...\n');

  // Find listings missing VIN or mileage
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, source_url, title')
    .eq('source', 'bring-a-trailer')
    .or('vin.is.null,mileage.is.null')
    .limit(limit);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  if (!listings || listings.length === 0) {
    console.log('✅ No BaT listings need fixing');
    return;
  }

  console.log(`📋 Found ${listings.length} listings to fix`);

  const scraper = new BaTScraperSB();
  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`\n[${i + 1}/${listings.length}] ${listing.title}`);

    try {
      const scraped = await scraper.scrapeDetail(listing.source_url);

      const updates: any = {};

      // Check if VIN already exists before updating
      if (scraped.vin && !listing.vin) {
        const { data: existing } = await supabase
          .from('listings')
          .select('id')
          .eq('vin', scraped.vin)
          .single();

        if (!existing) {
          updates.vin = scraped.vin;
        } else {
          console.log(`  ⚠️ VIN ${scraped.vin} already exists in another listing`);
        }
      }

      if (scraped.mileage) updates.mileage = scraped.mileage;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('listings')
          .update(updates)
          .eq('id', listing.id);

        if (updateError) {
          console.error(`  ❌ Update failed:`, updateError);
          failed++;
        } else {
          console.log(`  ✅ Updated: ${Object.keys(updates).join(', ')}`);
          fixed++;
        }
      } else {
        console.log(`  ⚠️ No new data found`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err) {
      console.error(`  ❌ Scrape failed:`, err);
      failed++;
    }
  }

  console.log(`\n📊 BaT Summary: ${fixed} fixed, ${failed} failed`);
}

async function main() {
  const args = process.argv.slice(2);
  const source = args.find(arg => arg.startsWith('--source='))?.split('=')[1];
  const limitArg = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  const limit = limitArg ? parseInt(limitArg) : 100;

  console.log('🔧 Fix Missing Data Script');
  console.log('═'.repeat(50));

  if (!source || source === 'carsandbids') {
    await fixCarsAndBidsListings(limit);
  }

  if (!source || source === 'bat') {
    await fixBaTListings(limit);
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
