#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

async function main() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get first Classic HTML
  const { data: cached } = await supabase
    .from('raw_html_cache')
    .select('*')
    .eq('source', 'classic')
    .limit(1)
    .single();

  if (!cached) {
    console.log('No cached HTML found');
    return;
  }

  console.log('📄 Found HTML:', cached.storage_path);
  console.log('   URL:', cached.url);

  // Download HTML
  const { data: blob, error } = await supabase.storage
    .from('raw-html')
    .download(cached.storage_path);

  if (error) {
    console.error('Download error:', error);
    return;
  }

  const html = await blob.text();
  console.log('\n📊 HTML Content:');
  console.log('   Size:', html.length, 'bytes');
  console.log('\n🔍 First 500 chars:');
  console.log(html.substring(0, 500));
  console.log('\n🔍 Checking for key elements:');
  
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  
  // Check for various possible selectors
  const selectors = [
    'a[href*="/vehicles/"]',
    'a[href*="/m/"]',
    'div[data-testid]',
    'div[class*="listing"]',
    'div[class*="vehicle"]',
    'div[class*="car"]',
    'div[class*="result"]',
    '[id="__NEXT_DATA__"]'
  ];
  
  selectors.forEach(sel => {
    const count = $(sel).length;
    if (count > 0) {
      console.log(`   ${sel}: ${count} found`);
      if (count <= 3) {
        $(sel).each((i, el) => {
          const href = $(el).attr('href');
          if (href) {
            console.log(`      -> ${href}`);
          }
        });
      }
    }
  });

  // Check for Next.js data
  const nextData = $('#__NEXT_DATA__').text();
  if (nextData) {
    console.log('\n📦 Found Next.js data (length:', nextData.length, ')');
    try {
      const parsed = JSON.parse(nextData);
      console.log('   Props keys:', Object.keys(parsed.props || {}).join(', '));
      if (parsed.props?.pageProps) {
        console.log('   PageProps keys:', Object.keys(parsed.props.pageProps).join(', '));
      }
    } catch (e) {
      console.log('   Could not parse Next.js data');
    }
  }

  // Look for any links that might be listings
  console.log('\n🔗 All links with /m/ or /vehicles/:');
  $('a[href*="/m/"], a[href*="/vehicles/"]').each((i, el) => {
    if (i < 10) {
      const href = $(el).attr('href');
      const text = $(el).text().trim().substring(0, 50);
      console.log(`   ${href} -> "${text}"`);
    }
  });

  // Check if page is complete
  console.log('\n📏 HTML completeness check:');
  console.log('   Has </html>:', html.includes('</html>'));
  console.log('   Has </body>:', html.includes('</body>'));
  console.log('   Last 200 chars:');
  console.log(html.substring(html.length - 200));
}

main().catch(console.error);