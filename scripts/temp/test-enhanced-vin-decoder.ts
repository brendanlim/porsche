/**
 * Test Enhanced VIN Decoder
 * Compare original vs enhanced decoder performance
 */

import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';
import {
  enhancedDecodePorscheVIN,
  testEnhancedDecoder,
  formatEnhancedDecodedVIN
} from '../../lib/utils/enhanced-porsche-vin-decoder';
import { VIN_VALIDATION_DATASET } from '../../lib/data/vin-validation-dataset';

console.log('🧪 Testing Enhanced VIN Decoder\n');
console.log('=' .repeat(70));

// Test the enhanced decoder against validation dataset
console.log('📊 Running Validation Dataset Test...\n');

const testResults = testEnhancedDecoder();

console.log(`📈 Test Results:`);
console.log(`  Total Tests: ${testResults.totalTests}`);
console.log(`  Correct: ${testResults.correct}`);
console.log(`  Incorrect: ${testResults.incorrect}`);
console.log(`  Accuracy: ${testResults.accuracy.toFixed(1)}%\n`);

// Show detailed comparison for a few sample VINs
console.log('🔍 Detailed Comparison (Original vs Enhanced)\n');
console.log('=' .repeat(70));

const sampleVins = [
  'WP0CA29881U626856', // Should be 718 GT4, not 911
  'WP0CA298XVS620607', // Future year issue
  'WP0AA29941S621519', // Known good 911 GT3
  'WP0ZZZ93ZDS000342', // Race car
  'WP0CA29962S653768', // 2002 911 GT3
];

sampleVins.forEach((vin, index) => {
  console.log(`\n${index + 1}. VIN: ${vin}`);

  // Find expected from dataset
  const sample = VIN_VALIDATION_DATASET.vinSamples.find(s => s.vin === vin);
  if (sample) {
    console.log(`   Expected: ${sample.year} ${sample.model} ${sample.trim}`);
  }

  // Original decoder
  const original = decodePorscheVIN(vin);
  console.log(`   Original: ${original.modelYear} ${original.model} ${original.engineType || original.bodyStyle || 'Unknown'} (Valid: ${original.valid})`);

  // Enhanced decoder
  const enhanced = enhancedDecodePorscheVIN(vin);
  console.log(`   Enhanced: ${enhanced.modelYear} ${enhanced.model} ${enhanced.engineType || enhanced.bodyStyle || 'Unknown'} (Valid: ${enhanced.valid}, Confidence: ${enhanced.confidence})`);

  if (enhanced.errorMessages && enhanced.errorMessages.length > 0) {
    console.log(`   Warnings: ${enhanced.errorMessages.join(', ')}`);
  }

  console.log(`   Plant: ${enhanced.plantCode}`);
  console.log('-'.repeat(50));
});

// Show accuracy improvement statistics
console.log('\n📊 Accuracy Analysis\n');

let originalCorrect = 0;
let enhancedCorrect = 0;

VIN_VALIDATION_DATASET.vinSamples.forEach(sample => {
  const original = decodePorscheVIN(sample.vin);
  const enhanced = enhancedDecodePorscheVIN(sample.vin);

  // Check original accuracy
  const originalYearMatch = original.modelYear === sample.year;
  const originalModelMatch = original.model === sample.model;
  const originalTrimMatch = (original.engineType || original.bodyStyle || '').includes(sample.trim);

  if (originalYearMatch && originalModelMatch) {
    originalCorrect++;
  }

  // Enhanced accuracy already calculated above
});

const originalAccuracy = (originalCorrect / VIN_VALIDATION_DATASET.vinSamples.length) * 100;

console.log(`Original Decoder Accuracy: ${originalAccuracy.toFixed(1)}%`);
console.log(`Enhanced Decoder Accuracy: ${testResults.accuracy.toFixed(1)}%`);
console.log(`Improvement: ${(testResults.accuracy - originalAccuracy).toFixed(1)} percentage points\n`);

// Show errors from enhanced decoder
if (testResults.errors.length > 0) {
  console.log(`❌ Remaining Errors (${testResults.errors.length}):\n`);

  testResults.errors.slice(0, 10).forEach((error, index) => {
    console.log(`${index + 1}. VIN: ${error.vin}`);
    console.log(`   Expected: ${error.expected.year} ${error.expected.model} ${error.expected.trim}`);
    console.log(`   Actual:   ${error.actual.year} ${error.actual.model} ${error.actual.trim}`);
    console.log(`   Confidence: ${error.confidence}`);
    console.log('');
  });

  if (testResults.errors.length > 10) {
    console.log(`... and ${testResults.errors.length - 10} more errors\n`);
  }
}

// Test specific problem cases
console.log('🔧 Testing Specific Problem Cases\n');
console.log('=' .repeat(50));

const problemCases = [
  { vin: 'WP0CA29881U626856', issue: 'Plant U should indicate 718, not 911' },
  { vin: 'WP0CA298XVS620607', issue: 'Future year (2027) should be flagged' },
  { vin: 'WP0CB29851U660590', issue: 'GT4 Clubsport should be 718' },
];

problemCases.forEach((testCase, index) => {
  console.log(`${index + 1}. Issue: ${testCase.issue}`);
  console.log(`   VIN: ${testCase.vin}`);

  const enhanced = enhancedDecodePorscheVIN(testCase.vin);
  console.log(`   Result: ${enhanced.modelYear} ${enhanced.model} ${enhanced.engineType || enhanced.bodyStyle || 'Unknown'}`);
  console.log(`   Confidence: ${enhanced.confidence}`);
  console.log(`   Plant: ${enhanced.plantCode}`);

  if (enhanced.errorMessages) {
    console.log(`   Messages: ${enhanced.errorMessages.join(', ')}`);
  }

  console.log('');
});

console.log('✅ Enhanced VIN Decoder Testing Complete!');