#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixGT4RSListings() {
  // Get all GT4 listings that are actually GT4 RS based on title
  const { data: toFix } = await supabase
    .from('listings')
    .select('id, title, trim, price')
    .eq('trim', 'GT4')
    .or('title.ilike.%GT4 RS%,title.ilike.%GT4RS%');

  console.log('Found ' + (toFix?.length || 0) + ' GT4 listings that are actually GT4 RS');

  if (toFix && toFix.length > 0) {
    // Show some samples
    console.log('\nSample listings to fix:');
    toFix.slice(0, 5).forEach(item => {
      console.log('  - ' + item.title);
    });

    // Update them to GT4 RS
    const ids = toFix.map(item => item.id);

    const { error } = await supabase
      .from('listings')
      .update({ trim: 'GT4 RS' })
      .in('id', ids);

    if (error) {
      console.error('Error updating:', error);
    } else {
      console.log('\n✅ Successfully updated ' + toFix.length + ' listings from GT4 to GT4 RS');

      // Show price ranges
      const prices = toFix.map(l => l.price).filter(p => p).sort((a, b) => a - b);
      if (prices.length > 0) {
        console.log('\nPrice range of fixed GT4 RS listings:');
        console.log('  Min: $' + prices[0].toLocaleString());
        console.log('  Max: $' + prices[prices.length - 1].toLocaleString());
        console.log('  Median: $' + prices[Math.floor(prices.length / 2)].toLocaleString());
      }
    }
  }

  // Also check for any GT4 Clubsport
  const { data: clubsport } = await supabase
    .from('listings')
    .select('id, title, trim')
    .eq('trim', 'GT4')
    .ilike('title', '%Clubsport%');

  if (clubsport && clubsport.length > 0) {
    console.log('\nFound ' + clubsport.length + ' GT4 Clubsport listings to fix');

    const ids = clubsport.map(item => item.id);

    const { error } = await supabase
      .from('listings')
      .update({ trim: 'GT4 Clubsport' })
      .in('id', ids);

    if (!error) {
      console.log('✅ Updated ' + clubsport.length + ' listings to GT4 Clubsport');
    }
  }

  // Check what's left as regular GT4
  const { data: remaining } = await supabase
    .from('listings')
    .select('title, price')
    .eq('trim', 'GT4')
    .order('price', { ascending: false })
    .limit(10);

  console.log('\nRemaining GT4 listings (should be regular GT4s):');
  remaining?.forEach(item => {
    console.log('  $' + (item.price || 0).toLocaleString() + ' - ' + item.title);
  });
}

fixGT4RSListings();