import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkListing() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('source_url', 'https://bringatrailer.com/listing/2004-porsche-911-gt3-64/')
    .single();

  if (error) {
    console.log('Error:', error);
  } else if (data) {
    console.log('Listing found:');
    console.log('VIN:', data.vin);
    console.log('Mileage:', data.mileage);
    console.log('Year:', data.year);
    console.log('Model:', data.model);
    console.log('Trim:', data.trim);
    console.log('Price:', data.price);
    console.log('Scraped at:', data.scraped_at);
  } else {
    console.log('No listing found');
  }
}

checkListing();