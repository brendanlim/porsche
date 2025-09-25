#!/usr/bin/env npx tsx
/**
 * Compare VIN-based vs OpenAI normalization
 */

import { createClient } from '@supabase/supabase-js';
import { extractModelTrimFromVIN } from '../../lib/services/vin-model-trim-decoder';
import { enhancedNormalizeModelTrim } from '../../lib/services/enhanced-vin-normalizer';
import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function compareNormalizationMethods() {
  console.log('🔍 Comparing Normalization Methods\n');
  console.log('=' .repeat(80));

  // Fetch sample listings
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, vin, model, trim, year, title')
    .not('vin', 'is', null)
    .in('model', ['911', '718 Cayman', '718 Boxster', 'Cayman', 'Boxster'])
    .limit(50);

  if (error) {
    console.error('Failed to fetch listings:', error);
    return;
  }

  console.log(`\nAnalyzing ${listings.length} listings...\n`);

  const results = {
    vinOnly: { matches: 0, highConfidence: 0, total: 0 },
    enhanced: { matches: 0, total: 0 },
    improvements: [] as any[]
  };

  for (const listing of listings) {
    // VIN-only extraction
    const vinOnly = extractModelTrimFromVIN(listing.vin);
    results.vinOnly.total++;

    if (vinOnly.confidence === 'high') {
      results.vinOnly.highConfidence++;
    }

    if (vinOnly.model === listing.model && vinOnly.trim === listing.trim) {
      results.vinOnly.matches++;
    }

    // Enhanced extraction (VIN + title parsing, no OpenAI)
    const enhanced = await enhancedNormalizeModelTrim(listing.title, listing.vin);
    results.enhanced.total++;

    if (enhanced.model === listing.model && enhanced.trim === listing.trim) {
      results.enhanced.matches++;
    }

    // Track improvements
    if (enhanced.model === listing.model && enhanced.trim === listing.trim &&
        !(vinOnly.model === listing.model && vinOnly.trim === listing.trim)) {
      results.improvements.push({
        id: listing.id,
        title: listing.title,
        vin: listing.vin,
        existing: { model: listing.model, trim: listing.trim },
        vinOnly: { model: vinOnly.model, trim: vinOnly.trim },
        enhanced: { model: enhanced.model, trim: enhanced.trim }
      });
    }
  }

  // Print results
  console.log('\n📊 Results Summary:');
  console.log('=' .repeat(80));

  console.log('\n1. VIN-Only Decoder:');
  console.log(`   Matches: ${results.vinOnly.matches}/${results.vinOnly.total} (${((results.vinOnly.matches / results.vinOnly.total) * 100).toFixed(1)}%)`);
  console.log(`   High Confidence: ${results.vinOnly.highConfidence}/${results.vinOnly.total} (${((results.vinOnly.highConfidence / results.vinOnly.total) * 100).toFixed(1)}%)`);

  console.log('\n2. Enhanced (VIN + Title, No OpenAI):');
  console.log(`   Matches: ${results.enhanced.matches}/${results.enhanced.total} (${((results.enhanced.matches / results.enhanced.total) * 100).toFixed(1)}%)`);

  const improvement = ((results.enhanced.matches - results.vinOnly.matches) / results.vinOnly.total) * 100;
  console.log(`\n📈 Improvement: +${improvement.toFixed(1)}% accuracy with enhanced method`);

  // Show improvements
  if (results.improvements.length > 0) {
    console.log(`\n✅ Cases where Enhanced method fixed VIN-only issues (${results.improvements.length} total):`);
    console.log('=' .repeat(80));
    results.improvements.slice(0, 3).forEach(item => {
      console.log(`\nTitle: ${item.title}`);
      console.log(`VIN: ${item.vin}`);
      console.log(`Correct: Model="${item.existing.model}", Trim="${item.existing.trim}"`);
      console.log(`VIN-Only: Model="${item.vinOnly.model}", Trim="${item.vinOnly.trim}" ❌`);
      console.log(`Enhanced: Model="${item.enhanced.model}", Trim="${item.enhanced.trim}" ✅`);
    });
  }

  // Overall assessment
  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 Recommendation:');

  const enhancedAccuracy = (results.enhanced.matches / results.enhanced.total) * 100;

  if (enhancedAccuracy >= 90) {
    console.log('✅ Enhanced method is ready to replace OpenAI normalization!');
    console.log('   - Achieves ' + enhancedAccuracy.toFixed(1) + '% accuracy');
    console.log('   - No API costs');
    console.log('   - Instant processing');
    console.log('   - Deterministic results');
  } else if (enhancedAccuracy >= 80) {
    console.log('⚠️ Enhanced method is good but could use refinement');
    console.log('   - Current accuracy: ' + enhancedAccuracy.toFixed(1) + '%');
    console.log('   - Consider using OpenAI as fallback for low-confidence cases');
  } else {
    console.log('❌ Continue using OpenAI for now');
    console.log('   - Enhanced accuracy: ' + enhancedAccuracy.toFixed(1) + '%');
    console.log('   - Need more VIN patterns in database');
  }

  // Cost savings estimate
  const costPerCall = 0.00015; // Approximate cost per OpenAI call
  const callsPerMonth = 10000; // Estimated monthly volume
  const potentialSavings = (enhancedAccuracy / 100) * callsPerMonth * costPerCall;

  console.log('\n💰 Estimated Cost Savings:');
  console.log(`   - Can eliminate ${enhancedAccuracy.toFixed(1)}% of OpenAI calls`);
  console.log(`   - Monthly savings: $${potentialSavings.toFixed(2)}`);
  console.log(`   - Annual savings: $${(potentialSavings * 12).toFixed(2)}`);
}

// Run comparison
compareNormalizationMethods().catch(console.error);