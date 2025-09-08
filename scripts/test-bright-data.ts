import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { BrightDataClient } from '../lib/scrapers/bright-data';

async function test() {
  const client = new BrightDataClient();
  console.log('Testing Bright Data connection with CA certificate...\n');
  
  // Test with example.com first
  try {
    console.log('Test 1: Fetching example.com...');
    const html = await client.fetch('https://www.example.com');
    const success = html.includes('Example Domain');
    console.log('Result:', success ? '✓ SUCCESS' : '✗ FAILED');
    
    if (success) {
      console.log('\nTest 2: Fetching geo test URL...');
      const geoHtml = await client.fetch('https://geo.brdtest.com/welcome.txt');
      console.log('Geo test response:', geoHtml.substring(0, 200));
    }
  } catch (error: any) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

test().catch(console.error);