import * as cheerio from 'cheerio';

async function testCarsAndBidsOptions() {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) {
    throw new Error('SCRAPINGBEE_API_KEY required');
  }

  const url = 'https://carsandbids.com/auctions/rjjO65ko/2001-porsche-911-carrera-4-coupe';

  const params: any = {
    api_key: apiKey,
    url: url,
    render_js: 'true',
    premium_proxy: 'true',
    country_code: 'us',
    wait: '10000',
    wait_for: 'dt',
    json_response: 'true',
    block_resources: 'false'
  };

  const urlParams = new URLSearchParams(params);
  const response = await fetch(`https://app.scrapingbee.com/api/v1?${urlParams.toString()}`);

  if (!response.ok) {
    throw new Error(`ScrapingBee error: ${await response.text()}`);
  }

  const data = await response.json();
  const $ = cheerio.load(data.body);

  console.log('\n=== COLORS ===');
  $('dt').each((_, el) => {
    const label = $(el).text().trim().toLowerCase();
    const value = $(el).next('dd').text().trim();

    if (label.includes('color')) {
      console.log(`${label}: ${value}`);
    }
  });

  console.log('\n=== LOOKING FOR OPTIONS/EQUIPMENT ===');

  // Method 1: Look for "Equipment" or "Options" headings
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const text = $(el).text().trim();
    if (text.toLowerCase().includes('equipment') ||
        text.toLowerCase().includes('option') ||
        text.toLowerCase().includes('feature')) {
      console.log(`Found heading: "${text}"`);
      // Get the next sibling content
      const next = $(el).next();
      console.log(`Next element: ${next.prop('tagName')}`);

      // Try to find ul/ol in the next element
      const list = next.find('ul, ol').first();
      if (list.length > 0) {
        console.log('\nEquipment items:');
        list.find('li').each((i, li) => {
          console.log(`  - ${$(li).text().trim()}`);
        });
      } else {
        console.log(`Content: ${next.text().slice(0, 200)}`);
      }
    }
  });

  // Method 2: Look for lists (ul/ol) that might contain equipment
  console.log('\n=== LISTS ===');
  $('ul, ol').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 50 && text.length < 1000 &&
        (text.toLowerCase().includes('leather') ||
         text.toLowerCase().includes('air') ||
         text.toLowerCase().includes('wheel'))) {
      console.log(`\nList ${i}:`);
      console.log(text.slice(0, 300));
    }
  });

  // Method 3: Look for specific classes or IDs
  console.log('\n=== SPECIFIC SELECTORS ===');
  const selectors = [
    '.equipment',
    '.options',
    '.features',
    '#equipment',
    '#options',
    '[class*="equipment"]',
    '[class*="option"]'
  ];

  for (const selector of selectors) {
    const found = $(selector);
    if (found.length > 0) {
      console.log(`${selector}: Found ${found.length} elements`);
      console.log(`Content: ${found.first().text().slice(0, 200)}`);
    }
  }

  // Method 4: Look in dt/dd for equipment
  console.log('\n=== DT/DD FOR EQUIPMENT ===');
  $('dt').each((_, el) => {
    const label = $(el).text().trim().toLowerCase();
    if (label.includes('equipment') ||
        label.includes('option') ||
        label.includes('feature')) {
      const value = $(el).next('dd').text().trim();
      console.log(`${label}: ${value.slice(0, 300)}`);
    }
  });

  // Save HTML snippet for inspection
  console.log('\n=== SAVING HTML SNIPPET ===');
  const htmlSnippet = data.body.slice(0, 5000);
  console.log('First 500 chars of HTML:');
  console.log(htmlSnippet.slice(0, 500));
}

testCarsAndBidsOptions().catch(console.error);
