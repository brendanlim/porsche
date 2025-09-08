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

// Sample data for different models and trims
const SAMPLE_LISTINGS = [
  // 911 GT3 listings
  { model: '911', trim: 'GT3', year: 2022, price: 285000, mileage: 3500, color: 'Shark Blue' },
  { model: '911', trim: 'GT3', year: 2022, price: 295000, mileage: 1200, color: 'Guards Red' },
  { model: '911', trim: 'GT3', year: 2021, price: 275000, mileage: 5500, color: 'White' },
  { model: '911', trim: 'GT3', year: 2023, price: 325000, mileage: 500, color: 'Python Green' },
  { model: '911', trim: 'GT3', year: 2022, price: 289000, mileage: 2800, color: 'Black' },
  
  // 911 GT3 RS listings
  { model: '911', trim: 'GT3 RS', year: 2023, price: 425000, mileage: 800, color: 'Lizard Green' },
  { model: '911', trim: 'GT3 RS', year: 2023, price: 445000, mileage: 200, color: 'Guards Red' },
  { model: '911', trim: 'GT3 RS', year: 2019, price: 365000, mileage: 4500, color: 'White' },
  
  // 718 GT4 RS listings
  { model: '718 Cayman', trim: 'GT4 RS', year: 2022, price: 285000, mileage: 1500, color: 'Arctic Grey' },
  { model: '718 Cayman', trim: 'GT4 RS', year: 2023, price: 315000, mileage: 300, color: 'Shark Blue' },
  { model: '718 Cayman', trim: 'GT4 RS', year: 2022, price: 295000, mileage: 2200, color: 'White' },
  
  // 718 GT4 listings
  { model: '718 Cayman', trim: 'GT4', year: 2021, price: 145000, mileage: 8500, color: 'Miami Blue' },
  { model: '718 Cayman', trim: 'GT4', year: 2020, price: 135000, mileage: 12000, color: 'Yellow' },
  { model: '718 Cayman', trim: 'GT4', year: 2021, price: 142000, mileage: 6000, color: 'Guards Red' },
  
  // Regular 911 Turbo S
  { model: '911', trim: 'Turbo S', year: 2022, price: 245000, mileage: 4500, color: 'Night Blue' },
  { model: '911', trim: 'Turbo S', year: 2021, price: 225000, mileage: 9500, color: 'Jet Black' },
  
  // Regular 911 Carrera
  { model: '911', trim: 'Carrera', year: 2021, price: 115000, mileage: 15000, color: 'White' },
  { model: '911', trim: 'Carrera S', year: 2022, price: 135000, mileage: 8000, color: 'Agate Grey' },
  { model: '911', trim: 'Carrera', year: 2020, price: 105000, mileage: 22000, color: 'Black' },
  
  // 718 Cayman S
  { model: '718 Cayman', trim: 'S', year: 2021, price: 85000, mileage: 12000, color: 'Racing Yellow' },
  { model: '718 Cayman', trim: 'GTS', year: 2022, price: 105000, mileage: 5000, color: 'Gentian Blue' },
  
  // 718 Boxster
  { model: '718 Boxster', trim: 'Spyder', year: 2021, price: 115000, mileage: 7500, color: 'GT Silver' },
  { model: '718 Boxster', trim: 'GTS', year: 2020, price: 92000, mileage: 18000, color: 'Carmine Red' },
];

