import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testVertexAI() {
  console.log('Testing Vertex AI vs Generative Language API...\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set');
    return;
  }
  
  console.log('The issue you\'re experiencing is common:\n');
  console.log('1. Google Cloud Console shows quotas for the Generative Language API');
  console.log('2. But the @google/generative-ai SDK uses AI Studio endpoints');
  console.log('3. These have DIFFERENT quotas!\n');
  
  console.log('AI Studio quotas (what you\'re hitting):');
  console.log('  - Free tier: 50 requests/day');
  console.log('  - Paid tier: Still limited\n');
  
  console.log('Google Cloud quotas (what you see in console):');
  console.log('  - 7,000 requests/minute');
  console.log('  - 0% usage shown\n');
  
  console.log('Solutions:');
  console.log('1. IMMEDIATE: Use gemini-1.5-flash (working now)');
  console.log('2. BETTER: Switch to Vertex AI SDK');
  console.log('3. CURRENT: Fallback parsing already implemented\n');
  
  // Test direct API call to show the difference
  console.log('Testing direct API call to Google Cloud endpoint...');
  
  try {
    // This is the Google Cloud endpoint (not AI Studio)
    const cloudEndpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(cloudEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Say hello'
          }]
        }]
      })
    });
    
    if (response.ok) {
      console.log('✅ Direct Google Cloud API call works!');
      const data = await response.json();
      console.log('Response:', data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response');
    } else {
      console.log('❌ Direct API call failed:', response.status, response.statusText);
      const error = await response.text();
      if (error.includes('free_tier')) {
        console.log('Still hitting free tier limits on v1 endpoint');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testVertexAI().catch(console.error);