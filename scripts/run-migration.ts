#!/usr/bin/env npx tsx
import { supabaseAdmin } from '../lib/supabase/admin';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Please provide a migration file path');
    process.exit(1);
  }
  
  const fullPath = path.resolve(migrationFile);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`Migration file not found: ${fullPath}`);
    process.exit(1);
  }
  
  console.log(`Running migration: ${migrationFile}`);
  
  try {
    const sql = fs.readFileSync(fullPath, 'utf-8');
    
    // Split by semicolons but ignore those within strings
    const statements = sql
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error } = await supabaseAdmin.rpc('execute_sql', {
          sql: statement + ';'
        }).single();
        
        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await supabaseAdmin.from('_dummy_').select().limit(0);
          // This is a hack - we can't directly run SQL, so we'd need to use the SQL editor
          console.error('Migration requires manual execution via Supabase dashboard');
          console.error('Error:', error);
          process.exit(1);
        }
      }
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach - output SQL for manual execution
async function outputSQL() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('Please provide a migration file path');
    process.exit(1);
  }
  
  const fullPath = path.resolve(migrationFile);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`Migration file not found: ${fullPath}`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(fullPath, 'utf-8');
  
  console.log('Copy and run this SQL in Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/_/sql/new');
  console.log('-------------------');
  console.log(sql);
  console.log('-------------------');
}

// For now, just output the SQL since we can't run it directly
outputSQL();