#!/usr/bin/env node

/**
 * Automated database setup script
 * Reads SQL files and executes them in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runSQL(sqlContent, description) {
  console.log(`\n📝 ${description}...`);
  
  try {
    // Split by semicolons but be careful with functions
    const statements = sqlContent
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      // Skip comments
      if (statement.trim().startsWith('--')) continue;
      
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).single();
        
        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await supabase.from('_dummy_').select().limit(0);
          // This is a workaround - in production you'd use pg client
          console.log(`   ⚠️  Statement needs manual execution (copy to SQL Editor)`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (e) {
        errorCount++;
      }
    }
    
    if (errorCount === 0) {
      console.log(`   ✅ All statements executed successfully!`);
    } else {
      console.log(`   ⚠️  Some statements need manual execution`);
      console.log(`   Please run the SQL files manually in Supabase SQL Editor`);
    }
    
    return errorCount === 0;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('    PorscheStats Database Setup');
  console.log('========================================');
  
  try {
    // Read SQL files
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
    const seedPath = path.join(__dirname, '..', 'supabase', 'seed.sql');
    
    console.log('\n📂 Reading SQL files...');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    const seedSQL = await fs.readFile(seedPath, 'utf8');
    
    console.log('   ✅ SQL files loaded');
    
    // Note: Supabase doesn't allow arbitrary SQL execution via API for security
    // We need to use the SQL Editor in the dashboard
    
    console.log('\n========================================');
    console.log('    Manual Setup Required');
    console.log('========================================');
    console.log('\n📋 Please follow these steps:\n');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Click on "SQL Editor" in the left sidebar');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the contents of:');
    console.log(`   ${migrationPath}`);
    console.log('5. Click "Run" to create all tables');
    console.log('6. Create another new query');
    console.log('7. Copy and paste the contents of:');
    console.log(`   ${seedPath}`);
    console.log('8. Click "Run" to add seed data');
    
    console.log('\n🔗 Direct link to your SQL Editor:');
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0];
    console.log(`   https://supabase.com/dashboard/project/${projectUrl}/sql/new`);
    
    console.log('\n✨ After running both SQL files, your database will be ready!');
    console.log('   Then you can:');
    console.log('   - Create an account at http://localhost:3000/signup');
    console.log('   - Browse listings at http://localhost:3000/browse');
    console.log('   - Test VIN lookup at http://localhost:3000/vin');
    
    // Add scraper key to .env.local if not present
    if (!process.env.SCRAPER_API_KEY) {
      const crypto = require('crypto');
      const key = crypto.randomBytes(32).toString('hex');
      console.log(`\n🔐 Generated Scraper API Key: ${key}`);
      console.log('   Add this line to your .env.local:');
      console.log(`   SCRAPER_API_KEY=${key}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();