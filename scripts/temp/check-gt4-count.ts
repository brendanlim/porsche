import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGT4Count() {
  // Check GT4s by source
  const { data, count } = await supabase
    .from('listings')
    .select('source', { count: 'exact' })
    .ilike('trim', '%GT4%');

  const sourceCounts: Record<string, number> = {};
  data?.forEach(item => {
    sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
  });

  console.log('GT4 listings by source:');
  Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, cnt]) => {
      console.log(`  ${source}: ${cnt}`);
    });
  console.log(`\nTotal GT4 listings: ${count}`);

  // Check recent Cars and Bids
  const { data: recent } = await supabase
    .from('listings')
    .select('id, model, trim, year, scraped_at')
    .eq('source', 'carsandbids')
    .ilike('trim', '%GT4%')
    .order('scraped_at', { ascending: false })
    .limit(5);

  if (recent && recent.length > 0) {
    console.log('\nRecent Cars and Bids GT4s:');
    recent.forEach(r => {
      console.log(`  ${r.year || 'N/A'} ${r.model} ${r.trim} - scraped ${r.scraped_at}`);
    });
  } else {
    console.log('\nNo Cars and Bids GT4s found');
  }
}

checkGT4Count().catch(console.error);