import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debug() {
  // Get the stored HTML
  const { data: files } = await supabase.storage
    .from('raw-html')
    .list('bring-a-trailer', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  const matching = files?.filter(f => f.name.includes('1976-porsche-930'));
  console.log('Found files:', matching?.map(f => f.name));

  if (matching && matching.length > 0) {
    const { data: htmlData } = await supabase.storage
      .from('raw-html')
      .download('bring-a-trailer/' + matching[0].name);

    const html = await htmlData?.text();
    const $ = cheerio.load(html || '');

    console.log('\n=== LOOKING FOR VIN ===');

    // Check for VIN in text
    const bodyText = $.text();
    const vinMatch = bodyText.match(/WP[01][A-Z0-9]{14}/);
    console.log('VIN regex match:', vinMatch);

    // Check for any text containing "9306"
    if (bodyText.includes('9306')) {
      console.log('\nFound "9306" in text');
      const index = bodyText.indexOf('9306');
      console.log('Context:', bodyText.substring(index - 20, index + 50));
    }

    // Look for Chassis label
    console.log('\n=== LOOKING FOR CHASSIS/VIN LABEL ===');
    $('dt').each((i, el) => {
      const text = $(el).text().trim();
      if (text.toLowerCase().includes('chassis') || text.toLowerCase().includes('vin')) {
        console.log('Found dt:', text);
        console.log('Next dd:', $(el).next('dd').text().trim());
      }
    });

    // Check listing details
    console.log('\n=== LISTING DETAILS ===');
    const listingDetails = $('.listing-details').text();
    console.log('Listing details (first 500 chars):', listingDetails.substring(0, 500));
  }
}

debug().catch(console.error);
