/**
 * Test script for Porsche VIN decoder
 * Tests various Porsche VINs to validate decoder accuracy
 */

import { decodePorscheVIN, formatDecodedVIN, getModelDisplay, getTrimFromVIN } from '../../lib/utils/porsche-vin-decoder';

// Test VINs from different Porsche models and generations
const testVINs = [
  // 911 Models
  { vin: 'WP0AB2A96BS785577', expected: '2011 911 GT3 RS' },
  { vin: 'WP0CB2A90CS721987', expected: '2012 911 Carrera S' },
  { vin: 'WP0ZZZ99ZHS112486', expected: '2017 911 GT3 Cup' },
  { vin: 'WP0AA2A9XPS140324', expected: '2023 911 Turbo S' },

  // 718 Models
  { vin: 'WP0CA2A89SK212302', expected: '2019 718 Boxster' },
  { vin: 'WP0CC2A85JS220936', expected: '2018 718 Cayman S' },
  { vin: 'WP0CC2A82LK295185', expected: '2020 718 Cayman GT4' },

  // Cayenne (SUV)
  { vin: 'WP1AB29P78LA65831', expected: '2008 Cayenne' },
  { vin: 'WP1AA2A23CLA52320', expected: '2012 Cayenne S' },

  // Macan
  { vin: 'WP1AB2A50FLB52865', expected: '2015 Macan' },

  // Panamera
  { vin: 'WP0AA2A73BL051401', expected: '2011 Panamera' },
  { vin: 'WP0AE2A79JL172339', expected: '2018 Panamera 4S' },

  // Taycan (Electric)
  { vin: 'WP0ZZZY1AMS103245', expected: '2021 Taycan' },

  // Invalid VINs for testing
  { vin: 'INVALID123456789X', expected: 'Invalid' },
  { vin: 'WP0AB2A96BS', expected: 'Invalid - too short' },
];

console.log('Testing Porsche VIN Decoder\n');
console.log('=' .repeat(80));

testVINs.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: ${test.vin}`);
  console.log(`Expected: ${test.expected}`);

  const decoded = decodePorscheVIN(test.vin);
  const formatted = formatDecodedVIN(decoded);
  const modelDisplay = getModelDisplay(decoded);
  const trim = getTrimFromVIN(decoded);

  console.log(`Valid: ${decoded.valid ? '✅' : '❌'}`);

  if (decoded.valid) {
    console.log(`Decoded:`);
    console.log(`  Year: ${decoded.modelYear}`);
    console.log(`  Manufacturer: ${decoded.manufacturer}`);
    console.log(`  Model: ${decoded.model}`);
    console.log(`  Generation: ${decoded.generation || 'N/A'}`);
    console.log(`  Body Style: ${decoded.bodyStyle || 'N/A'}`);
    console.log(`  Engine/Trim: ${decoded.engineType || 'N/A'}`);
    console.log(`  Plant: ${decoded.plantCode}`);
    console.log(`  Region: ${decoded.region}`);
    console.log(`  Formatted: ${formatted}`);
    console.log(`  Model Display: ${modelDisplay}`);
    console.log(`  Trim: ${trim || 'N/A'}`);
  } else {
    console.log(`Errors: ${decoded.errorMessages?.join(', ') || 'Invalid VIN'}`);
  }

  console.log('-'.repeat(40));
});

// Test specific decoding features
console.log('\n\nDetailed Decoding Test - 911 GT3 RS');
console.log('=' .repeat(80));

const gt3rsVIN = 'WP0AF2A96BS785577';
const gt3rsDecoded = decodePorscheVIN(gt3rsVIN);

console.log(`VIN: ${gt3rsVIN}`);
console.log('\nBreakdown:');
console.log(`  WMI (Pos 1-3): ${gt3rsDecoded.worldManufacturerIdentifier} = ${gt3rsDecoded.manufacturer} (${gt3rsDecoded.region})`);
console.log(`  VDS (Pos 4-8): ${gt3rsVIN.substring(3, 8)}`);
console.log(`    Model Code: ${gt3rsDecoded.modelCode}`);
console.log(`    Body/Engine: ${gt3rsVIN.substring(6, 8)}`);
console.log(`  Check Digit (Pos 9): ${gt3rsDecoded.checkDigit}`);
console.log(`  Model Year (Pos 10): ${gt3rsVIN.charAt(9)} = ${gt3rsDecoded.modelYear}`);
console.log(`  Plant Code (Pos 11): ${gt3rsVIN.charAt(10)} = ${gt3rsDecoded.plantCode}`);
console.log(`  Sequential (Pos 12-17): ${gt3rsDecoded.sequentialNumber}`);

console.log('\n✅ VIN Decoder test complete!');