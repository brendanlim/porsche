import { isStandardEquipment, filterOutStandardEquipment, getStandardEquipment } from '../../lib/config/standard-equipment';

console.log('Testing Extended Standard Equipment - GTS and T Models');
console.log('═'.repeat(70));

// Test Case 1: 997 Carrera GTS - Manual should be standard
console.log('\n✅ Test 1: 997 Carrera GTS - Manual and Sport Chrono');
const is997GTSManual = isStandardEquipment('Manual', '911', 'Carrera GTS', '997', 2011);
const is997GTSSportChrono = isStandardEquipment('Sport Chrono', '911', 'Carrera GTS', '997', 2011);
console.log('   Is Manual standard on 997 GTS?', is997GTSManual ? '✅ YES' : '❌ NO');
console.log('   Is Sport Chrono standard on 997 GTS?', is997GTSSportChrono ? '✅ YES' : '❌ NO');

// Test Case 2: 991.2 Carrera T - Manual only
console.log('\n✅ Test 2: 991.2 Carrera T - Manual Only');
const is991_2TManual = isStandardEquipment('Manual', '911', 'Carrera T', '991.2', 2018);
const is991_2TPDK = isStandardEquipment('PDK', '911', 'Carrera T', '991.2', 2018);
console.log('   Is Manual standard on 991.2 T?', is991_2TManual ? '✅ YES' : '❌ NO');
console.log('   Is PDK standard on 991.2 T?', is991_2TPDK ? '❌ NO (correct)' : '✅ YES (wrong)');

// Test Case 3: 718 GTS 4.0 - Sport Chrono and PASM standard
console.log('\n✅ Test 3: 718 Cayman GTS 4.0 - Performance Package');
const isGTS40SportChrono = isStandardEquipment('Sport Chrono Package', '718 Cayman', 'GTS 4.0', '982', 2020);
const isGTS40PASM = isStandardEquipment('PASM', '718 Cayman', 'GTS 4.0', '982', 2020);
const isGTS40PTV = isStandardEquipment('PTV', '718 Cayman', 'GTS 4.0', '982', 2020);
console.log('   Is Sport Chrono standard on GTS 4.0?', isGTS40SportChrono ? '✅ YES' : '❌ NO');
console.log('   Is PASM standard on GTS 4.0?', isGTS40PASM ? '✅ YES' : '❌ NO');
console.log('   Is PTV standard on GTS 4.0?', isGTS40PTV ? '✅ YES' : '❌ NO');

// Test Case 4: 992.2 Carrera GTS - T-Hybrid system
console.log('\n✅ Test 4: 992.2 Carrera GTS - T-Hybrid');
const is992_2GTSPDK = isStandardEquipment('PDK', '911', 'Carrera GTS', '992.2', 2024);
const is992_2GTSHybrid = isStandardEquipment('T-Hybrid System', '911', 'Carrera GTS', '992.2', 2024);
console.log('   Is PDK standard on 992.2 GTS?', is992_2GTSPDK ? '✅ YES' : '❌ NO');
console.log('   Is T-Hybrid standard on 992.2 GTS?', is992_2GTSHybrid ? '✅ YES' : '❌ NO');

// Test Case 5: 718 Cayman T - Basic equipment
console.log('\n✅ Test 5: 718 Cayman T - Minimalist Setup');
const isCaymanTManual = isStandardEquipment('Manual', '718 Cayman', 'T', '982', 2020);
const isCaymanTSportChrono = isStandardEquipment('Sport Chrono', '718 Cayman', 'T', '982', 2020);
console.log('   Is Manual standard on Cayman T?', isCaymanTManual ? '✅ YES' : '❌ NO');
console.log('   Is Sport Chrono standard on Cayman T?', isCaymanTSportChrono ? '❌ NO (correct)' : '✅ YES (wrong)');

// Test Case 6: Filtering GTS options
console.log('\n✅ Test 6: Filtering Options for 991 Carrera GTS');
const optionsGTS991 = [
  'Manual',
  '7-Speed Manual',
  'Sport Chrono Package',
  'PASM',
  'PCCB',
  'Sport Exhaust',
  'Navigation',
  'Bose Audio',
  'Paint to Sample'
];
const filteredGTS991 = filterOutStandardEquipment(optionsGTS991, '911', 'Carrera GTS', '991', 2015);
console.log('   Original options:', optionsGTS991.length);
console.log('   After filtering standard:', filteredGTS991.length);
console.log('   Remaining options:', filteredGTS991);

// Test Case 7: Get all standard equipment for GTS 4.0
console.log('\n✅ Test 7: All Standard Equipment for 718 GTS 4.0');
const standardGTS40 = getStandardEquipment('718 Cayman', 'GTS 4.0', '982', 2020);
console.log('   Standard equipment count:', standardGTS40.length);
console.log('   Includes LSD?', standardGTS40.includes('LSD') ? '✅ YES' : '❌ NO');
console.log('   Includes Alcantara?', standardGTS40.includes('Alcantara Trim') ? '✅ YES' : '❌ NO');

// Test Case 8: Evolution of GTS transmission standards
console.log('\n✅ Test 8: GTS Transmission Evolution');
const is997GTSManualStd = isStandardEquipment('Manual', '911', 'Carrera GTS', '997', 2011);
const is991GTSManualStd = isStandardEquipment('Manual', '911', 'Carrera GTS', '991', 2015);
const is992_1GTSPDKStd = isStandardEquipment('PDK', '911', 'Carrera GTS', '992.1', 2021);
console.log('   997 GTS Manual standard?', is997GTSManualStd ? '✅ YES' : '❌ NO');
console.log('   991 GTS Manual standard?', is991GTSManualStd ? '✅ YES' : '❌ NO');
console.log('   992.1 GTS PDK standard?', is992_1GTSPDKStd ? '✅ YES (evolution)' : '❌ NO');

console.log('\n' + '═'.repeat(70));
console.log('Extended testing complete!');