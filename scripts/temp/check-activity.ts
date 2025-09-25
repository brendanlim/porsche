#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkActivity() {
  const now = new Date();

  // Check different time ranges
  const ranges = [
    { name: 'last 5 minutes', time: new Date(Date.now() - 5 * 60 * 1000) },
    { name: 'last 15 minutes', time: new Date(Date.now() - 15 * 60 * 1000) },
    { name: 'last 30 minutes', time: new Date(Date.now() - 30 * 60 * 1000) },
    { name: 'last hour', time: new Date(Date.now() - 60 * 60 * 1000) }
  ];

  console.log(`Current time: ${now.toLocaleTimeString()}\n`);
  console.log('Database Activity:\n');

  for (const range of ranges) {
    const { count: listings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', range.time.toISOString());

    const { count: cache } = await supabase
      .from('raw_html_cache')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', range.time.toISOString());

    console.log(`${range.name}:`);
    console.log(`  Listings: ${listings || 0}`);
    console.log(`  HTML Cache: ${cache || 0}`);
  }

  // Check most recent listing
  const { data: recent } = await supabase
    .from('listings')
    .select('created_at, source, model, trim')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (recent) {
    const recentTime = new Date(recent.created_at);
    const minutesAgo = Math.round((now.getTime() - recentTime.getTime()) / 1000 / 60);
    console.log(`\nMost recent listing: ${minutesAgo} minutes ago`);
    console.log(`  ${recent.model} ${recent.trim || ''} from ${recent.source}`);
  }
}

checkActivity().catch(console.error);