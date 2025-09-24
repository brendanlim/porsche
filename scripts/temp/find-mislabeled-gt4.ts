import { supabaseAdmin } from '@/lib/supabase/admin';

async function findMislabeledGT4() {
  console.log('Finding mislabeled GT4 with suspiciously low price...\n');

  // Search for GT4 listings with unusually low prices
  const { data: gt4Listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .or(`trim.ilike.%gt4%,trim.eq.GT4`)
    .lt('price', 50000)  // GT4s should never be under $50k
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${gt4Listings?.length || 0} GT4 listings under $50k\n`);

  if (!gt4Listings || gt4Listings.length === 0) {
    console.log('No suspiciously cheap GT4 listings found');
    return;
  }

  // Display all suspect listings
  for (const listing of gt4Listings) {
    console.log('='.repeat(80));
    console.log(`ID: ${listing.id}`);
    console.log(`Title: ${listing.title}`);
    console.log(`Year: ${listing.year}`);
    console.log(`Model: ${listing.model}`);
    console.log(`Trim: ${listing.trim}`);
    console.log(`Generation: ${listing.generation}`);
    console.log(`Price: $${listing.price?.toLocaleString()} ${listing.sold_price ? `(Sold: $${listing.sold_price.toLocaleString()})` : ''}`);
    console.log(`Mileage: ${listing.mileage?.toLocaleString() || 'Unknown'} miles`);
    console.log(`VIN: ${listing.vin || 'No VIN'}`);
    console.log(`Color: ${listing.exterior_color || 'Unknown'}`);
    console.log(`Source: ${listing.source}`);
    console.log(`URL: ${listing.source_url}`);
    console.log(`Sold Date: ${listing.sold_date || 'Not sold'}`);
    console.log(`Created: ${listing.created_at}`);

    // Check what this likely is based on price and year
    if (listing.price < 20000) {
      console.log('\n⚠️ LIKELY MISCLASSIFIED - Price too low for any GT4');
      console.log('Possible actual trim based on price:');
      if (listing.year && listing.year < 2010) {
        console.log('  - Could be a base Cayman or Cayman S from 987 generation');
      } else if (listing.year && listing.year >= 2013 && listing.year <= 2016) {
        console.log('  - Could be a base 981 Cayman or Cayman S');
      } else if (listing.year && listing.year >= 2017) {
        console.log('  - Could be a base 718 Cayman (4-cylinder turbo)');
      }

      // Try to infer from title
      if (listing.title) {
        const titleLower = listing.title.toLowerCase();
        if (titleLower.includes('base') || titleLower.includes('2.0')) {
          console.log('  - Title suggests: Base model');
        } else if (titleLower.includes(' s ') || titleLower.includes(' s,')) {
          console.log('  - Title suggests: S model');
        } else if (titleLower.includes('gts')) {
          console.log('  - Title suggests: GTS model');
        }
      }
    }
    console.log();
  }

  // Also check for any GT4 listings with missing or zero prices
  const { data: noPriceGT4, error: noPriceError } = await supabaseAdmin
    .from('listings')
    .select('id, title, model, trim, year, price, sold_price, source_url')
    .or(`trim.ilike.%gt4%,trim.eq.GT4`)
    .or('price.is.null,price.eq.0');

  if (!noPriceError && noPriceGT4 && noPriceGT4.length > 0) {
    console.log('\n--- GT4 listings with missing/zero prices ---');
    for (const listing of noPriceGT4) {
      console.log(`- ${listing.year || '????'} ${listing.model} ${listing.trim}: $${listing.price || 0} | ${listing.source_url}`);
    }
  }

  // Summary statistics
  console.log('\n--- Summary ---');
  const priceRanges = {
    under10k: gt4Listings.filter(l => l.price < 10000).length,
    under20k: gt4Listings.filter(l => l.price < 20000).length,
    under30k: gt4Listings.filter(l => l.price < 30000).length,
    under50k: gt4Listings.filter(l => l.price < 50000).length,
  };

  console.log(`GT4s under $10k: ${priceRanges.under10k}`);
  console.log(`GT4s under $20k: ${priceRanges.under20k}`);
  console.log(`GT4s under $30k: ${priceRanges.under30k}`);
  console.log(`GT4s under $50k: ${priceRanges.under50k}`);

  process.exit(0);
}

findMislabeledGT4().catch(console.error);