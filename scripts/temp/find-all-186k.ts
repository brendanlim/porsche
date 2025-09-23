import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function findAndFixAll186k() {
  console.log('🔍 Searching for ALL listings with 186,000 miles...\n');

  // Find all listings with 186,000 miles
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .eq('mileage', 186000)
    .order('scraped_at', { ascending: false });

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  if (!listings || listings.length === 0) {
    console.log('No listings found with 186,000 miles');
    return;
  }

  console.log(`Found ${listings.length} listing(s) with 186,000 miles:\n`);

  for (const listing of listings) {
    console.log('─'.repeat(70));
    console.log(`ID: ${listing.id}`);
    console.log(`URL: ${listing.source_url}`);
    console.log(`Title: ${listing.title}`);
    console.log(`VIN: ${listing.vin}`);
    console.log(`Year: ${listing.year}`);
    console.log(`Model: ${listing.model}`);
    console.log(`Trim: ${listing.trim}`);
    console.log(`Generation: ${listing.generation}`);
    console.log(`Price: $${listing.price}`);
    console.log(`Scraped: ${listing.scraped_at}`);

    // Check if this is the 2004 GT3 that should have 8k miles
    if (listing.vin === 'WP0AC299X4S692805' ||
        listing.source_url?.includes('2004-porsche-911-gt3-64') ||
        (listing.year === 2004 && listing.model === '911' && listing.trim === 'GT3')) {

      console.log('\n⚠️  This is the 2004 GT3 that should have 8,000 miles!');
      console.log('🔧 Fixing mileage from 186,000 to 8,000...');

      const { error: updateError } = await supabase
        .from('listings')
        .update({ mileage: 8000 })
        .eq('id', listing.id);

      if (updateError) {
        console.error('❌ Error updating:', updateError);
      } else {
        console.log('✅ Updated successfully!');
      }
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n🔍 Verifying the fix - checking all 2004 911 GT3s...\n');

  const { data: gt3s, error: gt3Error } = await supabase
    .from('listings')
    .select('id, source_url, vin, mileage, price')
    .eq('year', 2004)
    .eq('model', '911')
    .eq('trim', 'GT3');

  if (gt3Error) {
    console.error('Error fetching GT3s:', gt3Error);
    return;
  }

  if (gt3s && gt3s.length > 0) {
    console.log(`Found ${gt3s.length} 2004 911 GT3(s):`);
    for (const gt3 of gt3s) {
      console.log(`  • ID: ${gt3.id}, Mileage: ${gt3.mileage}, VIN: ${gt3.vin}`);
      console.log(`    URL: ${gt3.source_url}`);
    }
  }
}

findAndFixAll186k().catch(console.error);