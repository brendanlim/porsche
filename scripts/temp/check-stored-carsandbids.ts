#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkStoredCarsAndBidsHTML() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking stored Cars & Bids HTML in Supabase');
  console.log('═'.repeat(60));

  // First check what Cars & Bids folders we have
  const { data: folders, error: folderError } = await supabase.storage
    .from('raw-html')
    .list('carsandbids', {
      limit: 100
    });

  if (folderError) {
    console.error('❌ Error listing folders:', folderError);
  } else if (folders && folders.length > 0) {
    console.log('📁 Cars & Bids folders:');
    folders.forEach(f => console.log(`  - ${f.name}`));
  }

  // List stored Cars & Bids detail pages from an older folder with data
  const recentFolder = '20250923'; // Try an older folder

  console.log(`\n📂 Checking folder: carsandbids/${recentFolder}`);

  const { data: files, error } = await supabase.storage
    .from('raw-html')
    .list(`carsandbids/${recentFolder}`, {
      limit: 20,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) {
    console.error('❌ Error listing files:', error);
    return;
  }

  if (!files || files.length === 0) {
    console.log('❌ No Cars & Bids detail pages found in storage');
    return;
  }

  console.log(`📦 Found ${files.length} Cars & Bids detail pages`);

  // Download and analyze the first file
  const firstFile = files[0];
  console.log(`\n📄 Analyzing: ${firstFile.name}`);

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('raw-html')
    .download(`carsandbids/${recentFolder}/${firstFile.name}`);

  if (downloadError) {
    console.error('❌ Error downloading file:', downloadError);
    return;
  }

  // Decompress if needed
  let html: string;
  if (firstFile.name.endsWith('.gz')) {
    const zlib = await import('zlib');
    const buffer = Buffer.from(await fileData.arrayBuffer());
    html = zlib.gunzipSync(buffer).toString();
  } else {
    html = await fileData.text();
  }

  console.log(`📊 HTML size: ${html.length} characters`);

  // Parse with Cheerio
  const $ = cheerio.load(html);

  // Look for VIN in various places
  console.log('\n🔍 Searching for VIN...');

  // Method 1: Look for VIN in text
  const bodyText = $('body').text();
  const vinMatch = bodyText.match(/VIN[:\s]*([A-Z0-9]{17})/i);
  if (vinMatch) {
    console.log(`✅ Found VIN in text: ${vinMatch[1]}`);
    const decoded = decodePorscheVIN(vinMatch[1]);
    console.log(`   Decoded: ${decoded.model} ${decoded.engineType} (${decoded.generation}) - ${decoded.confidence}`);
  }

  // Method 2: Look in quick facts
  const quickFacts = $('.quick-facts, .vehicle-details, .details-list');
  quickFacts.find('dt, .label').each((_, el) => {
    const label = $(el).text().trim().toLowerCase();
    if (label.includes('vin')) {
      const value = $(el).next('dd, .value').text().trim() || $(el).parent().text().replace(label, '').trim();
      console.log(`✅ Found VIN in quick facts: ${value}`);
    }
  });

  // Method 3: Look for Porsche VIN patterns
  const porscheVinPattern = /WP[A-Z0-9]{15}/g;
  const porscheVins = html.match(porscheVinPattern);
  if (porscheVins) {
    console.log(`✅ Found Porsche VIN patterns: ${porscheVins.join(', ')}`);
  }

  // Look for mileage
  console.log('\n📏 Searching for mileage...');
  const mileageMatch = bodyText.match(/([\d,]+)\s*(?:miles?|mi\b)/i);
  if (mileageMatch) {
    console.log(`✅ Found mileage: ${mileageMatch[0]}`);
  }

  // Look for location
  console.log('\n📍 Searching for location...');
  const locationMatch = bodyText.match(/Located in[:\s]*([^,]+),\s*([A-Z]{2})/i);
  if (locationMatch) {
    console.log(`✅ Found location: ${locationMatch[1]}, ${locationMatch[2]}`);
  }

  // Check title and price
  const title = $('h1').first().text().trim();
  console.log(`\n📌 Title: ${title}`);

  const priceText = $('.bid-value, .winning-bid-amount, .sold-for').first().text();
  console.log(`💰 Price: ${priceText}`);

  // Debug: Show relevant HTML snippets
  console.log('\n🔧 Debug - Looking for data containers:');

  // Check various selectors
  const selectors = [
    '.quick-facts',
    '.vehicle-details',
    '.details-list',
    '.auction-details',
    '[class*="detail"]',
    '[class*="spec"]'
  ];

  selectors.forEach(selector => {
    const elements = $(selector);
    if (elements.length > 0) {
      console.log(`  ✅ Found ${elements.length} elements matching: ${selector}`);
      elements.first().find('*').slice(0, 5).each((_, el) => {
        const text = $(el).text().trim().substring(0, 100);
        if (text) console.log(`     - ${text}`);
      });
    }
  });
}

checkStoredCarsAndBidsHTML().catch(console.error);