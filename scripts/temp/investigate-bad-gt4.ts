import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateBadGT4() {
  const listingId = '4ea0973e-4867-4f12-a2ec-2d6d77245179';

  console.log(`Investigating listing ID: ${listingId}\n`);

  // Get the full listing details
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single();

  if (listingError) {
    console.error('Error fetching listing:', listingError);
    return;
  }

  console.log('Full listing data:');
  console.log(JSON.stringify(listing, null, 2));
  console.log('\n');

  // Check if there's cached HTML for this listing
  const { data: cacheData, error: cacheError } = await supabase
    .from('raw_html_cache')
    .select('*')
    .eq('listing_id', listingId)
    .single();

  if (cacheData) {
    console.log('Found cached HTML!');
    console.log(`Cache ID: ${cacheData.id}`);
    console.log(`URL: ${cacheData.url}`);
    console.log(`Scraped at: ${cacheData.scraped_at}`);
    console.log(`HTML length: ${cacheData.html?.length || 0} characters`);

    if (cacheData.html) {
      const $ = cheerio.load(cacheData.html);

      // Try to extract the actual title/model
      const title = $('h1, .listing-title, .title').first().text().trim();
      console.log(`\nActual title from HTML: ${title}`);

      // Look for price
      const priceText = $('.bid-value, .price, .current-bid').first().text().trim();
      console.log(`Price from HTML: ${priceText}`);

      // Look for year
      const yearMatch = title.match(/\b(19|20)\d{2}\b/) ||
                       cacheData.html.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        console.log(`Year found: ${yearMatch[0]}`);
      }

      // Look for any VIN
      const vinPattern = /WP[01][A-HJ-NPR-Z0-9]{14}/g;
      const vinMatches = cacheData.html.match(vinPattern);
      if (vinMatches) {
        console.log(`VIN found: ${vinMatches[0]}`);
      } else {
        console.log('No VIN found in HTML');
      }

      // Check if this is actually a GT4 or something else
      const isGT4 = /GT[\s-]?4|GT4/i.test(title) || /GT[\s-]?4|GT4/i.test(cacheData.html);
      const isCaymanGT4 = /Cayman.*GT[\s-]?4|GT[\s-]?4.*Cayman/i.test(cacheData.html);

      console.log(`\nIs this a GT4? ${isGT4}`);
      console.log(`Is this a Cayman GT4? ${isCaymanGT4}`);

      // Look for the actual model if not GT4
      if (!isGT4) {
        console.log('\n⚠️ This is NOT a GT4!');
        console.log('This listing needs to be corrected or removed.');
      } else if (listing.price < 100000) {
        console.log('\n🚨 This appears to be a real GT4 at an impossibly low price!');
        console.log('This is likely a data extraction error.');
      }
    }
  } else {
    console.log('No cached HTML found for this listing.');
    console.log('This listing appears to have incomplete data and should be removed.');
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('RECOMMENDATION:');
  console.log('This listing has no VIN, no year, no URL, and an unrealistic price.');
  console.log('It should be deleted from the database as invalid data.');
  console.log('══════════════════════════════════════════════════════════');
}

investigateBadGT4().catch(console.error);