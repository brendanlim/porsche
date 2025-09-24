import { supabaseAdmin } from '@/lib/supabase/admin';

async function fix911RClassification() {
  console.log('Fixing misclassified 2016 911 R from BaT...\n');

  // First, let's find the listing
  const batUrl = 'https://bringatrailer.com/listing/2016-porsche-911-r-14/';

  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .or(`source_url.eq.${batUrl},source_url.ilike.%2016-porsche-911-r-14%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings?.length || 0} listings matching the URL\n`);

  if (!listings || listings.length === 0) {
    // Try searching by year and current classification
    const { data: gt3Listings, error: gt3Error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('year', 2016)
      .ilike('trim', '%gt3%')
      .ilike('source', 'bat')
      .order('created_at', { ascending: false });

    if (gt3Error) {
      console.error('Error searching for GT3 listings:', gt3Error);
      return;
    }

    console.log(`Found ${gt3Listings?.length || 0} 2016 GT3 listings from BaT\n`);

    // Check each one to see if it's actually the 911 R
    for (const listing of gt3Listings || []) {
      console.log(`Checking listing: ${listing.title || listing.source_url}`);

      // Check if title contains "911 R" or if it's the specific listing
      if (listing.title?.includes('911 R') ||
          listing.source_url?.includes('911-r') ||
          listing.exterior_color === 'White' && listing.price > 1000000) {

        console.log(`\n✅ Found the 911 R listing!`);
        console.log(`ID: ${listing.id}`);
        console.log(`Title: ${listing.title}`);
        console.log(`Current Model: ${listing.model}`);
        console.log(`Current Trim: ${listing.trim}`);
        console.log(`Price: $${listing.price?.toLocaleString()}`);
        console.log(`URL: ${listing.source_url}`);

        // Update the listing to correct classification
        const { error: updateError } = await supabaseAdmin
          .from('listings')
          .update({
            model: '911',
            trim: 'R',
            generation: '991.2'  // 911 R is based on 991.2 platform
          })
          .eq('id', listing.id);

        if (updateError) {
          console.error('Error updating listing:', updateError);
        } else {
          console.log('\n✅ Successfully updated listing to 911 R!');
        }
      }
    }
  } else {
    // We found the listing by URL
    for (const listing of listings) {
      console.log(`\nFound listing:`);
      console.log(`ID: ${listing.id}`);
      console.log(`Title: ${listing.title}`);
      console.log(`Current Model: ${listing.model}`);
      console.log(`Current Trim: ${listing.trim}`);
      console.log(`Price: $${listing.price?.toLocaleString()}`);

      // Update to correct classification
      const { error: updateError } = await supabaseAdmin
        .from('listings')
        .update({
          model: '911',
          trim: 'R',
          generation: '991.2'
        })
        .eq('id', listing.id);

      if (updateError) {
        console.error('Error updating listing:', updateError);
      } else {
        console.log('\n✅ Successfully updated listing to 911 R!');
      }
    }
  }

  // Also check if there are any other 911 R listings that might be misclassified
  console.log('\n--- Checking for other potential 911 R listings ---');

  const { data: potentialRListings, error: searchError } = await supabaseAdmin
    .from('listings')
    .select('id, title, model, trim, year, price, source_url')
    .or(`title.ilike.%911 R%,title.ilike.%911R%`)
    .order('year', { ascending: false });

  if (potentialRListings && potentialRListings.length > 0) {
    console.log(`\nFound ${potentialRListings.length} potential 911 R listings:`);
    for (const listing of potentialRListings) {
      console.log(`- ${listing.year} ${listing.model} ${listing.trim}: ${listing.title}`);
      if (listing.model !== '911' || listing.trim !== 'R') {
        console.log(`  ⚠️ Currently classified as ${listing.model} ${listing.trim}, should be 911 R`);
      }
    }
  }

  process.exit(0);
}

fix911RClassification().catch(console.error);