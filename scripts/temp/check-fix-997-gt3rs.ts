#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFix997GT3RS() {
  console.log('🔍 Checking 997 GT3 RS VIN: WP0AC29968S792132');
  console.log('━'.repeat(80));

  // First check this specific VIN
  const targetVin = 'WP0AC29968S792132';

  const { data: listing, error } = await supabase
    .from('listings')
    .select('*')
    .eq('vin', targetVin)
    .single();

  if (error) {
    console.error('Error fetching listing:', error);
    return;
  }

  if (listing) {
    console.log('\n📊 Current listing details:');
    console.log(`  VIN: ${listing.vin}`);
    console.log(`  Year: ${listing.year}`);
    console.log(`  Model: ${listing.model}`);
    console.log(`  Trim: ${listing.trim}`);
    console.log(`  Generation: ${listing.generation}`);
    console.log(`  Title: ${listing.title}`);
    console.log(`  Price: $${listing.price?.toLocaleString()}`);

    // Check VIN pattern for 997 GT3 RS
    // Position 4-5: AC indicates 911 GT3/GT3 RS
    // Position 6: 2 could indicate specific variant
    // Position 7-8: 99 is standard for 911
    // For 997 GT3 RS, we need to check the title or other indicators

    const isGT3RS = listing.title?.toLowerCase().includes('gt3 rs') ||
                    listing.title?.toLowerCase().includes('gt3rs');

    if (isGT3RS && listing.trim !== 'GT3 RS') {
      console.log('\n⚠️  This is a GT3 RS but labeled as:', listing.trim);
      console.log('  Updating to GT3 RS...');

      const { error: updateError } = await supabase
        .from('listings')
        .update({ trim: 'GT3 RS' })
        .eq('id', listing.id);

      if (updateError) {
        console.error('  ❌ Update failed:', updateError.message);
      } else {
        console.log('  ✅ Updated to GT3 RS');
      }
    } else if (listing.trim === 'GT3 RS') {
      console.log('\n✅ Already correctly labeled as GT3 RS');
    } else {
      console.log('\n❓ Title does not clearly indicate GT3 RS');
    }
  }

  // Now search for other potential 997 GT3 RS that might be mislabeled
  console.log('\n\n🔍 Searching for other potential 997 GT3 RS misclassifications...');
  console.log('━'.repeat(80));

  // Search for 997 generation GT3s that might be GT3 RS
  const { data: potential997GT3RS, error: searchError } = await supabase
    .from('listings')
    .select('id, vin, year, model, trim, title, price')
    .or('generation.eq.997,generation.eq.997.1,generation.eq.997.2')
    .ilike('model', '911')
    .or('title.ilike.%GT3 RS%,title.ilike.%GT3RS%');

  if (searchError) {
    console.error('Search error:', searchError);
    return;
  }

  if (potential997GT3RS && potential997GT3RS.length > 0) {
    const misclassified = potential997GT3RS.filter(l => l.trim !== 'GT3 RS');

    if (misclassified.length > 0) {
      console.log(`\n📍 Found ${misclassified.length} potential GT3 RS listings not labeled as GT3 RS:\n`);

      for (const listing of misclassified) {
        console.log(`  VIN: ${listing.vin}`);
        console.log(`  Year: ${listing.year} | Current trim: ${listing.trim}`);
        console.log(`  Title: ${listing.title}`);

        // Update to GT3 RS
        const { error: updateError } = await supabase
          .from('listings')
          .update({ trim: 'GT3 RS' })
          .eq('id', listing.id);

        if (updateError) {
          console.log(`  ❌ Failed to update: ${updateError.message}`);
        } else {
          console.log(`  ✅ Updated to GT3 RS`);
        }
        console.log();
      }
    } else {
      console.log('\n✅ All GT3 RS listings appear to be correctly labeled');
    }
  }

  // Also check for any 997 with VIN patterns that indicate GT3 RS
  console.log('\n\n🔍 Checking VIN patterns for 997 GT3 RS...');
  console.log('━'.repeat(80));

  // 997 GT3 RS VINs typically have specific patterns
  // Let's check all 997 GT3s and see if any have RS-specific patterns
  const { data: all997GT3, error: gt3Error } = await supabase
    .from('listings')
    .select('id, vin, year, model, trim, title')
    .or('generation.eq.997,generation.eq.997.1,generation.eq.997.2')
    .ilike('model', '911')
    .in('trim', ['GT3', 'GT3 Touring']);

  if (all997GT3 && !gt3Error) {
    console.log(`\n📊 Found ${all997GT3.length} 997 GT3s (non-RS labeled)`);

    // Check each for GT3 RS indicators
    const likelyRS = all997GT3.filter(l => {
      const title = l.title?.toLowerCase() || '';
      return title.includes('gt3 rs') || title.includes('gt3rs') || title.includes('gt3-rs');
    });

    if (likelyRS.length > 0) {
      console.log(`\n⚠️  Found ${likelyRS.length} likely GT3 RS based on title:\n`);

      for (const listing of likelyRS) {
        console.log(`  VIN: ${listing.vin}`);
        console.log(`  Title: ${listing.title}`);
        console.log(`  Current trim: ${listing.trim}`);

        const { error: updateError } = await supabase
          .from('listings')
          .update({ trim: 'GT3 RS' })
          .eq('id', listing.id);

        if (updateError) {
          console.log(`  ❌ Failed to update: ${updateError.message}`);
        } else {
          console.log(`  ✅ Updated to GT3 RS`);
        }
        console.log();
      }
    } else {
      console.log('  No additional GT3 RS found among GT3 listings');
    }
  }

  console.log('\n' + '━'.repeat(80));
  console.log('✅ Check and fix complete!');
}

// Run the check and fix
checkAndFix997GT3RS()
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });