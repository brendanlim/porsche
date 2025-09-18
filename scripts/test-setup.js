#!/usr/bin/env node

/**
 * Test script to verify all services are configured correctly
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  RESET: '\x1b[0m'
};

async function testSupabase() {
  console.log('\n📊 Testing Supabase Connection...');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test database connection
    const { data, error } = await supabase
      .from('manufacturers')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "manufacturers" does not exist')) {
        console.log(`${COLORS.YELLOW}⚠️  Tables not created yet. Please run the migration SQL.${COLORS.RESET}`);
        return false;
      }
      throw error;
    }

    console.log(`${COLORS.GREEN}✅ Supabase connected successfully!${COLORS.RESET}`);
    if (data && data.length > 0) {
      console.log(`${COLORS.GREEN}✅ Database has seed data!${COLORS.RESET}`);
    } else {
      console.log(`${COLORS.YELLOW}⚠️  No data found. Run the seed SQL to populate initial data.${COLORS.RESET}`);
    }
    return true;
  } catch (error) {
    console.log(`${COLORS.RED}❌ Supabase connection failed: ${error.message}${COLORS.RESET}`);
    return false;
  }
}

async function testGemini() {
  console.log('\n🤖 Testing Gemini API...');
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent('Say "API Working" in exactly 2 words');
    const response = result.response.text();
    
    console.log(`${COLORS.GREEN}✅ Gemini API connected successfully!${COLORS.RESET}`);
    console.log(`   Response: ${response.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.log(`${COLORS.RED}❌ Gemini API failed: ${error.message}${COLORS.RESET}`);
    return false;
  }
}

async function checkEnvVars() {
  console.log('\n🔑 Checking Environment Variables...');
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY'
  ];
  
  const optional = [
    'STRIPE_SECRET_KEY',
    'SCRAPER_API_KEY',
    'BRIGHT_DATA_CUSTOMER_ID'
  ];
  
  let allRequired = true;
  
  console.log('\nRequired:');
  for (const key of required) {
    if (process.env[key]) {
      console.log(`  ${COLORS.GREEN}✅ ${key}${COLORS.RESET}`);
    } else {
      console.log(`  ${COLORS.RED}❌ ${key} (missing)${COLORS.RESET}`);
      allRequired = false;
    }
  }
  
  console.log('\nOptional:');
  for (const key of optional) {
    if (process.env[key]) {
      console.log(`  ${COLORS.GREEN}✅ ${key}${COLORS.RESET}`);
    } else {
      console.log(`  ${COLORS.YELLOW}⚠️  ${key} (not configured)${COLORS.RESET}`);
    }
  }
  
  return allRequired;
}

async function generateScraperKey() {
  if (!process.env.SCRAPER_API_KEY) {
    const crypto = require('crypto');
    const key = crypto.randomBytes(32).toString('hex');
    console.log(`\n🔐 Generated Scraper API Key: ${COLORS.YELLOW}${key}${COLORS.RESET}`);
    console.log('   Add this to your .env.local as SCRAPER_API_KEY');
    return key;
  }
  return process.env.SCRAPER_API_KEY;
}

async function main() {
  console.log('========================================');
  console.log('   PorscheStats Setup Verification');
  console.log('========================================');
  
  const envOk = await checkEnvVars();
  const supabaseOk = await testSupabase();
  const geminiOk = await testGemini();
  const scraperKey = await generateScraperKey();
  
  console.log('\n========================================');
  console.log('            Summary');
  console.log('========================================');
  
  if (envOk && supabaseOk && geminiOk) {
    console.log(`${COLORS.GREEN}✅ All systems operational!${COLORS.RESET}`);
    console.log('\n📝 Next steps:');
    console.log('1. Visit http://localhost:3000 to see the app');
    console.log('2. Create an account at /signup');
    console.log('3. Try the VIN lookup at /vin');
    
    if (scraperKey) {
      console.log('\n🔧 To test the scraper:');
      console.log(`curl -X POST http://localhost:3000/api/scrape \\
  -H "Authorization: Bearer ${scraperKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"source": "bat", "maxPages": 1}'`);
    }
  } else {
    console.log(`${COLORS.YELLOW}⚠️  Some services need configuration${COLORS.RESET}`);
    
    if (!supabaseOk) {
      console.log('\n📋 Supabase Setup:');
      console.log('1. Go to your Supabase SQL Editor');
      console.log('2. Run /supabase/migrations/001_initial_schema.sql');
      console.log('3. Run /supabase/seed.sql');
    }
  }
  
  console.log('\n========================================\n');
}

main().catch(console.error);