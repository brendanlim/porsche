#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixMalformedUrls() {
  console.log('Checking for malformed URLs...');
  
  // Find all malformed URLs
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, source_url')
    .eq('source', 'bring-a-trailer')
    .like('source_url', '%bringatrailer/com%');
  
  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }
  
  console.log(`Found ${listings?.length || 0} malformed URLs`);
  
  if (!listings || listings.length === 0) {
    console.log('No malformed URLs found');
    return;
  }
  
  // Fix each URL
  let fixedCount = 0;
  for (const listing of listings) {
    const fixedUrl = listing.source_url.replace('bringatrailer/com', 'bringatrailer.com');
    
    const { error: updateError } = await supabase
      .from('listings')
      .update({ source_url: fixedUrl })
      .eq('id', listing.id);
    
    if (updateError) {
      console.error(`Error fixing URL for listing ${listing.id}:`, updateError);
    } else {
      fixedCount++;
      console.log(`Fixed: ${listing.source_url} -> ${fixedUrl}`);
    }
  }
  
  console.log(`\n✅ Fixed ${fixedCount} URLs`);
}

fixMalformedUrls().catch(console.error);