#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/011_scrape_queue.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons to run each statement separately
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log('🚀 Running scrape_queue migration...\n');

  for (const statement of statements) {
    try {
      console.log('Executing:', statement.substring(0, 50) + '...');

      // Use raw SQL execution through Supabase
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        console.error('❌ Error:', error.message);
        // Continue with other statements even if one fails
      } else {
        console.log('✅ Success\n');
      }
    } catch (err) {
      console.error('❌ Error:', err);
    }
  }

  // Verify the table was created
  const { data, error } = await supabase
    .from('scrape_queue')
    .select('*')
    .limit(1);

  if (!error) {
    console.log('✅ Migration complete! scrape_queue table is ready.');
  } else {
    console.log('⚠️  Table may not be fully created. You may need to run the migration manually in Supabase dashboard.');
  }
}

runMigration().catch(console.error);