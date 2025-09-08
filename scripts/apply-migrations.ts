import dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function applyMigrations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🚀 Applying database migrations...\n');
  console.log(`Project URL: ${supabaseUrl}`);
  
  // Get project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    console.error('❌ Could not extract project ref from URL');
    process.exit(1);
  }
  console.log(`Project Ref: ${projectRef}\n`);

  // Read all migration files
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
  
  console.log(`Found ${sqlFiles.length} migration files:\n`);
  
  for (const file of sqlFiles) {
    console.log(`📄 ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = await fs.readFile(filePath, 'utf-8');
    
    // Skip if it's just comments
    const cleanSql = sql.replace(/--.*$/gm, '').trim();
    if (!cleanSql) {
      console.log('   ⏭️  Skipped (empty)\n');
      continue;
    }
    
    try {
      // Use the Supabase Management API to run migrations
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          sql: cleanSql
        })
      });

      if (response.ok) {
        console.log('   ✅ Applied successfully\n');
      } else {
        // Try direct SQL execution via different endpoint
        console.log('   ⚠️  Standard execution failed, trying alternative...');
        
        // Split into individual statements
        const statements = cleanSql.split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        let failed = false;
        for (const statement of statements) {
          // For ALTER TABLE specifically, we can check if column exists first
          if (statement.includes('ALTER TABLE') && statement.includes('ADD COLUMN')) {
            console.log(`   → Checking if migration needed...`);
            
            // Extract table and column name
            const tableMatch = statement.match(/ALTER TABLE\s+(\w+)/i);
            const columnMatch = statement.match(/ADD COLUMN\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
            
            if (tableMatch && columnMatch) {
              const tableName = tableMatch[1];
              const columnName = columnMatch[1];
              
              // Check if column exists
              const checkResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=${columnName}&limit=1`, {
                method: 'GET',
                headers: {
                  'apikey': supabaseServiceKey,
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                }
              });
              
              if (checkResponse.ok) {
                console.log(`   ✅ Column ${columnName} already exists\n`);
                continue;
              } else {
                console.log(`   📝 Column ${columnName} needs to be added`);
                console.log(`\n   ⚠️  Please run this in Supabase SQL Editor:`);
                console.log(`   ${statement};\n`);
                failed = true;
              }
            }
          }
        }
        
        if (!failed) {
          console.log('   ✅ No changes needed\n');
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('\n📝 Migration Summary:');
  console.log('=====================');
  console.log('Some migrations may need to be run manually in the Supabase Dashboard.');
  console.log('Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('\nSpecifically, run this SQL:');
  console.log('ALTER TABLE listings ADD COLUMN IF NOT EXISTS exterior_color VARCHAR(100);');
}

applyMigrations().catch(console.error);