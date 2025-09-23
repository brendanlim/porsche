import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkRecentListings() {
  // Get listings from last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data, error } = await supabase
    .from('listings')
    .select('model, trim, year, price, source')
    .gte('scraped_at', yesterday.toISOString())
    .order('scraped_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by model and trim
  const modelTrimCounts: Record<string, { count: number; years: Set<number>; prices: number[] }> = {};
  const modelCounts: Record<string, number> = {};

  data?.forEach(listing => {
    // Count by model
    const model = listing.model || 'Unknown';
    modelCounts[model] = (modelCounts[model] || 0) + 1;

    // Count by model-trim combination
    const key = `${model} ${listing.trim || '(Base)'}`;
    if (!modelTrimCounts[key]) {
      modelTrimCounts[key] = { count: 0, years: new Set(), prices: [] };
    }
    modelTrimCounts[key].count++;
    if (listing.year) modelTrimCounts[key].years.add(listing.year);
    if (listing.price) modelTrimCounts[key].prices.push(listing.price);
  });

  console.log('📊 Recent Listings Breakdown (Last 24 Hours)');
  console.log('==========================================');
  console.log(`Total new listings: ${data?.length || 0}`);
  console.log('');

  console.log('Models Summary:');
  Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([model, count]) => {
      console.log(`  • ${model}: ${count} listings`);
    });

  console.log('');
  console.log('Detailed Model-Trim Breakdown:');

  Object.entries(modelTrimCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([modelTrim, stats]) => {
      const avgPrice = stats.prices.length > 0
        ? Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length)
        : 0;
      const years = Array.from(stats.years).sort((a, b) => a - b).join(', ') || 'N/A';
      console.log(`  • ${modelTrim}: ${stats.count} listing(s)`);
      if (stats.count > 1 || avgPrice > 0) {
        console.log(`    Years: ${years}, Avg Price: $${avgPrice.toLocaleString()}`);
      }
    });

  // Check for GT3 dominance
  const gt3Count = Object.entries(modelTrimCounts)
    .filter(([key]) => key.toLowerCase().includes('gt3'))
    .reduce((sum, [, stats]) => sum + stats.count, 0);

  console.log('');
  console.log('Diversity Analysis:');
  console.log(`  • GT3/GT3 RS listings: ${gt3Count} (${Math.round(gt3Count / (data?.length || 1) * 100)}%)`);
  console.log(`  • Other trims: ${(data?.length || 0) - gt3Count} (${Math.round(((data?.length || 0) - gt3Count) / (data?.length || 1) * 100)}%)`);
  console.log(`  • Unique model-trim combinations: ${Object.keys(modelTrimCounts).length}`);
}

checkRecentListings().catch(console.error);