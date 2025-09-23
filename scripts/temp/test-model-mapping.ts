import { getModelSlug, isCleanModelName, getAllCleanModels } from '../../lib/utils/model-slug-mapper';

console.log('Testing Model Slug Mapper');
console.log('========================\n');

// Test clean model validation
console.log('1. Testing clean model name validation:');
console.log('   isCleanModelName("911"):', isCleanModelName('911'));
console.log('   isCleanModelName("cayman"):', isCleanModelName('cayman'));
console.log('   isCleanModelName("boxster"):', isCleanModelName('boxster'));
console.log('   isCleanModelName("718-cayman"):', isCleanModelName('718-cayman'), '(should be false)');
console.log('   isCleanModelName("cayenne"):', isCleanModelName('cayenne'), '(should be false)');

// Test model slug mapping for BaT
console.log('\n2. Testing BaT slug mapping:');
console.log('   911 → ', getModelSlug('911', 'bat'));
console.log('   cayman → ', getModelSlug('cayman', 'bat'));
console.log('   boxster → ', getModelSlug('boxster', 'bat'));

// Test all sources
console.log('\n3. Testing all sources for "cayman":');
const sources = ['bat', 'classic.com', 'cars.com', 'edmunds', 'carsandbids', 'autotrader', 'cargurus'] as const;
sources.forEach(source => {
  try {
    const slug = getModelSlug('cayman', source);
    console.log(`   ${source}: ${slug}`);
  } catch (error: any) {
    console.log(`   ${source}: ERROR - ${error.message}`);
  }
});

// Test how BaT scraper would use it
console.log('\n4. Simulating BaT scraper usage:');
const testModel = 'cayman';
if (isCleanModelName(testModel)) {
  const batSlug = getModelSlug(testModel, 'bat');
  const cleanSlug = batSlug.replace('porsche-', '');
  console.log(`   Input: "${testModel}"`);
  console.log(`   BaT slug: "${batSlug}"`);
  console.log(`   Cleaned for comparison: "${cleanSlug}"`);
  console.log(`   Would match BAT_MODELS with slug: "${cleanSlug}"`);
}

console.log('\n✅ All tests completed');