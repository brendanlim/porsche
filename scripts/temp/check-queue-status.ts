#!/usr/bin/env npx tsx
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase
    .from('scrape_queue')
    .select('status, source')
    .eq('source', 'bring-a-trailer');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data) {
    const counts: Record<string, number> = {};
    data.forEach(item => {
      counts[item.status] = (counts[item.status] || 0) + 1;
    });
    console.log('Queue Status for bring-a-trailer:');
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    console.log(`  Total: ${data.length}`);
  }
}

main().catch(console.error);