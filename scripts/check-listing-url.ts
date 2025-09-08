import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';
import * as cheerio from 'cheerio';

async function checkListing() {
  const filePath = 'bat/718-cayman/gt4/20250906/detail/bringatrailer_com_listing_2024-porsche-gt4-rs-club_a73699d6a639.html';
  
  console.log('Checking file:', filePath);
  
  // Download the HTML file
  const { data, error } = await supabaseAdmin.storage
    .from('raw-html')
    .download(filePath);
  
  if (error) {
    console.error('Error downloading:', error);
    return;
  }
  
  const html = await data.text();
  const $ = cheerio.load(html);
  
  // Extract URL from meta tags
  const ogUrl = $('meta[property="og:url"]').attr('content');
  const canonical = $('link[rel="canonical"]').attr('href');
  
  console.log('\nExtracted URLs:');
  console.log('  OG URL:', ogUrl);
  console.log('  Canonical URL:', canonical);
  
  // Also check the title and price info
  const title = $('h1').first().text().trim();
  const listingInfo = $('.listing-available-info').text().trim();
  
  console.log('\nListing details:');
  console.log('  Title:', title);
  console.log('  Status/Price info:', listingInfo);
  
  // Try to reconstruct URL from filename
  const filename = 'bringatrailer_com_listing_2024-porsche-gt4-rs-club_a73699d6a639';
  const urlPart = filename
    .replace('bringatrailer_com_listing_', '')
    .replace(/_/g, '-')
    .split('_')[0]; // Remove the hash at the end
    
  const reconstructedUrl = `https://bringatrailer.com/listing/${urlPart}/`;
  console.log('\nReconstructed URL from filename:');
  console.log('  ', reconstructedUrl);
  
  // Check if it's really sold
  const pageText = html.toLowerCase();
  const hasSoldFor = pageText.includes('sold for');
  const hasWinningBid = pageText.includes('winning bid');
  const hasCurrentBid = pageText.includes('current bid');
  
  console.log('\nSold indicators:');
  console.log('  Has "sold for":', hasSoldFor);
  console.log('  Has "winning bid":', hasWinningBid);
  console.log('  Has "current bid":', hasCurrentBid);
}

checkListing().catch(console.error);