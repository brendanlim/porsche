import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkVINs() {
  // Check how many BaT listings have VINs
  const { data: batWithVIN, count: vinCount } = await supabase
    .from('listings')
    .select('vin', { count: 'exact', head: false })
    .eq('source', 'bat')
    .not('vin', 'is', null);
    
  const { count: totalBaT } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'bat');
    
  console.log(`BaT listings with VIN: ${vinCount} / ${totalBaT} (${((vinCount!/totalBaT!)*100).toFixed(1)}%)`);
  
  // Show sample of VINs
  const { data: samples } = await supabase
    .from('listings')
    .select('vin, title')
    .eq('source', 'bat')
    .not('vin', 'is', null)
    .limit(5);
    
  console.log('\nSample VINs from BaT:');
  samples?.forEach(s => console.log(`  ${s.vin}: ${s.title}`));
  
  // Check listings without VINs
  const { data: noVin } = await supabase
    .from('listings')
    .select('title, source_url')
    .eq('source', 'bat')
    .is('vin', null)
    .limit(5);
    
  console.log('\nSample BaT listings WITHOUT VIN:');
  noVin?.forEach(s => console.log(`  ${s.title}`));
  
  // Check all sources
  const sources = ['bat', 'cars', 'cargurus', 'edmunds', 'autotrader', 'carsandbids', 'classic'];
  console.log('\nVIN coverage by source:');
  
  for (const source of sources) {
    const { count: withVin } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('source', source)
      .not('vin', 'is', null);
      
    const { count: total } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('source', source);
      
    if (total && total > 0) {
      console.log(`  ${source}: ${withVin}/${total} (${((withVin!/total)*100).toFixed(1)}%)`);
    }
  }
}

checkVINs().catch(console.error);