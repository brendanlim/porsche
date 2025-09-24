/**
 * Analyze VIN Decoder Issues
 *
 * This script examines specific VINs from the validation dataset
 * to understand decoding issues and improve accuracy
 */

import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';
import { VIN_VALIDATION_DATASET } from '../../lib/data/vin-validation-dataset';

// Analyze problematic VINs
const problematicVins = [
  // Future years (2027-2030)
  'WP0CA298XVS620607', // Shows as 2027
  'WP0CA298XXU632280', // Shows as 2029

  // GT4 Clubsport as 911 (likely should be 718)
  'WP0CA29881U626856', // 2001 911 GT4 Clubsport?
  'WP0CB29851U660590', // 2001 911 GT4 Clubsport?

  // Some known good VINs for comparison
  'WP0AA29941S621519', // 2001 911 GT3
  'WP0ZZZ93ZDS000342', // 2013 911 Race
];

console.log('🔍 Analyzing VIN Decoder Issues\n');
console.log('=' .repeat(70));

// Detailed analysis function
function analyzeVin(vin: string, expectedInfo?: string) {
  console.log(`\n📋 VIN: ${vin}`);
  if (expectedInfo) {
    console.log(`📌 Expected: ${expectedInfo}`);
  }

  // Decode with current decoder
  const decoded = decodePorscheVIN(vin);
  console.log(`✅ Valid: ${decoded.valid}`);

  if (decoded.valid) {
    console.log(`📅 Year: ${decoded.modelYear} (from position ${vin.charAt(9)})`);
    console.log(`🚗 Model: ${decoded.model}`);
    console.log(`🏭 Generation: ${decoded.generation || 'None'}`);
    console.log(`🏎️  Body Style: ${decoded.bodyStyle || 'None'}`);
    console.log(`⚡ Engine Type: ${decoded.engineType || 'None'}`);
    console.log(`🏭 Plant: ${decoded.plantCode}`);
  } else {
    console.log(`❌ Errors: ${decoded.errorMessages?.join(', ')}`);
  }

  // Manual breakdown
  console.log(`\n🔤 Manual VIN Breakdown:`);
  console.log(`  WMI (1-3): ${vin.substring(0, 3)}`);
  console.log(`  VDS (4-9): ${vin.substring(3, 9)}`);
  console.log(`    Positions 4-6: ${vin.substring(3, 6)}`);
  console.log(`    Positions 7-8: ${vin.substring(6, 8)}`);
  console.log(`    Check digit (9): ${vin.charAt(8)}`);
  console.log(`  VIS (10-17): ${vin.substring(9, 17)}`);
  console.log(`    Model year (10): ${vin.charAt(9)}`);
  console.log(`    Plant code (11): ${vin.charAt(10)}`);
  console.log(`    Serial (12-17): ${vin.substring(11, 17)}`);

  console.log('-'.repeat(50));
}

// Analyze each VIN
problematicVins.forEach(vin => {
  let expectedInfo = '';

  // Find expected info from validation dataset
  const sample = VIN_VALIDATION_DATASET.vinSamples.find(s => s.vin === vin);
  if (sample) {
    expectedInfo = `${sample.year} ${sample.model} ${sample.trim}`;
  }

  analyzeVin(vin, expectedInfo);
});

// Check model year decoding specifically
console.log('\n\n📅 Model Year Code Analysis');
console.log('=' .repeat(50));

const yearCodes = ['1', '2', '3', '4', '5', '6', '7', '8', '9',
                   'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K',
                   'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V', 'W', 'X', 'Y'];

yearCodes.forEach(code => {
  // Create a test VIN with this year code
  const testVin = `WP0AA29941${code}621519`; // Based on known good VIN
  const decoded = decodePorscheVIN(testVin);
  console.log(`${code}: ${decoded.modelYear || 'Invalid'}`);
});

// Look for patterns in VIN positions that might indicate 718 vs 911
console.log('\n\n🔍 VIN Pattern Analysis for Model Detection');
console.log('=' .repeat(60));

// Group VINs by positions 4-6 and 7-8 to find patterns
const patterns: Record<string, string[]> = {};

VIN_VALIDATION_DATASET.vinSamples.forEach(sample => {
  const positions456 = sample.vin.substring(3, 6);
  const positions78 = sample.vin.substring(6, 8);
  const key = `${positions456}-${positions78}`;

  if (!patterns[key]) {
    patterns[key] = [];
  }

  patterns[key].push(`${sample.year} ${sample.model} ${sample.trim}`);
});

console.log('Patterns (Positions 4-6 and 7-8):');
Object.entries(patterns).forEach(([pattern, models]) => {
  console.log(`  ${pattern}: ${models[0]} ${models.length > 1 ? `(+${models.length - 1} more)` : ''}`);
});

console.log('\n✅ Analysis complete!');