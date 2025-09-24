import { decodePorscheVIN } from '@/lib/utils/porsche-vin-decoder';

// Since we can't access the database directly, let's analyze what a $17,750 GT4 could be
// based on typical VIN patterns

console.log('Analyzing what a $17,750 "GT4" could actually be...\n');

// Common VIN patterns for actual GT4s vs base Caymans
const exampleVINs = {
  // Real GT4 examples
  'Real 981 GT4': 'WP0AC2A88GK190123',  // 2016 981 GT4
  'Real 982 GT4': 'WP0AC2A85LS290123',  // 2020 718 GT4

  // Base Cayman examples that might be mislabeled
  'Base 987 Cayman': 'WP0AB2A86GU720123',  // 2016 base Cayman (987)
  'Base 981 Cayman': 'WP0AB2A87FK620123',  // 2015 base Cayman (981)
  'Base 718 Cayman': 'WP0AA2A84HK620123',  // 2017 base 718 Cayman
};

console.log('Decoding example VINs to understand patterns:\n');

for (const [description, vin] of Object.entries(exampleVINs)) {
  console.log(`${description}:`);
  console.log(`VIN: ${vin}`);

  try {
    const decoded = decodePorscheVIN(vin);
    if (decoded.valid) {
      console.log(`  Model: ${decoded.model}`);
      console.log(`  Year: ${decoded.modelYear}`);
      console.log(`  Body Style: ${decoded.bodyStyle || 'Unknown'}`);
      console.log(`  Engine: ${decoded.engineType || 'Unknown'}`);
      console.log(`  Generation: ${decoded.generation || 'Unknown'}`);
    } else {
      console.log(`  Invalid VIN: ${decoded.errorMessages?.join(', ')}`);
    }
  } catch (error) {
    console.log(`  Error decoding: ${error}`);
  }
  console.log();
}

console.log('\nBased on price analysis:');
console.log('A $17,750 Porsche is likely:');
console.log('- A 2006-2009 987 Cayman base (these sell for $15k-25k)');
console.log('- A high-mileage 2009-2012 987.2 Cayman base');
console.log('- NOT a GT4 (GT4s start at $75k+ even with high miles)');
console.log();
console.log('The VIN would reveal:');
console.log('- Position 4-6: Model code (AC2 = GT4, AB2/AA2 = base Cayman)');
console.log('- Position 7-8: Engine code (GT4 has specific high-performance codes)');
console.log('- Position 10: Model year (G=2016 for 981 GT4, etc.)');

// Show what to look for in the database
console.log('\nTo find the mislabeled listing in the database:');
console.log(`
SELECT
  id,
  title,
  model,
  trim,
  year,
  price,
  vin,
  source_url
FROM listings
WHERE
  trim ILIKE '%gt4%'
  AND price < 50000
ORDER BY price ASC;
`);

console.log('\nOnce we have the VIN, we can decode it to determine the actual model/trim.');

process.exit(0);