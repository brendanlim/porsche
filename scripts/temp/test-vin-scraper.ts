#!/usr/bin/env npx tsx

// Test the VIN decoder integration in scraper

import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';

// Test VINs from different models
const testVins = [
  { vin: 'WP0AF2A97BS785667', expected: '2011 911 GT3 RS (997.2)' },
  { vin: 'WP0AC2A8XGK123456', expected: '2016 718 Cayman GT4 (981)' },
  { vin: 'WP0AE2A8XNU123456', expected: '2022 718 Cayman GT4 RS (982)' },
  { vin: 'WP0CB2A8AAS740067', expected: '2010 Boxster S (987.2)' },
  { vin: 'WP0AA29981S686595', expected: '2001 911 Carrera (996.1)' },
];

console.log('🔧 Testing VIN Decoder for Scraper Integration\n');

testVins.forEach(test => {
  const decoded = decodePorscheVIN(test.vin);

  console.log(`VIN: ${test.vin}`);
  console.log(`Expected: ${test.expected}`);

  if (decoded.valid && decoded.confidence === 'high') {
    console.log(`✅ HIGH confidence decode:`);
    console.log(`   Year: ${decoded.modelYear}`);
    console.log(`   Model: ${decoded.model}`);
    console.log(`   Trim: ${decoded.engineType || 'Base'}`);
    console.log(`   Generation: ${decoded.generation}`);
  } else if (decoded.valid) {
    console.log(`⚠️  ${decoded.confidence?.toUpperCase()} confidence decode:`);
    console.log(`   Year: ${decoded.modelYear}`);
    console.log(`   Model: ${decoded.model || 'Unknown'}`);
    console.log(`   Trim: ${decoded.engineType || 'Unknown'}`);
    console.log(`   Generation: ${decoded.generation || 'Unknown'}`);
  } else {
    console.log(`❌ Invalid VIN`);
  }

  console.log('---');
});

// Test a listing object like the scraper would have
console.log('\n📋 Simulating scraper listing processing:\n');

const mockListing = {
  vin: 'WP0AC2A8XGK123456',
  title: '2016 Porsche Cayman GT4',
  model: null,
  year: null,
  trim: null,
  generation: null
};

console.log('Before VIN decode:', mockListing);

const decoded = decodePorscheVIN(mockListing.vin!);

if (decoded.valid && decoded.confidence === 'high') {
  mockListing.year = decoded.modelYear;
  mockListing.model = decoded.model;
  mockListing.trim = decoded.engineType || null;
  mockListing.generation = decoded.generation || null;
}

console.log('After VIN decode:', mockListing);
console.log('\n✨ Scraper would use VIN-decoded values with high confidence!');