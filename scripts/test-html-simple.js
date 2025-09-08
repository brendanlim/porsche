#!/usr/bin/env node

/**
 * Simple HTML testing tool - Work with stored HTML
 */

require('dotenv').config({ path: '.env.local' });

async function main() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const args = process.argv.slice(2);
  const command = args[0];
  const source = args[1] || 'classic';
  
  console.log('🔍 Checking stored HTML for:', source);
  console.log('========================================\n');

  // Get recent stored HTML
  const { data, error } = await supabase
    .from('raw_html_cache')
    .select('*')
    .eq('source', source)
    .order('scraped_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No stored HTML found for', source);
    console.log('💡 Run a scraper first to store some HTML');
    console.log('\nExample:');
    console.log(`curl -X POST http://localhost:3000/api/scrape \\`);
    console.log(`  -H "Authorization: Bearer ${process.env.SCRAPER_API_KEY}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"source": "${source}", "maxPages": 1}'`);
    return;
  }

  console.log(`✅ Found ${data.length} stored HTML files:\n`);
  
  data.forEach((item, i) => {
    console.log(`${i + 1}. ${item.storage_path}`);
    console.log(`   URL: ${item.url}`);
    console.log(`   Size: ${(item.file_size / 1024).toFixed(1)} KB`);
    console.log(`   Scraped: ${new Date(item.scraped_at).toLocaleString()}`);
    console.log('');
  });

  // Download and analyze first file
  if (command === 'analyze' && data.length > 0) {
    console.log('📊 Analyzing first HTML file...');
    console.log('----------------------------------------');
    
    const first = data[0];
    const { data: blob, error: downloadError } = await supabase.storage
      .from('raw-html')
      .download(first.storage_path);

    if (downloadError) {
      console.error('❌ Download error:', downloadError.message);
      return;
    }

    const html = await blob.text();
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    
    console.log('📄 HTML Analysis:');
    console.log(`   Title: ${$('title').text()}`);
    console.log(`   HTML size: ${(html.length / 1024).toFixed(1)} KB`);
    console.log('');

    // Find common patterns
    const patterns = {
      'Links with /vehicles/': $('a[href*="/vehicles/"]').length,
      'Links with /listing/': $('a[href*="/listing/"]').length,
      'Links with /auctions/': $('a[href*="/auctions/"]').length,
      'Links with /cars/': $('a[href*="/cars/"]').length,
      'Price patterns ($)': $('*:contains("$")').filter((i, el) => $(el).text().match(/\$[\d,]+/)).length,
      'Data-qa attributes': $('[data-qa]').length,
      'Data-test attributes': $('[data-test]').length,
    };

    console.log('🔍 Pattern Analysis:');
    Object.entries(patterns).forEach(([key, count]) => {
      if (count > 0) {
        console.log(`   ${key}: ${count}`);
      }
    });

    // Find potential listing containers
    const containers = [
      '.listing-card', '.vehicle-card', '.car-card', '.auction-card',
      '.result-item', '.inventory-item', '[data-qa*="listing"]',
      'article', '.item'
    ];

    console.log('\n📦 Potential Listing Containers:');
    containers.forEach(selector => {
      const count = $(selector).length;
      if (count > 0) {
        console.log(`   ${selector}: ${count} found`);
      }
    });
  }
}

main().catch(console.error);