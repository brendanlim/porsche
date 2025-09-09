// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '@/lib/supabase/admin';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING RECENTLY SAVED LISTINGS');
  console.log('='.repeat(80) + '\n');

  try {
    // Get listings from the last 24 hours, grouped by source
    const sources = ['cars', 'classic', 'bat'];
    
    for (const source of sources) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`SOURCE: ${source.toUpperCase()}`);
      console.log('='.repeat(50));
      
      const { data: listings, error } = await supabaseAdmin
        .from('listings')
        .select('*')
        .eq('source', source)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error(`Error fetching ${source} listings:`, error);
        continue;
      }
      
      if (!listings || listings.length === 0) {
        console.log(`No listings found for ${source}`);
        continue;
      }
      
      console.log(`Found ${listings.length} recent listings:\n`);
      
      listings.forEach((listing, i) => {
        console.log(`${i + 1}. ${listing.title || 'NO TITLE'}`);
        console.log(`   VIN: ${listing.vin || 'N/A'}`);
        console.log(`   Year: ${listing.year || 'N/A'}`);
        console.log(`   Model: ${listing.model || 'N/A'}`);
        console.log(`   Trim: ${listing.trim || 'N/A'}`);
        console.log(`   Generation: ${listing.generation || 'N/A'}`);
        console.log(`   Price: $${listing.price || listing.listing_price || 0}`);
        console.log(`   Sold Price: $${listing.sold_price || 'N/A'}`);
        console.log(`   Mileage: ${listing.mileage ? listing.mileage.toLocaleString() : 'N/A'} miles`);
        console.log(`   Exterior Color: ${listing.exterior_color || 'N/A'}`);
        console.log(`   Interior Color: ${listing.interior_color || 'N/A'}`);
        console.log(`   Transmission: ${listing.transmission || 'N/A'}`);
        console.log(`   Status: ${listing.status || 'N/A'}`);
        console.log(`   Dealer: ${listing.dealer_name || 'N/A'}`);
        console.log(`   Location: ${listing.city || ''} ${listing.state || ''} ${listing.zip_code || ''}`);
        console.log(`   Created: ${new Date(listing.created_at).toLocaleString()}`);
        console.log(`   Source URL: ${listing.source_url?.substring(0, 60)}...`);
        console.log(`   Options Text: ${listing.options_text ? listing.options_text.substring(0, 100) + '...' : 'N/A'}`);
        console.log('');
      });
    }
    
    // Get summary stats
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY STATISTICS');
    console.log('='.repeat(80));
    
    for (const source of sources) {
      const { count } = await supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('source', source);
      
      console.log(`${source.toUpperCase()}: ${count || 0} total listings`);
    }
    
    // Check for listings with missing critical data
    console.log('\n' + '='.repeat(80));
    console.log('DATA QUALITY CHECK');
    console.log('='.repeat(80));
    
    const { data: incomplete } = await supabaseAdmin
      .from('listings')
      .select('id, source, title, model, year, price')
      .or('model.is.null,year.is.null,price.is.null,title.is.null')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (incomplete && incomplete.length > 0) {
      console.log(`\n⚠️ Found ${incomplete.length} listings with missing critical data:`);
      incomplete.forEach(listing => {
        console.log(`- [${listing.source}] ${listing.title || 'NO TITLE'} - Missing: ${
          [
            !listing.model && 'model',
            !listing.year && 'year', 
            !listing.price && 'price',
            !listing.title && 'title'
          ].filter(Boolean).join(', ')
        }`);
      });
    } else {
      console.log('✅ All recent listings have complete critical data');
    }
    
  } catch (error) {
    console.error('Error checking listings:', error);
  }
}

main().catch(console.error);