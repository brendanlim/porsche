#!/usr/bin/env npx tsx

import { decodePorscheVIN, formatDecodedVIN, getModelDisplay, getTrimFromVIN } from '../../lib/utils/porsche-vin-decoder';

// Test GT4 VINs provided by user
const testVINs = [
  'WP0AC2A87NS275453',
  'WP0AC2A87MS289318'
];

console.log('Testing GT4 VIN Decoder\n');

for (const vin of testVINs) {
  console.log(`Testing VIN: ${vin}`);
  console.log('='.repeat(50));

  const decoded = decodePorscheVIN(vin);

  console.log('Raw decoded data:');
  console.log(JSON.stringify(decoded, null, 2));

  console.log('\nFormatted display:');
  console.log('- Full: ' + formatDecodedVIN(decoded));
  console.log('- Model: ' + getModelDisplay(decoded));
  console.log('- Trim: ' + getTrimFromVIN(decoded));

  console.log('\n' + '='.repeat(50) + '\n');
}