import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function extractMileageFromLocalFiles() {
  console.log('🔍 Extracting mileage from local HTML files...\n');
  
  // Find local HTML files
  const files = [
    '/Users/brendan/Code/python/porschetrends/bat-search-Porsche-991-911.html',
    '/Users/brendan/Code/python/porschetrends/bat-search-Porsche-Cayman-GT4.html',
    '/Users/brendan/Code/python/porschetrends/bat-search-Porsche-911-GT2.html'
  ];
  
  const updates: Array<{url: string, mileage: number}> = [];
  
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    
    console.log(`Processing: ${path.basename(file)}`);
    const html = fs.readFileSync(file, 'utf-8');
    const $ = cheerio.load(html);
    
    // Extract from embedded JSON
    const scriptTags = $('script').toArray();
    
    for (const script of scriptTags) {
      const scriptContent = $(script).html() || '';
      
      if (scriptContent.includes('auctionsCompletedInitialData')) {
        const jsonMatch = scriptContent.match(/auctionsCompletedInitialData\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
        
        if (jsonMatch) {
          try {
            const auctionData = JSON.parse(jsonMatch[1]);
            console.log(`  Found ${auctionData.length} completed auctions in embedded JSON`);
            
            for (const auction of auctionData) {
              if (!auction.url) continue;
              
              const listingUrl = auction.url.startsWith('http') 
                ? auction.url 
                : `https://bringatrailer.com${auction.url}`;
              
              // Extract mileage from subtitle or description
              let mileage = 0;
              
              // Try to find mileage in various formats
              const possibleText = [
                auction.subtitle,
                auction.description,
                auction.titlesub,
                auction.title
              ].filter(Boolean).join(' ');
              
              // Look for patterns like "12,345 miles", "12k miles", "12,345-Mile"
              const mileagePatterns = [
                /(\d{1,3}(?:,\d{3})*)\s*(?:-?[Mm]ile|[Mm]iles)/,
                /(\d+)[Kk]\s*(?:-?[Mm]ile|[Mm]iles)/,
                /(\d+)[Kk]-[Mm]ile/
              ];
              
              for (const pattern of mileagePatterns) {
                const match = possibleText.match(pattern);
                if (match) {
                  if (match[1].includes('k') || match[1].includes('K')) {
                    mileage = parseInt(match[1]) * 1000;
                  } else {
                    mileage = parseInt(match[1].replace(/,/g, ''));
                  }
                  break;
                }
              }
              
              if (mileage > 0) {
                updates.push({ url: listingUrl, mileage });
                console.log(`    Found mileage: ${mileage.toLocaleString()} for ${auction.title?.substring(0, 50)}`);
              }
            }
          } catch (e) {
            console.error('  Error parsing embedded JSON:', e);
          }
        }
      }
    }
    
    // Also look in the HTML content directly
    $('.content').each((i, elem) => {
      const text = $(elem).text();
      const link = $(elem).find('h3 a').attr('href');
      
      if (link && text.includes('Sold for')) {
        // Look for mileage
        const mileageMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*miles/i) || 
                            text.match(/(\d+)[Kk]-[Mm]ile/);
        
        if (mileageMatch) {
          let mileage = 0;
          if (mileageMatch[1].includes('k') || mileageMatch[1].includes('K')) {
            mileage = parseInt(mileageMatch[1]) * 1000;
          } else {
            mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
          }
          
          if (mileage > 0 && !updates.find(u => u.url === link)) {
            updates.push({ url: link, mileage });
            console.log(`    Found mileage in HTML: ${mileage.toLocaleString()}`);
          }
        }
      }
    });
  }
  
  console.log(`\n📊 Found mileage for ${updates.length} listings`);
  
  // Update database
  if (updates.length > 0) {
    console.log('\n🔄 Updating database...');
    
    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from('listings')
        .update({ mileage: update.mileage })
        .eq('url', update.url);
      
      if (error) {
        console.error(`  Error updating ${update.url}:`, error.message);
      }
    }
    
    console.log('✅ Database updated!');
  }
  
  // Check how many listings now have mileage
  const { data: withMileage } = await supabaseAdmin
    .from('listings')
    .select('id')
    .gt('mileage', 0);
  
  const { count: totalCount } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📈 Status: ${withMileage?.length || 0} of ${totalCount} listings now have mileage data`);
}

extractMileageFromLocalFiles().catch(console.error);