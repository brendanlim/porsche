import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGeminiQuota() {
  console.log('Testing Gemini API quota...\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set');
    return;
  }
  
  console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`);
  console.log(`Key format: ${apiKey.startsWith('AIzaSy') ? 'Google Cloud' : 'Unknown'}\n`);
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Test with different models
  const models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
  
  for (const modelName of models) {
    console.log(`Testing model: ${modelName}`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "hello" in one word');
      const response = await result.response;
      console.log(`✅ ${modelName} works! Response: ${response.text().substring(0, 50)}`);
    } catch (error: any) {
      if (error.status === 429) {
        console.log(`❌ ${modelName} - Quota exceeded`);
        console.log(`   Error: ${error.message.substring(0, 200)}`);
        
        // Check if it mentions free tier
        if (error.message.includes('free_tier')) {
          console.log('   ⚠️  API is using FREE TIER quotas despite billing enabled!');
        }
      } else if (error.status === 404) {
        console.log(`❌ ${modelName} - Model not found`);
      } else {
        console.log(`❌ ${modelName} - Error: ${error.message.substring(0, 100)}`);
      }
    }
    console.log('');
  }
  
  console.log('\n📝 Summary:');
  console.log('============');
  console.log('If you\'re seeing "free_tier" errors with billing enabled, this is because:');
  console.log('1. The Generative Language API has separate quotas from Vertex AI');
  console.log('2. Even with Google Cloud billing, the API defaults to free tier limits');
  console.log('\nSolutions:');
  console.log('1. Use Vertex AI instead (different API)');
  console.log('2. Request quota increase at:');
  console.log('   https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas');
  console.log('3. Use the fallback parsing (already implemented)');
}

testGeminiQuota().catch(console.error);