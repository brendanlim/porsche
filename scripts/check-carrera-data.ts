#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCarreraData() {
  // Check for 911 Carrera listings
  const { data, error, count } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('model', '911')
    .eq('trim', 'carrera');

  console.log('911 Carrera listings (exact match):', count);

  // Check what trims exist for 911
  const { data: trims } = await supabase
    .from('listings')
    .select('trim')
    .eq('model', '911')
    .not('trim', 'is', null);

  const uniqueTrims = [...new Set(trims?.map(t => t.trim))].sort();
  console.log('\nUnique 911 trims in database:');
  uniqueTrims.forEach(t => console.log(' -', t));

  // Check if there's a case sensitivity issue
  const { data: carreraVariants, count: variantCount } = await supabase
    .from('listings')
    .select('trim', { count: 'exact' })
    .eq('model', '911')
    .ilike('trim', '%carrera%');

  console.log('\nListings with "carrera" in trim (case-insensitive):', variantCount);
  const variants = [...new Set(carreraVariants?.map(t => t.trim))];
  console.log('Carrera variants found:', variants);
  
  // Check for different casing
  const { count: upperCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('model', '911')
    .eq('trim', 'Carrera');
    
  console.log('\n911 "Carrera" (capital C):', upperCount);
  
  // Get sample of 911 listings to see actual trim values
  const { data: samples } = await supabase
    .from('listings')
    .select('trim, title')
    .eq('model', '911')
    .limit(20);
    
  console.log('\nSample 911 listings:');
  samples?.forEach(s => console.log(` - trim: "${s.trim}" | title: ${s.title?.substring(0, 50)}`));
}

checkCarreraData().catch(console.error);