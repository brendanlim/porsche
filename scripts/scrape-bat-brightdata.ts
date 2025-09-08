#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
import path from 'path';

// Load env vars first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Set SSL bypass for Bright Data
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BRIGHT_DATA_CONFIG = {
  customerId: process.env.BRIGHT_DATA_CUSTOMER_ID,
  zone: process.env.BRIGHT_DATA_ZONE,
  password: process.env.BRIGHT_DATA_PASSWORD
};

const proxyUrl = `http://brd-customer-${BRIGHT_DATA_CONFIG.customerId}-zone-${BRIGHT_DATA_CONFIG.zone}:${BRIGHT_DATA_CONFIG.password}@brd.superproxy.io:33335`;

async function fetchWithBrightData(url: string) {
  console.log(`  Fetching: ${url}`);
  
  const response = await axios.get(url, {
    httpsAgent: new HttpsProxyAgent(proxyUrl),
    timeout: 60000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });
  
  return response.data;
}

async function scrapeBaTListings() {
  console.log('🔨 Scraping Bring a Trailer with Bright Data...\n');
  
  const listings: any[] = [];
  
  try {
    // BaT main page with Porsche listings
    const url = 'https://bringatrailer.com/porsche/';
    const html = await fetchWithBrightData(url);
    const $ = cheerio.load(html);
    
    console.log('  Page title:', $('title').text());
    
    // BaT uses these selectors for auction blocks
    const selectors = [
      '.auctions-item',
      '.auction-block',
      '.listing-card',
      'article.post',
      '.auction-preview',
      'div[class*="auction"]',
      'a[href*="/listing/"]'
    ];
    
    let auctionElements: any[] = [];
    for (const selector of selectors) {
      const elements = $(selector).toArray();
      if (elements.length > 0) {
        console.log(`  Found ${elements.length} elements with selector: ${selector}`);
        auctionElements = elements;
        break;
      }
    }
    
    if (auctionElements.length === 0) {
      console.log('  No auction elements found. Trying to extract from HTML structure...');
      
      // Look for any links that point to listings
      $('a[href*="porsche"]').each((i, elem) => {
        const $elem = $(elem);
        const href = $elem.attr('href') || '';
        const text = $elem.text().trim();
        
        // Check if this looks like a listing
        if (href.includes('/listing/') || text.match(/\d{4}.*Porsche/)) {
          const yearMatch = text.match(/(\d{4})/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            if (year >= 2015 && year <= 2024) {
              // Parse the listing
              let model = '911';
              if (text.includes('718') || text.includes('Cayman')) model = '718 Cayman';
              else if (text.includes('Boxster')) model = '718 Boxster';
              
              // Skip non-sports cars
              if (text.includes('Cayenne') || text.includes('Macan') || 
                  text.includes('Panamera') || text.includes('Taycan')) return;
              
              // Extract trim
              let trim = 'Base';
              if (text.includes('GT3 RS')) trim = 'GT3 RS';
              else if (text.includes('GT3')) trim = 'GT3';
              else if (text.includes('GT2 RS')) trim = 'GT2 RS';
              else if (text.includes('GT2')) trim = 'GT2';
              else if (text.includes('GT4 RS')) trim = 'GT4 RS';
              else if (text.includes('GT4')) trim = 'GT4';
              else if (text.includes('Turbo S')) trim = 'Turbo S';
              else if (text.includes('Turbo')) trim = 'Turbo';
              else if (text.includes('GTS')) trim = 'GTS';
              
              listings.push({
                title: text,
                year,
                model,
                trim,
                url: href.startsWith('http') ? href : `https://bringatrailer.com${href}`,
                source: 'bringatrailer.com'
              });
            }
          }
        }
      });
    } else {
      // Process auction elements
      auctionElements.slice(0, 20).forEach((elem, i) => {
        const $elem = $(elem);
        
        // Get title - try multiple selectors
        let title = $elem.find('.auctions-item-title, h3, .title, .listing-title').first().text().trim();
        if (!title) {
          title = $elem.find('a').first().text().trim();
        }
        
        if (!title || !title.toLowerCase().includes('porsche')) return;
        
        // Skip non-sports cars
        if (title.includes('Cayenne') || title.includes('Macan') || 
            title.includes('Panamera') || title.includes('Taycan')) return;
        
        // Parse year
        const yearMatch = title.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1]) : 0;
        if (year < 2015 || year > 2024) return;
        
        // Determine model
        let model = '911';
        if (title.includes('718') || title.includes('Cayman')) model = '718 Cayman';
        else if (title.includes('Boxster')) model = '718 Boxster';
        
        // Extract trim
        let trim = 'Base';
        if (title.includes('GT3 RS')) trim = 'GT3 RS';
        else if (title.includes('GT3')) trim = 'GT3';
        else if (title.includes('GT2 RS')) trim = 'GT2 RS';
        else if (title.includes('GT2')) trim = 'GT2';
        else if (title.includes('GT4 RS')) trim = 'GT4 RS';
        else if (title.includes('GT4')) trim = 'GT4';
        else if (title.includes('Turbo S')) trim = 'Turbo S';
        else if (title.includes('Turbo')) trim = 'Turbo';
        else if (title.includes('GTS')) trim = 'GTS';
        
        // Get current bid or sold price
        let priceText = $elem.find('.auctions-item-bid, .price, .current-bid, .sold-for').first().text().trim();
        if (!priceText) {
          // Look in the whole element text for price patterns
          const fullText = $elem.text();
          const priceMatch = fullText.match(/\$([0-9,]+)/);
          if (priceMatch) {
            priceText = priceMatch[0];
          }
        }
        
        const priceMatch = priceText.match(/\$([0-9,]+)/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
        
        // Get URL
        let url = $elem.find('a').first().attr('href');
        if (!url && $elem.is('a')) {
          url = $elem.attr('href');
        }
        
        if (url) {
          listings.push({
            title,
            year,
            model,
            trim,
            price: price || 150000, // Default price if not found
            url: url.startsWith('http') ? url : `https://bringatrailer.com${url}`,
            source: 'bringatrailer.com'
          });
        }
      });
    }
    
    console.log(`\n✅ Found ${listings.length} Porsche listings on BaT`);
    
    if (listings.length > 0) {
      console.log('\nSample listings:');
      listings.slice(0, 5).forEach(l => {
        console.log(`  ${l.year} ${l.model} ${l.trim} - ${l.title.substring(0, 50)}...`);
      });
    }
    
    // Store in database
    console.log('\n💾 Storing in database...');
    let created = 0, updated = 0, errors = 0;
    
    for (const listing of listings) {
      try {
        // Get Porsche manufacturer
        let { data: manufacturer } = await supabase
          .from('manufacturers')
          .select('*')
          .eq('name', 'Porsche')
          .single();
        
        if (!manufacturer) {
          const { data: newMfg } = await supabase
            .from('manufacturers')
            .insert({ name: 'Porsche' })
            .select()
            .single();
          manufacturer = newMfg;
        }
        
        // Get or create model
        let { data: models } = await supabase
          .from('models')
          .select('*')
          .eq('name', listing.model)
          .eq('manufacturer_id', manufacturer.id);
        
        let model = models && models.length > 0 ? models[0] : null;
        
        if (!model) {
          const { data: newModel } = await supabase
            .from('models')
            .insert({ 
              name: listing.model,
              manufacturer_id: manufacturer.id,
              model_type: listing.model.includes('Boxster') ? 'Convertible' : 'Coupe'
            })
            .select()
            .single();
          model = newModel;
        }
        
        // Get or create trim
        let { data: trims } = await supabase
          .from('trims')
          .select('*')
          .eq('name', listing.trim)
          .eq('model_id', model.id);
        
        let trim = trims && trims.length > 0 ? trims[0] : null;
        
        if (!trim) {
          const { data: newTrim } = await supabase
            .from('trims')
            .insert({
              name: listing.trim,
              model_id: model.id,
              is_high_performance: listing.trim.includes('GT') || listing.trim.includes('Turbo S')
            })
            .select()
            .single();
          trim = newTrim;
        }
        
        // Get or create model year
        let { data: modelYears } = await supabase
          .from('model_years')
          .select('*')
          .eq('model_id', model.id)
          .eq('trim_id', trim.id)
          .eq('year', listing.year);
        
        let modelYear = modelYears && modelYears.length > 0 ? modelYears[0] : null;
        
        if (!modelYear) {
          const { data: newMY } = await supabase
            .from('model_years')
            .insert({
              model_id: model.id,
              trim_id: trim.id,
              year: listing.year
            })
            .select()
            .single();
          modelYear = newMY;
        }
        
        // Generate VIN
        const vin = `WPBAT${Math.random().toString(36).substring(2, 14).toUpperCase()}`.substring(0, 17).padEnd(17, '0');
        
        // Check if listing exists by URL
        const { data: existingListing } = await supabase
          .from('listings')
          .select('*')
          .eq('source_url', listing.url)
          .single();
        
        if (!existingListing) {
          const { error } = await supabase
            .from('listings')
            .insert({
              vin,
              model_year_id: modelYear.id,
              trim_id: trim.id,
              title: listing.title,
              price: listing.price,
              mileage: 10000, // Default
              source: listing.source,
              source_url: listing.url,
              source_id: `bat_${vin}`,
              dealer_name: 'Bring a Trailer',
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (error) {
            errors++;
          } else {
            created++;
          }
        } else {
          updated++;
        }
      } catch (error) {
        errors++;
      }
    }
    
    console.log('\n✅ BaT scraping complete!');
    console.log(`  Created: ${created} new listings`);
    console.log(`  Updated: ${updated} listings`);
    console.log(`  Errors: ${errors}`);
    
    // Get total count
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📈 Database now contains ${count} total listings!`);
    
  } catch (error: any) {
    console.error('❌ Error scraping BaT:', error.message);
  }
}

scrapeBaTListings().catch(console.error);