#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function restoreDatabase(backupName?: string) {
  // List available backups if no name provided
  const backupsDir = path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupsDir)) {
    console.error('❌ No backups directory found');
    process.exit(1);
  }

  const availableBackups = fs.readdirSync(backupsDir)
    .filter(dir => fs.statSync(path.join(backupsDir, dir)).isDirectory())
    .sort()
    .reverse();

  if (availableBackups.length === 0) {
    console.error('❌ No backups found');
    process.exit(1);
  }

  if (!backupName) {
    console.log('📦 Available backups:');
    availableBackups.forEach((backup, index) => {
      const metadataPath = path.join(backupsDir, backup, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        console.log(`  ${index + 1}. ${backup} (${metadata.total_records.toLocaleString()} records)`);
      } else {
        console.log(`  ${index + 1}. ${backup}`);
      }
    });

    const choice = await askQuestion('\nEnter backup number to restore (or "cancel" to exit): ');

    if (choice.toLowerCase() === 'cancel') {
      console.log('Restore cancelled');
      process.exit(0);
    }

    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= availableBackups.length) {
      console.error('❌ Invalid selection');
      process.exit(1);
    }

    backupName = availableBackups[index];
  }

  const backupDir = path.join(backupsDir, backupName);

  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Backup not found: ${backupName}`);
    process.exit(1);
  }

  // Load metadata
  const metadataPath = path.join(backupDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error('❌ Backup metadata not found');
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  console.log(`\n🔄 RESTORE FROM BACKUP: ${backupName}`);
  console.log('━'.repeat(60));
  console.log(`📊 Total records to restore: ${metadata.total_records.toLocaleString()}`);
  console.log(`📅 Backup created: ${metadata.timestamp}`);
  console.log('\n⚠️  WARNING: This will REPLACE all current data!');
  console.log('━'.repeat(60));

  const confirm = await askQuestion('\nType "RESTORE" to confirm (or anything else to cancel): ');

  if (confirm !== 'RESTORE') {
    console.log('❌ Restore cancelled');
    process.exit(0);
  }

  console.log('\n🚀 Starting restore...\n');

  const tables = Object.keys(metadata.tables);
  let totalRestored = 0;

  for (const table of tables) {
    const filePath = path.join(backupDir, `${table}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${table} (no backup file)`);
      continue;
    }

    console.log(`📊 Restoring table: ${table}`);

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`  ⏭️  No data to restore`);
        continue;
      }

      // Clear existing data
      console.log(`  🗑️  Clearing existing data...`);
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .gte('id', 0); // Delete all records

      if (deleteError && !deleteError.message.includes('no rows')) {
        console.error(`  ❌ Error clearing ${table}:`, deleteError.message);
        continue;
      }

      // Restore in batches
      const batchSize = 100;
      let restored = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        const { error: insertError } = await supabase
          .from(table)
          .insert(batch);

        if (insertError) {
          console.error(`  ❌ Error restoring batch:`, insertError.message);
        } else {
          restored += batch.length;
          console.log(`  📥 Restored ${restored}/${data.length} records`);
        }
      }

      totalRestored += restored;
      console.log(`  ✅ Restored ${restored} records to ${table}\n`);
    } catch (error) {
      console.error(`  ❌ Failed to restore ${table}:`, error);
    }
  }

  console.log('━'.repeat(60));
  console.log('✅ RESTORE COMPLETE!');
  console.log('━'.repeat(60));
  console.log(`📊 Total records restored: ${totalRestored.toLocaleString()}`);

  rl.close();
}

// Get backup name from command line argument
const backupName = process.argv[2];

// Run restore
restoreDatabase(backupName)
  .catch(error => {
    console.error('❌ Restore failed:', error);
    rl.close();
    process.exit(1);
  });