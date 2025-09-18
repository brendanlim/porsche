import dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('Running migration 006_add_color_columns.sql...\n');
  
  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/006_add_color_columns.sql');
  const migrationSql = await fs.readFile(migrationPath, 'utf-8');
  
  console.log('Migration SQL:');
  console.log(migrationSql);
  console.log('\nExecuting...');
  
  // Execute the migration
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: migrationSql
  }).single();
  
  if (error) {
    // Try direct execution as alternative
    const { error: directError } = await supabase.from('_sql').insert({
      query: migrationSql
    });
    
    if (directError) {
      console.error('Migration failed:', directError);
      
      // As last resort, try executing each statement separately
      console.log('\nTrying individual statements...');
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        console.log(`\nExecuting: ${statement.substring(0, 50)}...`);
        try {
          // Use raw SQL through REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql: statement + ';' })
          });
          
          if (!response.ok) {
            // Try another approach - direct table query
            console.log('Trying direct ALTER TABLE...');
            
            // Just check if column exists by trying to query it
            const { error: checkError } = await supabase
              .from('listings')
              .select('exterior_color')
              .limit(1);
            
            if (checkError?.message?.includes('column')) {
              console.log('Column does not exist, migration needed.');
              console.log('\n⚠️  Please run this migration manually in Supabase dashboard:');
              console.log('ALTER TABLE listings ADD COLUMN IF NOT EXISTS exterior_color VARCHAR(100);');
            } else {
              console.log('✅ Column already exists!');
            }
          }
        } catch (err) {
          console.error(`Statement failed: ${err}`);
        }
      }
    }
  } else {
    console.log('✅ Migration completed successfully!');
  }
}

runMigration().catch(console.error);