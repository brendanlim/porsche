#!/usr/bin/env npx tsx

// Test VINs
const vins = [
  'WP0AC29968S792132',  // 997 GT3 RS
  'WP0AC2A97BS783085'   // 997 GT3 RS
];

vins.forEach(vin => {
  console.log(`\nVIN: ${vin}`);
  console.log('─'.repeat(40));

  // Extract key positions
  const pos456 = vin.substring(3, 6);
  const pos78 = vin.substring(6, 8);
  const pos4 = vin[3];
  const pos5 = vin[4];
  const pos6 = vin[5];
  const pos7 = vin[6];
  const pos8 = vin[7];

  console.log(`Position 4-6: ${pos456}`);
  console.log(`Position 7-8: ${pos78}`);
  console.log(`Position 4: ${pos4}`);
  console.log(`Position 5: ${pos5}`);
  console.log(`Position 6: ${pos6}`);
  console.log(`Position 7: ${pos7}`);
  console.log(`Position 8: ${pos8}`);

  // Check the condition
  if (pos456 === 'AC2' && (pos78 === '99' || pos78 === 'A9')) {
    console.log('✅ Matches GT3 RS pattern!');
  } else {
    console.log('❌ Does not match GT3 RS pattern');
    console.log(`  pos456 === 'AC2': ${pos456 === 'AC2'}`);
    console.log(`  pos78 === '99' or 'A9': ${pos78 === '99' || pos78 === 'A9'}`);
  }
});