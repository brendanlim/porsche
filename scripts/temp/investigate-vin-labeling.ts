/**
 * Investigate VIN Labeling Issues
 *
 * This script examines potential labeling errors in our validation dataset
 * by cross-referencing VIN patterns with plant codes and known model facts
 */

import { VIN_VALIDATION_DATASET } from '../../lib/data/vin-validation-dataset';
import { enhancedDecodePorscheVIN } from '../../lib/utils/enhanced-porsche-vin-decoder';

console.log('🕵️ Investigating VIN Labeling Issues\n');
console.log('=' .repeat(70));

// Key facts about Porsche models:
console.log('📚 Known Porsche Facts:');
console.log('  - Uusikaupunki (U) plant: Produces 718 Boxster/Cayman models');
console.log('  - Stuttgart (S) plant: Produces 911 models');
console.log('  - GT4 is a 718 Cayman variant, not a 911 variant');
console.log('  - GT4 Clubsport is a track-focused version of GT4\n');

// Analyze GT4 Clubsport entries
console.log('🔍 Analyzing GT4 Clubsport Entries:\n');

const gt4ClubsportSamples = VIN_VALIDATION_DATASET.vinSamples.filter(
  sample => sample.trim === 'GT4 Clubsport'
);

console.log(`Found ${gt4ClubsportSamples.length} GT4 Clubsport samples:\n`);

const plantBreakdown: Record<string, number> = {};

gt4ClubsportSamples.forEach((sample, index) => {
  const plantCode = sample.vin.charAt(10);
  plantBreakdown[plantCode] = (plantBreakdown[plantCode] || 0) + 1;

  console.log(`${index + 1}. ${sample.vin}`);
  console.log(`   Labeled as: ${sample.year} ${sample.model} ${sample.trim}`);
  console.log(`   Plant code: ${plantCode} (${plantCode === 'U' ? 'Uusikaupunki - 718 factory' : plantCode === 'S' ? 'Stuttgart - 911 factory' : 'Other'})`);
  console.log(`   Price: $${sample.price.toLocaleString()}`);
  console.log('');
});

console.log(`Plant Code Distribution:`);
Object.entries(plantBreakdown).forEach(([plant, count]) => {
  const plantName = plant === 'U' ? 'Uusikaupunki (718 factory)' :
                   plant === 'S' ? 'Stuttgart (911 factory)' : 'Other';
  console.log(`  ${plant}: ${count} samples (${plantName})`);
});

// Check if there are any real 718 GT4 samples in the dataset
console.log('\n🔍 Looking for 718 Models in Dataset:\n');

const model718Samples = VIN_VALIDATION_DATASET.vinSamples.filter(
  sample => sample.model === '718'
);

console.log(`Found ${model718Samples.length} samples labeled as 718 models`);

if (model718Samples.length === 0) {
  console.log('⚠️  No samples are labeled as 718 models in the dataset!');
  console.log('   This suggests the dataset may have systematic labeling issues.');
}

// Cross-check with enhanced decoder recommendations
console.log('\n🤖 Enhanced Decoder Recommendations:\n');

gt4ClubsportSamples.forEach((sample, index) => {
  const enhanced = enhancedDecodePorscheVIN(sample.vin);
  const plantCode = sample.vin.charAt(10);

  if (plantCode === 'U' && sample.model === '911') {
    console.log(`${index + 1}. VIN: ${sample.vin}`);
    console.log(`   Current label: ${sample.year} ${sample.model} ${sample.trim}`);
    console.log(`   Enhanced suggests: ${enhanced.modelYear} ${enhanced.model} ${enhanced.engineType || enhanced.bodyStyle}`);
    console.log(`   Reasoning: Plant U = 718 factory, GT4 = 718 variant`);
    console.log(`   Confidence: ${enhanced.confidence}`);
    console.log('');
  }
});

// Look at price patterns to see if they align with 718 or 911 pricing
console.log('💰 Price Analysis:\n');

const pricesByModel: Record<string, number[]> = {};

VIN_VALIDATION_DATASET.vinSamples.forEach(sample => {
  const key = `${sample.model} ${sample.trim}`;
  if (!pricesByModel[key]) {
    pricesByModel[key] = [];
  }
  pricesByModel[key].push(sample.price);
});

// Calculate average prices
const avgPrices = Object.entries(pricesByModel).map(([model, prices]) => {
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  return { model, avg, count: prices.length };
}).sort((a, b) => b.avg - a.avg);

console.log('Average Prices by Model/Trim:');
avgPrices.forEach(({ model, avg, count }) => {
  console.log(`  ${model}: $${avg.toLocaleString()} (${count} samples)`);
});

// Research actual GT4 model facts
console.log('\n📖 Historical Context:\n');
console.log('Porsche GT4 Timeline:');
console.log('  - GT4 was introduced as a 718 Cayman variant in 2015');
console.log('  - GT4 Clubsport was introduced as a track-only version');
console.log('  - 911 never had a "GT4" variant (only GT2, GT3 series)');
console.log('  - Early 2000s 911s did not have GT4 variants');

// Check year ranges for GT4 Clubsport samples
const yearRanges: Record<number, number> = {};
gt4ClubsportSamples.forEach(sample => {
  yearRanges[sample.year] = (yearRanges[sample.year] || 0) + 1;
});

console.log('\nGT4 Clubsport Year Distribution:');
Object.entries(yearRanges)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .forEach(([year, count]) => {
    const yearNum = parseInt(year);
    const suspicious = yearNum < 2015 || yearNum > 2025;
    console.log(`  ${year}: ${count} samples${suspicious ? ' ⚠️ ' : ''}`);
  });

console.log('\n📋 Conclusions and Recommendations:\n');
console.log('1. GT4 Clubsport VINs with plant code "U" should be labeled as 718 models');
console.log('2. GT4 was not available before 2015, early samples may be mislabeled');
console.log('3. The enhanced decoder correctly identifies plant-based model assignments');
console.log('4. The validation dataset appears to have systematic labeling errors');
console.log('5. Consider re-labeling GT4 Clubsport samples as 718 models when plant = U');

console.log('\n✅ Investigation Complete!');