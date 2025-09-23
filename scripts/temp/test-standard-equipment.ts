import { isStandardEquipment, filterOutStandardEquipment, getStandardEquipment } from '../../lib/config/standard-equipment';

console.log('Testing Standard Equipment Configuration');
console.log('═'.repeat(70));

// Test Case 1: 996 GT3 - Manual should be standard
console.log('\n✅ Test 1: 996 GT3 - Manual Transmission');
const is996GT3Manual = isStandardEquipment('Manual', '911', 'GT3', '996');
console.log('   Is Manual standard on 996 GT3?', is996GT3Manual ? '✅ YES (correct)' : '❌ NO (wrong)');

// Test Case 2: 991.1 GT3 - PDK should be standard (only option)
console.log('\n✅ Test 2: 991.1 GT3 - PDK Only');
const is991_1GT3PDK = isStandardEquipment('PDK', '911', 'GT3', '991.1');
const is991_1GT3Manual = isStandardEquipment('Manual', '911', 'GT3', '991.1');
console.log('   Is PDK standard on 991.1 GT3?', is991_1GT3PDK ? '✅ YES (correct)' : '❌ NO (wrong)');
console.log('   Is Manual standard on 991.1 GT3?', is991_1GT3Manual ? '❌ NO (correct)' : '✅ YES (wrong)');

// Test Case 3: 718 GT4 RS - PDK only
console.log('\n✅ Test 3: 718 Cayman GT4 RS - PDK Only');
const isGT4RSPDK = isStandardEquipment('PDK', '718 Cayman', 'GT4 RS', '982');
const isGT4RSManual = isStandardEquipment('Manual', '718 Cayman', 'GT4 RS', '982');
console.log('   Is PDK standard on GT4 RS?', isGT4RSPDK ? '✅ YES (correct)' : '❌ NO (wrong)');
console.log('   Is Manual standard on GT4 RS?', isGT4RSManual ? '❌ NO (correct)' : '✅ YES (wrong)');

// Test Case 4: 992 GT3 - PCCB is now standard
console.log('\n✅ Test 4: 992 GT3 - PCCB Standard for First Time');
const is992GT3PCCB = isStandardEquipment('PCCB', '911', 'GT3', '992');
const is991GT3PCCB = isStandardEquipment('PCCB', '911', 'GT3', '991.2');
console.log('   Is PCCB standard on 992 GT3?', is992GT3PCCB ? '✅ YES (correct)' : '❌ NO (wrong)');
console.log('   Is PCCB standard on 991.2 GT3?', is991GT3PCCB ? '❌ NO (correct)' : '✅ YES (wrong)');

// Test Case 5: Filtering options for a specific car
console.log('\n✅ Test 5: Filtering Options for 996 GT3');
const options996GT3 = [
  'Manual',
  '6-Speed Manual',
  'PCCB',
  'Sport Chrono',
  'Navigation',
  'Clubsport Package'
];
const filtered996GT3 = filterOutStandardEquipment(options996GT3, '911', 'GT3', '996');
console.log('   Original options:', options996GT3);
console.log('   After filtering standard:', filtered996GT3);
console.log('   Manual removed?', !filtered996GT3.includes('Manual') ? '✅ YES' : '❌ NO');
console.log('   PCCB kept?', filtered996GT3.includes('PCCB') ? '✅ YES' : '❌ NO');

// Test Case 6: Get all standard equipment
console.log('\n✅ Test 6: Get All Standard Equipment for 992 GT3');
const standard992GT3 = getStandardEquipment('911', 'GT3', '992');
console.log('   Standard equipment count:', standard992GT3.length);
console.log('   Includes PCCB?', standard992GT3.includes('PCCB') ? '✅ YES' : '❌ NO');
console.log('   Includes Sport Chrono?', standard992GT3.includes('Sport Chrono') ? '✅ YES' : '❌ NO');
console.log('   First 5 items:', standard992GT3.slice(0, 5));

// Test Case 7: Turbo S with standard PCCB
console.log('\n✅ Test 7: 991/992 Turbo S - PCCB Standard');
const is991TurboSPCCB = isStandardEquipment('PCCB', '911', 'Turbo S', '991');
const is992TurboSPCCB = isStandardEquipment('PCCB', '911', 'Turbo S', '992');
console.log('   Is PCCB standard on 991 Turbo S?', is991TurboSPCCB ? '✅ YES (correct)' : '❌ NO (wrong)');
console.log('   Is PCCB standard on 992 Turbo S?', is992TurboSPCCB ? '✅ YES (correct)' : '❌ NO (wrong)');

console.log('\n' + '═'.repeat(70));
console.log('Testing complete!');