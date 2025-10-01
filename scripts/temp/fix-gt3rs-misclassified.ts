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

// VINs that should be GT3 RS but are classified as GT3
const targetVins = [
  'WP0AF2A90GS192496',
  'WP0AF2A90GS193132'
];

async function fixGT3RSTrims() {
  console.log('🚗 Fixing GT3 RS trim misclassifications');
  console.log('━'.repeat(60));

  // First, let's check these specific VINs
  console.log('\n📊 Checking target VINs:');
  for (const vin of targetVins) {
    const { data, error } = await supabase
      .from('listings')
      .select('id, vin, model, trim, year, title')
      .eq('vin', vin)
      .single();

    if (error) {
      console.log(`  ❌ ${vin} - Not found in database`);
      continue;
    }

    if (data) {
      console.log(`\n  📍 VIN: ${vin}`);
      console.log(`     Current: ${data.year} ${data.model} ${data.trim || 'NULL'}`);
      console.log(`     Title: ${data.title}`);

      // The VIN pattern WP0AF2A9 indicates 991 GT3 RS
      // Position 7-8: AF = 991 GT3 RS
      if (vin.substring(3, 8) === 'AF2A9') {
        console.log(`     ✅ Confirmed as GT3 RS based on VIN pattern`);

        // Update the trim
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            trim: 'GT3 RS',
            model: '911'
          })
          .eq('id', data.id);

        if (updateError) {
          console.log(`     ❌ Failed to update: ${updateError.message}`);
        } else {
          console.log(`     ✅ Updated to GT3 RS`);
        }
      }
    }
  }

  // Now let's search for any other 991 GT3 RS that might be misclassified
  console.log('\n\n📊 Searching for other misclassified GT3 RS...');
  console.log('━'.repeat(60));

  // VIN pattern for 991 GT3 RS: WP0AF2A9
  const { data: potentialGT3RS, error: searchError } = await supabase
    .from('listings')
    .select('id, vin, model, trim, year, title')
    .like('vin', 'WP0AF2A9%')
    .not('trim', 'eq', 'GT3 RS');

  if (searchError) {
    console.log(`❌ Error searching for GT3 RS: ${searchError.message}`);
    return;
  }

  if (potentialGT3RS && potentialGT3RS.length > 0) {
    console.log(`\n📍 Found ${potentialGT3RS.length} potential GT3 RS misclassified:\n`);

    let updateCount = 0;
    for (const listing of potentialGT3RS) {
      console.log(`  VIN: ${listing.vin}`);
      console.log(`  Current: ${listing.year} ${listing.model} ${listing.trim || 'NULL'}`);
      console.log(`  Title: ${listing.title}`);

      // Confirm it's a GT3 RS based on VIN pattern
      if (listing.vin.substring(3, 8) === 'AF2A9') {
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            trim: 'GT3 RS',
            model: '911'
          })
          .eq('id', listing.id);

        if (updateError) {
          console.log(`  ❌ Failed to update: ${updateError.message}`);
        } else {
          console.log(`  ✅ Updated to GT3 RS`);
          updateCount++;
        }
      }
      console.log();
    }

    console.log(`\n✅ Updated ${updateCount} listings to GT3 RS`);
  } else {
    console.log('✅ No additional misclassified GT3 RS found');
  }

  // Also check for any GT3 RS with wrong VIN pattern but GT3 RS in title
  console.log('\n\n📊 Checking for GT3 RS based on title...');
  console.log('━'.repeat(60));

  const { data: titleBasedGT3RS, error: titleError } = await supabase
    .from('listings')
    .select('id, vin, model, trim, year, title')
    .or('title.ilike.%GT3 RS%,title.ilike.%GT3RS%')
    .not('trim', 'eq', 'GT3 RS');

  if (titleBasedGT3RS && titleBasedGT3RS.length > 0) {
    console.log(`\n📍 Found ${titleBasedGT3RS.length} listings with GT3 RS in title but wrong trim:\n`);

    for (const listing of titleBasedGT3RS) {
      console.log(`  VIN: ${listing.vin}`);
      console.log(`  Current: ${listing.year} ${listing.model} ${listing.trim || 'NULL'}`);
      console.log(`  Title: ${listing.title}`);

      // Check if it's actually a GT3 RS based on VIN
      if (listing.vin.substring(3, 8) === 'AF2A9' || listing.vin.substring(3, 8) === 'AF2A90') {
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            trim: 'GT3 RS',
            model: '911'
          })
          .eq('id', listing.id);

        if (updateError) {
          console.log(`  ❌ Failed to update: ${updateError.message}`);
        } else {
          console.log(`  ✅ Updated to GT3 RS`);
        }
      } else {
        console.log(`  ⚠️  Title says GT3 RS but VIN pattern doesn't match - needs manual review`);
      }
      console.log();
    }
  }

  console.log('\n━'.repeat(60));
  console.log('✅ GT3 RS trim fix complete!');
}

// Run the fix
fixGT3RSTrims()
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });