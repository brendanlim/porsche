#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(process.cwd(), 'backups', timestamp);

  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`🔒 Starting database backup: ${timestamp}`);
  console.log(`📁 Backup directory: ${backupDir}`);
  console.log('━'.repeat(60));

  const tables = [
    'listings',
    'listing_options',
    'options',
    'price_predictions',
    'trend_snapshots'
  ];

  let totalRecords = 0;
  const summary: Record<string, number> = {};

  for (const table of tables) {
    console.log(`\n📊 Backing up table: ${table}`);

    try {
      // Fetch all data from the table
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error(`  ❌ Error fetching ${table}:`, error.message);
          break;
        }

        if (data && data.length > 0) {
          allData = allData.concat(data);
          console.log(`  📥 Fetched ${data.length} records (total: ${allData.length})`);
          page++;
        } else {
          hasMore = false;
        }

        // Check if we've fetched all records
        if (count && allData.length >= count) {
          hasMore = false;
        }
      }

      // Save to JSON file
      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));

      summary[table] = allData.length;
      totalRecords += allData.length;

      console.log(`  ✅ Saved ${allData.length} records to ${table}.json`);
    } catch (error) {
      console.error(`  ❌ Failed to backup ${table}:`, error);
    }
  }

  // Create metadata file
  const metadata = {
    timestamp,
    database_url: supabaseUrl,
    tables: summary,
    total_records: totalRecords,
    backup_version: '1.0.0'
  };

  fs.writeFileSync(
    path.join(backupDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log('\n' + '━'.repeat(60));
  console.log('✅ BACKUP COMPLETE!');
  console.log('━'.repeat(60));
  console.log('📊 Summary:');
  Object.entries(summary).forEach(([table, count]) => {
    console.log(`  • ${table}: ${count.toLocaleString()} records`);
  });
  console.log(`\n📦 Total: ${totalRecords.toLocaleString()} records`);
  console.log(`📁 Location: ${backupDir}`);

  return backupDir;
}

// Run backup
backupDatabase()
  .then(dir => {
    console.log(`\n💡 Tip: To restore from this backup, run:`);
    console.log(`   npx tsx scripts/backup/restore-database.ts ${path.basename(dir)}`);
  })
  .catch(error => {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  });