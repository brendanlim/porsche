#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create admin client directly
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function fixMileage() {
  console.log('Fixing incorrect mileage for GT3 listing...');
  
  // Fix the incorrect mileage
  const { error } = await supabaseAdmin
    .from('listings')
    .update({ mileage: 8000 })
    .eq('source_url', 'https://bringatrailer.com/listing/2004-porsche-911-gt3-64/');

  if (error) {
    console.error('Error updating:', error);
  } else {
    console.log('✅ Fixed mileage: 186,000 → 8,000 miles');
  }
}

fixMileage().catch(console.error);