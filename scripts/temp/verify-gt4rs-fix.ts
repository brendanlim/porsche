import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkGT4RSFixed() {
  const { data } = await supabase
    .from('listings')
    .select('model, trim, year, mileage')
    .or('trim.ilike.%gt4%rs%,trim.ilike.%gt4-rs%,trim.ilike.%gt4 rs%')
    .order('mileage', { ascending: false })
    .limit(10);

  console.log('GT4 RS Mileage Distribution (Top 10):');
  console.log('=====================================');
  data?.forEach(l => {
    const miles = l.mileage ? l.mileage.toLocaleString() : 'N/A';
    console.log(`• ${l.year} ${l.trim}: ${miles} miles`);
  });

  const { data: stats } = await supabase
    .from('listings')
    .select('mileage')
    .or('trim.ilike.%gt4%rs%,trim.ilike.%gt4-rs%,trim.ilike.%gt4 rs%')
    .not('mileage', 'is', null);

  if (stats && stats.length > 0) {
    const mileages = stats.map(s => s.mileage).filter(m => m !== null) as number[];
    const max = Math.max(...mileages);
    const avg = Math.round(mileages.reduce((a, b) => a + b, 0) / mileages.length);
    console.log(`\nStatistics:`);
    console.log(`• Max mileage: ${max.toLocaleString()} miles`);
    console.log(`• Avg mileage: ${avg.toLocaleString()} miles`);
    console.log(`• Total GT4 RS listings with mileage: ${stats.length}`);

    // Check if any still have unrealistic mileage
    const unrealistic = mileages.filter(m => m > 30000);
    if (unrealistic.length > 0) {
      console.log(`\n⚠️  Warning: ${unrealistic.length} listings still have unrealistic mileage (>30k miles)`);
    } else {
      console.log('\n✅ All GT4 RS mileage values are now realistic (<30k miles)');
    }
  }
}

checkGT4RSFixed().catch(console.error);