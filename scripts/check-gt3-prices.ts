import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yqtldkqqfaqubhrwibon.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxdGxka3FxZmFxdWJocndpYm9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzEyMzQxNCwiZXhwIjoyMDcyNjk5NDE0fQ.BMTvxPMFbsB4SkZA02FunZF68dyYD0QCrWn7irivK-0'
);

async function checkGT3Prices() {
  // Check for suspiciously low prices
  const { data: lowPrices, error: lowError } = await supabase
    .from('listings')
    .select('id, price, mileage, year, title, source, scraped_at, status')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .lt('price', 100000)
    .order('price', { ascending: true });

  if (lowError) {
    console.error('Error:', lowError);
  } else {
    console.log('\n=== Suspiciously low GT3 prices (< $100k) ===');
    lowPrices?.forEach(l => {
      console.log(`Price: $${l.price.toLocaleString()}, Mileage: ${l.mileage?.toLocaleString() || 'N/A'}, Year: ${l.year || 'N/A'}, Status: ${l.status || 'N/A'}, Source: ${l.source}`);
      console.log(`  Title: ${l.title?.substring(0, 80)}`);
    });
  }

  // Check for 0-mile listings
  const { data: zeroMiles, error: zeroError } = await supabase
    .from('listings')
    .select('id, price, mileage, year, title, source, scraped_at, status')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('mileage', 0)
    .order('price', { ascending: false });

  if (zeroError) {
    console.error('Error:', zeroError);
  } else {
    console.log('\n=== GT3s with 0 miles ===');
    zeroMiles?.forEach(l => {
      console.log(`Price: $${l.price.toLocaleString()}, Year: ${l.year || 'N/A'}, Status: ${l.status || 'N/A'}, Source: ${l.source}`);
      console.log(`  Title: ${l.title?.substring(0, 80)}`);
    });
  }
  
  // Get model and trim counts
  const { data: modelCounts, error: modelError } = await supabase
    .from('listings')
    .select('model, trim')
    .order('model');

  if (!modelError && modelCounts) {
    const counts = new Map();
    modelCounts.forEach(l => {
      const key = `${l.model}|${l.trim}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    
    console.log('\n=== Model & Trim Counts ===');
    const sortedCounts = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    sortedCounts.forEach(([key, count]) => {
      const [model, trim] = key.split('|');
      const modelSlug = model.toLowerCase().replace(/\s+/g, '-');
      const trimSlug = trim.toLowerCase().replace(/\s+/g, '-');
      console.log(`${count.toString().padStart(4)} listings: ${model} ${trim}`);
      console.log(`     http://localhost:3003/models/${modelSlug}/${trimSlug}/analytics`);
    });
  }

  // Check price distribution
  const { data: allGT3s, error: allError } = await supabase
    .from('listings')
    .select('price')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .gt('price', 0);

  if (!allError && allGT3s) {
    const prices = allGT3s.map(l => l.price).sort((a, b) => a - b);
    console.log('\n=== GT3 Price Statistics ===');
    console.log(`Total listings: ${prices.length}`);
    console.log(`Min price: $${Math.min(...prices).toLocaleString()}`);
    console.log(`Max price: $${Math.max(...prices).toLocaleString()}`);
    console.log(`Median price: $${prices[Math.floor(prices.length / 2)].toLocaleString()}`);
    console.log(`Listings under $100k: ${prices.filter(p => p < 100000).length}`);
  }
}

checkGT3Prices();