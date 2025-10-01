#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { decodePorscheVIN, getTrimFromVIN } from '../../lib/utils/porsche-vin-decoder';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Target VINs that should be GT3 Touring models
const targetVINs = [
  'WP0AC2A94JS176169',
  'WP0AC2A94JS176222',
  'WP0AC2A99JS176295',
  'WP0AC2A99JS176782'
];

interface ListingRecord {
  id: string;
  vin: string | null;
  trim: string | null;
  model: string | null;
  year: number | null;
  generation: string | null;
  title: string | null;
  source_url: string | null;
}

async function main() {
  console.log('🔍 GT3 Touring Trim Identification Fix');
  console.log('━'.repeat(60));

  // Step 1: Query current state of target VINs
  console.log('\n📋 Step 1: Checking current trim values for target VINs');

  const { data: targetListings, error: targetError } = await supabase
    .from('listings')
    .select('id, vin, trim, model, year, generation, title, source_url')
    .in('vin', targetVINs)
    .order('vin');

  if (targetError) {
    console.error('❌ Error fetching target VINs:', targetError);
    return;
  }

  console.log(`\n📊 Found ${targetListings?.length || 0} listings with target VINs:`);
  targetListings?.forEach((listing, index) => {
    console.log(`${index + 1}. VIN: ${listing.vin}`);
    console.log(`   Current Trim: ${listing.trim || 'N/A'}`);
    console.log(`   Model: ${listing.model || 'N/A'}`);
    console.log(`   Year: ${listing.year || 'N/A'}`);
    console.log(`   Generation: ${listing.generation || 'N/A'}`);
    console.log(`   Title: ${listing.title || 'N/A'}`);
    console.log('');
  });

  // Step 2: Use VIN decoder to analyze the VINs
  console.log('\n🔧 Step 2: Analyzing VINs with decoder');

  const decodedVINs = targetVINs.map(vin => {
    const decoded = decodePorscheVIN(vin);
    return {
      vin,
      decoded,
      currentTrim: decoded.engineType || '',
      shouldBeTrim: 'GT3 Touring' // We know these should be GT3 Touring
    };
  });

  decodedVINs.forEach((analysis, index) => {
    console.log(`${index + 1}. VIN: ${analysis.vin}`);
    console.log(`   Decoded Trim: ${analysis.currentTrim}`);
    console.log(`   Should Be: ${analysis.shouldBeTrim}`);
    console.log(`   Model: ${analysis.decoded.model}`);
    console.log(`   Year: ${analysis.decoded.modelYear}`);
    console.log(`   Generation: ${analysis.decoded.generation}`);
    console.log(`   Valid: ${analysis.decoded.valid}`);
    console.log(`   Confidence: ${analysis.decoded.confidence}`);
    if (analysis.decoded.errorMessages?.length) {
      console.log(`   Errors: ${analysis.decoded.errorMessages.join(', ')}`);
    }
    console.log('');
  });

  // Step 3: Search for similar 991 GT3s that might need fixing
  console.log('\n🔎 Step 3: Searching for other 991 GT3s with similar VIN patterns');

  // Look for VINs starting with WP0AC2A9 (991 GT3 pattern)
  const { data: similarListings, error: similarError } = await supabase
    .from('listings')
    .select('id, vin, trim, model, year, generation, title, source_url')
    .like('vin', 'WP0AC2A9%')
    .eq('model', '911')
    .in('trim', ['GT3', 'GT3 RS'])
    .order('vin');

  if (similarError) {
    console.error('❌ Error fetching similar VINs:', similarError);
    return;
  }

  console.log(`\n📊 Found ${similarListings?.length || 0} similar 991 GT3/GT3 RS listings:`);

  const potentialTouringListings: Array<{
    listing: ListingRecord;
    analysis: {
      isLikelyTouring: boolean;
      reason: string;
    };
  }> = [];

  similarListings?.forEach((listing, index) => {
    const analysis = analyzeIfGT3Touring(listing);

    console.log(`${index + 1}. VIN: ${listing.vin}`);
    console.log(`   Current Trim: ${listing.trim}`);
    console.log(`   Analysis: ${analysis.isLikelyTouring ? 'LIKELY GT3 TOURING' : 'Standard GT3'}`);
    console.log(`   Reason: ${analysis.reason}`);
    console.log(`   Title: ${listing.title || 'N/A'}`);
    console.log('');

    if (analysis.isLikelyTouring) {
      potentialTouringListings.push({ listing, analysis });
    }
  });

  // Step 4: Update the database records
  console.log('\n💾 Step 4: Updating database records');

  const updates: Array<{
    id: string;
    vin: string;
    oldTrim: string;
    newTrim: string;
    reason: string;
  }> = [];

  // Update target VINs
  for (const targetListing of targetListings || []) {
    if (targetListing.trim !== 'GT3 Touring') {
      updates.push({
        id: targetListing.id,
        vin: targetListing.vin!,
        oldTrim: targetListing.trim || 'Unknown',
        newTrim: 'GT3 Touring',
        reason: 'Known GT3 Touring VIN from user report'
      });
    }
  }

  // Update potential touring models found in search
  for (const potential of potentialTouringListings) {
    if (potential.listing.trim !== 'GT3 Touring') {
      updates.push({
        id: potential.listing.id,
        vin: potential.listing.vin!,
        oldTrim: potential.listing.trim || 'Unknown',
        newTrim: 'GT3 Touring',
        reason: potential.analysis.reason
      });
    }
  }

  console.log(`\n📋 Planning to update ${updates.length} records:`);
  updates.forEach((update, index) => {
    console.log(`${index + 1}. VIN: ${update.vin}`);
    console.log(`   ${update.oldTrim} → ${update.newTrim}`);
    console.log(`   Reason: ${update.reason}`);
    console.log('');
  });

  if (updates.length === 0) {
    console.log('✅ No updates needed - all records already have correct trim values');
    return;
  }

  // Confirm before proceeding
  console.log('\n⚠️  Ready to update database. Proceed? (This will modify data)');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Perform the updates
  console.log('\n🔄 Performing database updates...');

  let successCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          trim: update.newTrim,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);

      if (error) {
        console.error(`❌ Failed to update VIN ${update.vin}:`, error);
        errorCount++;
      } else {
        console.log(`✅ Updated VIN ${update.vin}: ${update.oldTrim} → ${update.newTrim}`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception updating VIN ${update.vin}:`, err);
      errorCount++;
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📊 UPDATE SUMMARY');
  console.log('━'.repeat(60));
  console.log(`✅ Successful updates: ${successCount}`);
  console.log(`❌ Failed updates: ${errorCount}`);
  console.log(`📦 Total processed: ${updates.length}`);

  if (successCount > 0) {
    console.log('\n📋 CHANGES MADE:');
    updates.forEach((update, index) => {
      console.log(`${index + 1}. VIN: ${update.vin}`);
      console.log(`   Trim: ${update.oldTrim} → ${update.newTrim}`);
      console.log(`   Reason: ${update.reason}`);
      console.log('');
    });
  }

  console.log('\n✅ GT3 Touring trim fix completed!');
}

/**
 * Analyze if a GT3 listing is likely a GT3 Touring model
 * based on VIN patterns and title keywords
 */
function analyzeIfGT3Touring(listing: ListingRecord): {
  isLikelyTouring: boolean;
  reason: string;
} {
  const vin = listing.vin || '';
  const title = (listing.title || '').toLowerCase();

  // Check if title explicitly mentions "touring"
  if (title.includes('touring')) {
    return {
      isLikelyTouring: true,
      reason: 'Title contains "touring"'
    };
  }

  // Check if title explicitly mentions "gt3 t"
  if (title.includes('gt3 t')) {
    return {
      isLikelyTouring: true,
      reason: 'Title contains "GT3 T"'
    };
  }

  // Check specific VIN patterns for known GT3 Touring VINs
  // 991.1 GT3 Touring VINs often have specific patterns
  if (vin.startsWith('WP0AC2A9') && listing.year && listing.year >= 2017 && listing.year <= 2019) {
    // Look for specific position patterns in 991.1 GT3 Touring
    // Position 5 (index 4) and other indicators
    const pos5 = vin[4];
    const pos6 = vin[5];

    // Based on research, GT3 Touring models often have specific patterns
    if (pos5 === '4' || pos5 === '9') {
      return {
        isLikelyTouring: true,
        reason: `VIN pattern suggests GT3 Touring (pos5: ${pos5})`
      };
    }
  }

  // 991.2 GT3 Touring patterns (2018-2019)
  if (vin.startsWith('WP0AC2A9') && listing.year && listing.year >= 2018 && listing.year <= 2019) {
    const pos5 = vin[4];
    if (pos5 === '9') {
      return {
        isLikelyTouring: true,
        reason: `VIN pattern suggests 991.2 GT3 Touring (pos5: ${pos5})`
      };
    }
  }

  return {
    isLikelyTouring: false,
    reason: 'No GT3 Touring indicators found'
  };
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});