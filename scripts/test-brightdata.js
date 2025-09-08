#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testBrightData() {
  const customerId = process.env.BRIGHT_DATA_CUSTOMER_ID;
  const password = process.env.BRIGHT_DATA_PASSWORD;
  const zone = process.env.BRIGHT_DATA_ZONE;
  
  console.log('Testing Bright Data with credentials:');
  console.log('Customer ID:', customerId);
  console.log('Zone:', zone);
  console.log('Password:', password ? '***' : 'NOT SET');
  
  // Test URL
  const testUrl = 'https://www.example.com';
  
  // Try different username formats
  const usernameFormats = [
    `${customerId}-zone-unlocker`,
    `${customerId}`,
    `${customerId}-zone-pt_unlocker_z1`,
    `${customerId}-zone-pt_unlocker`,
  ];
  
  for (const username of usernameFormats) {
    console.log(`\nTrying username format: ${username}`);
    
    try {
      const response = await axios.get(testUrl, {
        proxy: {
          host: 'brd.superproxy.io',
          port: 22225,
          auth: {
            username: username,
            password: password,
          },
          protocol: 'http',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      });
      
      console.log('✅ SUCCESS with username:', username);
      console.log('Response length:', response.data.length);
      console.log('Contains "Example Domain":', response.data.includes('Example Domain'));
      break;
    } catch (error) {
      console.log('❌ Failed:', error.response?.status, error.response?.statusText || error.message);
    }
  }
}

testBrightData().catch(console.error);