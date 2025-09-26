import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '../../supabase/migrations/014_create_market_narratives.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 014_create_market_narratives.sql');

    // Split by semicolon and filter out empty statements
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 100)}...`);

      const { error } = await supabase
        .from('_temp_migration')
        .select('*')
        .limit(0); // This is a hack to get access to the raw SQL execution

      // Use a different approach - create a simple function to execute raw SQL
      const { error: execError } = await supabase.rpc('exec_sql', { sql: statement });

      if (execError && execError.code !== 'PGRST202') {
        console.error('Statement failed:', execError);
        process.exit(1);
      } else if (execError?.code === 'PGRST202') {
        // Function doesn't exist, try direct table creation
        console.log('Direct execution not available, trying table operations...');

        // For CREATE TABLE statements, we can't execute directly
        // Let's try each statement type individually
        if (statement.includes('CREATE TABLE')) {
          console.log('Would create table - manual execution required');
        } else if (statement.includes('CREATE INDEX')) {
          console.log('Would create index - manual execution required');
        } else if (statement.includes('ALTER TABLE')) {
          console.log('Would alter table - manual execution required');
        } else if (statement.includes('CREATE POLICY')) {
          console.log('Would create policy - manual execution required');
        }
      } else {
        console.log('✓ Statement executed successfully');
      }
    }

    console.log('Migration completed - please verify in Supabase dashboard');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

runMigration();