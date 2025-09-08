import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function analyzeHtml() {
  const { data } = await supabaseAdmin.storage
    .from('raw-html')
    .download('bat/20250907/unknown/detail/bringatrailer_com_listing_2014-porsche-911-gt3-36__6e5e2653b146.html');
  
  if (data) {
    const text = await data.text();
    
    // Look for sold indicators
    const hasSoldFor = text.includes('Sold for');
    const hasWinningBid = text.includes('winning bid');
    const hasAuctionEnded = text.includes('auction has ended');
    const hasSoldPrice = text.includes('sold-price');
    
    console.log('HTML Analysis:');
    console.log('  Has "Sold for": ', hasSoldFor);
    console.log('  Has "winning bid": ', hasWinningBid);
    console.log('  Has "auction has ended": ', hasAuctionEnded);
    console.log('  Has "sold-price": ', hasSoldPrice);
    
    // Search for price patterns
    const priceMatch = text.match(/Sold for.*?\$([0-9,]+)/);
    const mileageMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles|Miles)/);
    
    console.log('  Price found: ', priceMatch ? '$' + priceMatch[1] : 'Not found');
    console.log('  Mileage found: ', mileageMatch ? mileageMatch[1] + ' miles' : 'Not found');
    
    // Check if it's a "Page Not Found" or redirect
    const hasPageNotFound = text.includes('Page Not Found');
    const has404 = text.includes('404');
    const hasRedirect = text.includes('redirect');
    
    console.log('\nPage status:');
    console.log('  Has "Page Not Found": ', hasPageNotFound);
    console.log('  Has "404": ', has404);
    console.log('  Has "redirect": ', hasRedirect);
    
    // Check first 1000 chars
    console.log('\nFirst 1000 chars of HTML:');
    console.log(text.substring(0, 1000));
    
    // Look for auction status indicators
    if (text.includes('Current Bid') || text.includes('Time Left')) {
      console.log('\n⚠️ This appears to be an ACTIVE auction');
    }
    
    if (text.includes('This auction has ended')) {
      console.log('\n✅ This auction has ENDED');
    }
  } else {
    console.log('Could not download HTML file');
  }
}

analyzeHtml().catch(console.error);