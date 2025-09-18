#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { normalizeOptions } from '../lib/services/options-normalizer';
import { normalizeModelTrim } from '../lib/services/model-trim-normalizer';

dotenv.config({ path: '.env.local' });

async function testOpenAI() {
  console.log('Testing OpenAI integration...\n');
  
  // Test 1: Options normalization
  console.log('1. Testing options normalization:');
  const testOptions = "Limited-Slip Differential; Paint-To-Sample Mint Green Paint; Carbon-Fiber Roof; Black Leather & Race-Tex Upholstery; 20\" & 21\" Center-Lock Wheels; Porsche Ceramic Composite Brakes";
  console.log('   Input:', testOptions);
  
  try {
    const normalizedOptions = await normalizeOptions(testOptions);
    console.log('   Output:', normalizedOptions);
    console.log('   ✅ Options normalization successful!\n');
  } catch (error: any) {
    console.error('   ❌ Options normalization failed:', error.message, '\n');
  }
  
  // Test 2: Model/Trim normalization
  console.log('2. Testing model/trim normalization:');
  const testTitles = [
    "2023 Porsche 911 GT3 RS with 1,500 Miles",
    "2022 Porsche 718 Cayman GT4 RS",
    "2021 Porsche 911 Turbo S Cabriolet"
  ];
  
  for (const title of testTitles) {
    console.log(`   Input: "${title}"`);
    try {
      const result = await normalizeModelTrim(title);
      console.log(`   Output:`, result);
    } catch (error: any) {
      console.error(`   ❌ Failed:`, error.message);
    }
  }
  
  console.log('\n✅ All tests completed!');
}

testOpenAI().catch(console.error);