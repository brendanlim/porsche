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

async function checkDataIssues() {
  console.log('Checking data issues in 996 GT3 listings...\n');

  // Get all 996 GT3 listings
  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('generation', '996');

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Total 996 GT3 listings: ${listings?.length || 0}\n`);

  // Check color variations
  const colors: Record<string, number> = {};
  const lowercaseColors: string[] = [];
  
  listings?.forEach(l => {
    if (l.exterior_color) {
      colors[l.exterior_color] = (colors[l.exterior_color] || 0) + 1;
      
      // Check for lowercase colors
      if (l.exterior_color === l.exterior_color.toLowerCase() && l.exterior_color !== 'N/A') {
        lowercaseColors.push(l.exterior_color);
      }
    }
  });

  console.log('Color variations:');
  Object.entries(colors)
    .sort(([,a], [,b]) => b - a)
    .forEach(([color, count]) => {
      const isLowercase = color === color.toLowerCase() && color !== 'N/A';
      console.log(`  ${count.toString().padStart(4)} ${color}${isLowercase ? ' ⚠️ (not normalized)' : ''}`);
    });

  if (lowercaseColors.length > 0) {
    console.log('\n⚠️ Found non-normalized colors (lowercase):');
    console.log('  ', [...new Set(lowercaseColors)].join(', '));
  }

  // Check for extreme mileage
  console.log('\nMileage analysis:');
  const mileages = listings?.filter(l => l.mileage).map(l => l.mileage) || [];
  
  if (mileages.length > 0) {
    const maxMileage = Math.max(...mileages);
    const minMileage = Math.min(...mileages);
    const avgMileage = mileages.reduce((a, b) => a + b, 0) / mileages.length;
    
    console.log(`  Min: ${minMileage.toLocaleString()} miles`);
    console.log(`  Max: ${maxMileage.toLocaleString()} miles`);
    console.log(`  Avg: ${Math.round(avgMileage).toLocaleString()} miles`);
    
    // Find high mileage listings
    const highMileageListings = listings?.filter(l => l.mileage && l.mileage > 150000) || [];
    if (highMileageListings.length > 0) {
      console.log('\n⚠️ High mileage listings (>150k):');
      highMileageListings.forEach(l => {
        console.log(`  - ${l.year || '?'} ${l.model} ${l.trim} - ${l.mileage?.toLocaleString()} miles`);
        console.log(`    Price: $${l.price?.toLocaleString() || '?'}`);
        console.log(`    Source: ${l.source} (${l.source_url || 'no url'})`);
      });
    }
  }

  // Fix color normalization
  console.log('\n📝 Fixing color normalization...');
  
  for (const listing of listings || []) {
    if (listing.exterior_color && listing.exterior_color === listing.exterior_color.toLowerCase() && listing.exterior_color !== 'N/A') {
      // Capitalize first letter of each word
      const normalized = listing.exterior_color
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const { error: updateError } = await supabaseAdmin
        .from('listings')
        .update({ exterior_color: normalized })
        .eq('id', listing.id);
      
      if (updateError) {
        console.error(`  Failed to update color for listing ${listing.id}:`, updateError);
      } else {
        console.log(`  ✅ Fixed: "${listing.exterior_color}" → "${normalized}"`);
      }
    }
  }

  console.log('\n✅ Data check complete!');
}

checkDataIssues().catch(console.error);