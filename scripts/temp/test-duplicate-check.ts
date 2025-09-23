import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testDuplicateCheck() {
  console.log('Testing BaT Duplicate Checking Logic');
  console.log('====================================\n');

  // Sample BaT URLs (mix of existing and potentially new)
  const testUrls = [
    'https://bringatrailer.com/listing/2007-porsche-911-turbo-53/',
    'https://bringatrailer.com/listing/2018-porsche-911-gt3-74/',
    'https://bringatrailer.com/listing/fake-new-listing-12345/',
    'https://bringatrailer.com/listing/another-fake-67890/',
  ];

  console.log('Test URLs:', testUrls.length);
  console.log('Checking database for existing sold listings...\n');

  const existingSoldListings = new Set<string>();

  try {
    const { data: existingListings } = await supabaseAdmin
      .from('listings')
      .select('source_url, sold_date, vin')
      .in('source_url', testUrls)
      .not('sold_date', 'is', null);

    if (existingListings) {
      existingListings.forEach(listing => {
        if (listing.source_url && listing.vin) {
          existingSoldListings.add(listing.source_url);
          console.log(`✅ Found in DB: ${listing.source_url}`);
          console.log(`   VIN: ${listing.vin}, Sold: ${listing.sold_date}`);
        }
      });
    }

    console.log(`\n📊 Results:`);
    console.log(`  - Found ${existingSoldListings.size} existing sold listings`);
    console.log(`  - Would skip ${existingSoldListings.size} listings`);
    console.log(`  - Would fetch ${testUrls.length - existingSoldListings.size} new listings`);

    const toFetch = testUrls.filter(url => !existingSoldListings.has(url));
    if (toFetch.length > 0) {
      console.log('\nWould fetch details for:');
      toFetch.forEach(url => console.log(`  - ${url}`));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testDuplicateCheck().then(() => process.exit(0));