#!/usr/bin/env npx tsx
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: envPath });
  } catch (error) {}
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data, error } = await supabase
    .from('listings')
    .select('id, title, year, scraped_at, model_id, trim_id, generation_id, source')
    .gte('scraped_at', threeDaysAgo.toISOString())
    .order('scraped_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total listings in past 3 days:', data?.length || 0);
    console.log('');

    if (data && data.length > 0) {
      const normalized = data.filter(l => l.model_id && l.trim_id && l.generation_id).length;
      const notNormalized = data.length - normalized;

      console.log('Normalized (has model_id, trim_id, generation_id):', normalized);
      console.log('Not normalized:', notNormalized);
      console.log('');

      console.log('Recent listings (showing all):');
      data.forEach(l => {
        const isNormalized = l.model_id && l.trim_id && l.generation_id ? '✅' : '❌';
        const date = l.scraped_at.split('T')[0];
        console.log(`${isNormalized} [${date}] ${l.title} (source: ${l.source})`);
      });
    }
  }
}

main().catch(console.error);