async function populateDatabase() {
  console.log('🚀 Populating database with sample Porsche listings...\n');
  
  try {
    // First, ensure we have the necessary tables and basic data
    
    // Get or create Porsche manufacturer
    let { data: manufacturer, error: mfgError } = await supabase
      .from('manufacturers')
      .select('*')
      .eq('name', 'Porsche')
      .single();
    
    if (!manufacturer) {
      const { data: newMfg, error } = await supabase
        .from('manufacturers')
        .insert({ name: 'Porsche' })
        .select()
        .single();
      
      if (error) throw error;
      manufacturer = newMfg;
    }
    
    console.log('✅ Manufacturer:', manufacturer.name);
    
    // Process each listing
    for (const listing of SAMPLE_LISTINGS) {
      console.log(`\n📝 Processing ${listing.year} ${listing.model} ${listing.trim}...`);
      
      // Get or create model
      let { data: model, error: modelError } = await supabase
        .from('models')
        .select('*')
        .eq('name', listing.model)
        .eq('manufacturer_id', manufacturer.id)
        .single();
      
      if (!model) {
        const { data: newModel, error } = await supabase
          .from('models')
          .insert({ 
            name: listing.model,
            manufacturer_id: manufacturer.id,
            model_type: listing.model.includes('Boxster') ? 'Convertible' : 'Coupe'
          })
          .select()
          .single();
        
        if (error) throw error;
        model = newModel;
      }
      
      // Get or create generation
      let generation = null;
      if (listing.model === '911') {
        const genName = listing.year >= 2019 ? '992' : '991.2';
        let { data: gen } = await supabase
          .from('generations')
          .select('*')
          .eq('model_id', model.id)
          .eq('name', genName)
          .single();
        
        if (!gen) {
          const { data: newGen, error } = await supabase
            .from('generations')
            .insert({
              model_id: model.id,
              name: genName,
              start_year: genName === '992' ? 2019 : 2017,
              end_year: genName === '992' ? 2024 : 2019
            })
            .select()
            .single();
          
          if (!error) gen = newGen;
        }
        generation = gen;
      }
      
      // Get or create trim - handle duplicates properly
      let { data: trims } = await supabase
        .from('trims')
        .select('*')
        .eq('name', listing.trim)
        .eq('model_id', model.id);
      
      let trim = trims && trims.length > 0 ? trims[0] : null;
      
      if (!trim) {
        const { data: newTrim, error } = await supabase
          .from('trims')
          .insert({
            name: listing.trim,
            model_id: model.id,
            generation_id: generation?.id,
            is_high_performance: listing.trim.includes('GT') || listing.trim.includes('Turbo S'),
            min_realistic_price: listing.price * 0.7
          })
          .select()
          .single();
        
        if (error) throw error;
        trim = newTrim;
      }
      
      // Get or create model year
      let { data: modelYear, error: myError } = await supabase
        .from('model_years')
        .select('*')
        .eq('model_id', model.id)
        .eq('trim_id', trim.id)
        .eq('year', listing.year)
        .single();
      
      if (!modelYear) {
        const { data: newMY, error } = await supabase
          .from('model_years')
          .insert({
            model_id: model.id,
            trim_id: trim.id,
            generation_id: generation?.id,
            year: listing.year,
            msrp: listing.price * 0.85 // Rough MSRP estimate
          })
          .select()
          .single();
        
        if (error) throw error;
        modelYear = newMY;
      }
      
      // Get or create color
      let { data: color, error: colorError } = await supabase
        .from('colors')
        .select('*')
        .eq('name', listing.color)
        .single();
      
      if (!color) {
        const { data: newColor, error } = await supabase
          .from('colors')
          .insert({
            name: listing.color,
            is_pts: ['Python Green', 'Lizard Green', 'Shark Blue'].includes(listing.color)
          })
          .select()
          .single();
        
        if (error) throw error;
        color = newColor;
      }
      
      // Generate a fake VIN (17 characters exactly)
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const serialNum = Math.floor(Math.random() * 100000).toString().padStart(6, '0');
      const vin = `WP0AA2A8${randomPart}${serialNum}`.substring(0, 17);
      
      // Check if this VIN already exists
      const { data: existingListing } = await supabase
        .from('listings')
        .select('*')
        .eq('vin', vin)
        .single();
      
      if (!existingListing) {
        // Create the listing
        const { data: newListing, error: listingError } = await supabase
          .from('listings')
          .insert({
            vin: vin,
            model_year_id: modelYear.id,
            trim_id: trim.id,
            generation_id: generation?.id,
            title: `${listing.year} Porsche ${listing.model} ${listing.trim}`,
            price: listing.price,
            mileage: listing.mileage,
            exterior_color_id: color.id,
            interior_color: 'Black Leather',
            transmission: listing.trim.includes('GT') ? 'Manual' : 'PDK',
            source: 'cars.com',
            source_url: `https://www.cars.com/vehicledetail/${vin}/`,
            source_id: `cars_${vin}`,
            dealer_name: `Porsche ${['Beverly Hills', 'Newport Beach', 'San Diego', 'Marin'][Math.floor(Math.random() * 4)]}`,
            status: 'active',
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date in last 30 days
            updated_at: new Date().toISOString()
          })
          .select();
        
        if (listingError) {
          console.error('❌ Error creating listing:', listingError);
        } else {
          console.log(`✅ Created listing: ${listing.year} ${listing.model} ${listing.trim} - ${listing.color} - $${listing.price.toLocaleString()}`);
        }
      } else {
        console.log(`⏭️  Listing already exists for VIN ${vin}`);
      }
    }
    
    // Get total count
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n✅ Database now contains ${count} total listings!`);
    console.log('\n🎉 Sample data population complete!');
    console.log('📊 Visit http://localhost:3002/models/911/analytics to see the data');
    console.log('🏆 Visit http://localhost:3002/models/911/gt3/analytics for GT3 specific data');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

populateDatabase();