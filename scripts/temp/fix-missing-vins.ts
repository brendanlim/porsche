import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY!;

interface Listing {
  id: string;
  source_url: string;
  title: string;
  vin: string | null;
}

async function scrapeBaTVIN(url: string): Promise<{ vin: string | null; color: string | null; options: string | null }> {
  try {
    console.log(`  Scraping: ${url}`);

    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: SCRAPINGBEE_API_KEY,
        url: url,
        render_js: 'false',
        premium_proxy: 'false',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);

    // Extract VIN - BaT shows VIN in the essentials section
    let vin: string | null = null;

    // Method 1: Look for VIN in the essentials/details section
    $('.essential-item, .listing-essentials dt, .listing-essentials dd').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.toLowerCase().includes('vin')) {
        const nextText = $(elem).next().text().trim();
        if (nextText && nextText.length === 17) {
          vin = nextText;
        }
      }
    });

    // Method 2: Look for VIN in any paragraph or div
    if (!vin) {
      $('p, div, span').each((_, elem) => {
        const text = $(elem).text();
        const vinMatch = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/);
        if (vinMatch) {
          vin = vinMatch[0];
          return false; // break
        }
      });
    }

    // Extract color
    let color: string | null = null;
    $('.essential-item, .listing-essentials dt, .listing-essentials dd').each((_, elem) => {
      const text = $(elem).text().trim().toLowerCase();
      if (text.includes('exterior') || text.includes('color')) {
        const nextText = $(elem).next().text().trim();
        if (nextText && nextText.length > 0 && nextText.length < 50) {
          color = nextText;
        }
      }
    });

    // Extract options/features
    let options: string | null = null;
    const optionsList: string[] = [];

    // Look for equipment/features section
    $('.equipment-list li, .features-list li, [class*="feature"] li').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 0) {
        optionsList.push(text);
      }
    });

    if (optionsList.length > 0) {
      options = optionsList.join('; ');
    }

    return { vin, color, options };
  } catch (error) {
    console.error(`  Error scraping ${url}:`, error instanceof Error ? error.message : 'Unknown error');
    return { vin: null, color: null, options: null };
  }
}

async function fixMissingVINs() {
  console.log('🔍 Finding listings without VINs...\n');

  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, source_url, title, vin, exterior_color, options_text')
    .is('vin', null)
    .not('source_url', 'is', null)
    .limit(50); // Start with 50 to avoid hitting API limits

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Found ${listings.length} listings without VINs\n`);

  if (listings.length === 0) {
    console.log('No listings to fix!');
    return;
  }

  let fixed = 0;
  let failed = 0;

  for (const listing of listings) {
    console.log(`\n[${fixed + failed + 1}/${listings.length}] ${listing.title}`);

    const scraped = await scrapeBaTVIN(listing.source_url);

    if (scraped.vin) {
      console.log(`  ✅ Found VIN: ${scraped.vin}`);

      const updateData: any = { vin: scraped.vin };

      if (scraped.color && !listing.exterior_color) {
        updateData.exterior_color = scraped.color;
        console.log(`  ✅ Found color: ${scraped.color}`);
      }

      if (scraped.options && !listing.options_text) {
        updateData.options_text = scraped.options;
        console.log(`  ✅ Found options (${scraped.options.length} chars)`);
      }

      const { error: updateError } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listing.id);

      if (updateError) {
        console.error(`  ❌ Failed to update:`, updateError);
        failed++;
      } else {
        fixed++;
      }
    } else {
      console.log(`  ⚠️  No VIN found on page`);
      failed++;
    }

    // Rate limiting - wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success rate: ${((fixed / listings.length) * 100).toFixed(1)}%`);
  console.log(`\nNote: Run this script multiple times to process all ${listings.length}+ listings`);
}

fixMissingVINs();
