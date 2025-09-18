#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { CarsScraper } from '../../lib/scrapers/cars';
import { AutoTraderScraper } from '../../lib/scrapers/autotrader';
import { ScraperResult } from '../../lib/scrapers/base';
import { normalizeModelTrim } from '../../lib/services/model-trim-normalizer';
import { normalizeOptions } from '../../lib/services/options-normalizer';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Validate environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Models to scrape for active listings
const MODELS_TO_SCRAPE = [
  { model: '911', trims: ['GT3', 'GT3 RS', 'GT2 RS', 'Turbo S', 'Turbo'] },
  { model: '718 Cayman', trims: ['GT4', 'GT4 RS', 'GTS 4.0'] },
  { model: '718 Boxster', trims: ['Spyder', 'Spyder RS', 'GTS 4.0'] }
];

async function saveToDatabase(results: ScraperResult[], source: string) {
  let saved = 0;
  let updated = 0;
  let errors = 0;

  for (const result of results) {
    try {
      // Skip if no VIN or price
      if (!result.vin || !result.price || result.price <= 0) {
        console.log(`⚠️ Skipping listing without VIN or valid price: ${result.title}`);
        continue;
      }

      // Normalize model and trim
      const normalized = await normalizeModelTrim(
        result.model || 'Unknown',
        result.trim || 'Unknown',
        result.year || new Date().getFullYear()
      );

      // Check if VIN already exists for active listing
      const { data: existing } = await supabase
        .from('listings')
        .select('id, price, mileage, status')
        .eq('vin', result.vin)
        .eq('status', 'active')
        .single();

      const listingData = {
        source,
        source_url: result.source_url,
        source_id: result.source_id || `${source}_${result.vin}`,
        title: result.title || 'Unknown',
        price: result.price,
        year: result.year || normalized.year,
        model: normalized.model,
        trim: normalized.trim,
        generation: normalized.generation,
        model_year_id: normalized.modelYearId,
        mileage: result.mileage,
        vin: result.vin,
        exterior_color: result.exterior_color,
        interior_color: result.interior_color,
        dealer_name: result.dealer_name,
        location: result.location,
        is_dealer: result.is_dealer || false,
        status: 'active',
        list_date: result.listing_date ? new Date(result.listing_date) : new Date(),
        scraped_at: new Date(),
        options_text: result.options_text || '',
        description: result.description || '',
        raw_data: result.raw_data || {}
      };

      if (existing) {
        // Update existing active listing (price/mileage may have changed)
        const priceChanged = existing.price !== result.price;
        const mileageChanged = existing.mileage !== result.mileage;
        
        if (priceChanged || mileageChanged) {
          await supabase
            .from('listings')
            .update({
              ...listingData,
              price_history: supabase.sql`
                array_append(
                  COALESCE(price_history, '{}'), 
                  jsonb_build_object(
                    'date', NOW(), 
                    'price', ${existing.price},
                    'mileage', ${existing.mileage}
                  )
                )
              `
            })
            .eq('id', existing.id);
          
          console.log(`📝 Updated ${result.vin}: Price ${priceChanged ? `$${existing.price} → $${result.price}` : 'unchanged'}`);
          updated++;
        }
      } else {
        // Insert new active listing
        await supabase
          .from('listings')
          .insert(listingData);
        
        console.log(`✅ Saved new active listing: ${result.vin} - ${result.title}`);
        saved++;
      }

      // Process options if available
      if (result.options_text && normalized.modelYearId) {
        try {
          const optionIds = await normalizeOptions(result.options_text);
          await processListingOptions(supabase, result.vin!, optionIds);
        } catch (error) {
          console.error('Error processing options:', error);
        }
      }

    } catch (error) {
      console.error(`Error saving listing:`, error);
      errors++;
    }
  }

  return { saved, updated, errors };
}

async function scrapeActiveListings() {
  console.log('🚀 Starting active listings scraper for multiple sources\n');
  
  const sources = [
    { name: 'Cars.com', scraper: new CarsScraper() },
    { name: 'AutoTrader', scraper: new AutoTraderScraper() }
  ];

  let totalResults = 0;
  let totalSaved = 0;
  let totalUpdated = 0;

  for (const source of sources) {
    console.log(`\n📡 Scraping ${source.name}...`);
    console.log('='.repeat(50));

    for (const modelConfig of MODELS_TO_SCRAPE) {
      try {
        console.log(`\n🏎️ Scraping ${modelConfig.model} from ${source.name}`);
        
        // Scrape each trim
        for (const trim of modelConfig.trims) {
          console.log(`   Searching for ${trim}...`);
          
          const results = await source.scraper.scrapeListings(
            modelConfig.model,
            trim,
            false // onlySold = false for active listings
          );

          if (results.length > 0) {
            console.log(`   Found ${results.length} ${trim} listings`);
            
            const { saved, updated } = await saveToDatabase(results, source.name.toLowerCase().replace('.', ''));
            totalResults += results.length;
            totalSaved += saved;
            totalUpdated += updated;
          }
        }
        
      } catch (error) {
        console.error(`Error scraping ${modelConfig.model} from ${source.name}:`, error);
      }
    }
  }

  // Mark stale active listings as inactive
  console.log('\n🔍 Checking for stale active listings...');
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const { data: staleListings, error: staleError } = await supabase
    .from('listings')
    .update({ 
      status: 'inactive',
      updated_at: new Date()
    })
    .eq('status', 'active')
    .lt('scraped_at', threeDaysAgo.toISOString())
    .select('id');

  if (!staleError && staleListings) {
    console.log(`📦 Marked ${staleListings.length} stale listings as inactive`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ SCRAPING COMPLETE');
  console.log(`   Total listings found: ${totalResults}`);
  console.log(`   New listings saved: ${totalSaved}`);
  console.log(`   Existing listings updated: ${totalUpdated}`);
  console.log('='.repeat(50));
}

// Run the scraper
scrapeActiveListings()
  .then(() => {
    console.log('\n✨ Active listings scraping completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });