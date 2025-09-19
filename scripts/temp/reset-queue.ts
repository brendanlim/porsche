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
  // Reset processing status to pending (they got stuck)
  const { data, error } = await supabase
    .from('scrape_queue')
    .update({ status: 'pending', error_message: null })
    .eq('status', 'processing')
    .eq('source', 'bring-a-trailer')
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Reset ${data?.length || 0} items to pending status`);
    if (data && data.length > 0) {
      data.forEach(item => {
        console.log(`  - ${item.title || item.url}`);
      });
    }
  }
}

main().catch(console.error);