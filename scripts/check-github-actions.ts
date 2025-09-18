import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function checkGitHubActionsActivity() {
  console.log('Checking for recent GitHub Actions scraper activity...\n');
  
  // Check last 10 scraped listings
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('scraped_at, source, model, trim')
    .order('scraped_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No listings found in database');
    return;
  }
  
  console.log('Latest 10 scraped listings:');
  console.log('═══════════════════════════════════════════════════════════');
  
  data.forEach(listing => {
    const date = listing.scraped_at ? new Date(listing.scraped_at) : null;
    const timeAgo = date ? getTimeAgo(date) : 'Unknown';
    console.log(`${date?.toISOString() || 'No date'} (${timeAgo})`);
    console.log(`  Source: ${listing.source}`);
    console.log(`  Model: ${listing.model} ${listing.trim || ''}`);
    console.log('---');
  });
  
  // Check if GitHub Actions might be running
  const mostRecent = data[0].scraped_at ? new Date(data[0].scraped_at) : null;
  if (mostRecent) {
    const hoursSinceLastScrape = (Date.now() - mostRecent.getTime()) / (1000 * 60 * 60);
    
    console.log('\nAnalysis:');
    if (hoursSinceLastScrape < 24) {
      console.log('✅ Scrapers ran within last 24 hours - GitHub Actions likely working!');
    } else if (hoursSinceLastScrape < 48) {
      console.log('⚠️ Last scrape was over 24 hours ago - check GitHub Actions status');
    } else {
      console.log('❌ No recent scraping activity - GitHub Actions may not be running');
      console.log('   Check: https://github.com/[your-username]/porschetrends/actions');
    }
    
    console.log(`\nLast scrape: ${hoursSinceLastScrape.toFixed(1)} hours ago`);
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} weeks ago`;
}

checkGitHubActionsActivity().catch(console.error);