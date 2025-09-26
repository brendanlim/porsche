import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findSuspiciousGT3RS() {
  console.log('🔍 Searching for suspicious GT3 RS listings...\n');

  // Find low-priced GT3 RS
  const { data: listings, error } = await supabase
    .from('listings')
    .select('*')
    .or('trim.ilike.%GT3 RS%,model.ilike.%GT3 RS%,trim.ilike.%GT3RS%')
    .lte('price', 50000) // GT3 RS should never be under $50k
    .order('price', { ascending: true });

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  if (!listings || listings.length === 0) {
    console.log('✅ No suspicious low-priced GT3 RS listings found');
    return;
  }

  console.log(`⚠️ Found ${listings.length} suspicious GT3 RS listings under $50k:\n`);

  for (const listing of listings) {
    console.log('='.repeat(60));
    console.log(`ID: ${listing.id}`);
    console.log(`Price: $${listing.price.toLocaleString()} ${listing.price < 20000 ? '🚨 EXTREMELY LOW!' : '⚠️ SUSPICIOUS'}`);
    console.log(`Year: ${listing.year || 'Unknown'}`);
    console.log(`Model: ${listing.model}`);
    console.log(`Trim: ${listing.trim}`);
    console.log(`VIN: ${listing.vin || 'No VIN'}`);
    console.log(`Mileage: ${listing.mileage ? listing.mileage.toLocaleString() : 'Unknown'} miles`);
    console.log(`Title: ${listing.title}`);
    console.log(`Source: ${listing.source}`);
    console.log(`URL: ${listing.url}`);
    console.log(`Scraped: ${listing.scraped_at}`);

    if (listing.description) {
      console.log(`\nDescription preview: ${listing.description.substring(0, 200)}...`);
    }

    // Check for common false positive indicators
    const title = listing.title?.toLowerCase() || '';
    const description = listing.description?.toLowerCase() || '';

    if (title.includes('part') || title.includes('wheel') || title.includes('seat') ||
        title.includes('wing') || title.includes('bumper') || title.includes('engine') ||
        description.includes('part out') || description.includes('parting') ||
        description.includes('seat only') || description.includes('wheels only')) {
      console.log('\n🔧 WARNING: This might be a parts listing, not a complete car!');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`Total suspicious GT3 RS listings: ${listings.length}`);
  console.log(`Lowest price: $${Math.min(...listings.map(l => l.price)).toLocaleString()}`);
  console.log(`\n🎯 Next step: Run VIN decoder on these listings to verify`);
}

findSuspiciousGT3RS().catch(console.error);