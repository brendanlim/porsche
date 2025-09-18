#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Loaded environment variables from .env.local');
}

// Create Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function cleanupOldStorage() {
  console.log('='.repeat(80));
  console.log('STORAGE CLEANUP - REMOVING FILES OLDER THAN 2025-09-10');
  console.log('='.repeat(80));
  
  const cutoffDate = new Date('2025-09-10T00:00:00Z');
  console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
  console.log('Files created before this date will be deleted\n');
  
  try {
    // List all files in the raw-html bucket
    console.log('📂 Fetching files from raw-html bucket...');
    
    let hasMore = true;
    let offset = 0;
    const limit = 1000;
    let totalFiles = 0;
    let deletedFiles = 0;
    let totalSize = 0;
    let deletedSize = 0;
    
    while (hasMore) {
      const { data: files, error } = await supabaseAdmin.storage
        .from('raw-html')
        .list('', {
          limit,
          offset,
          sortBy: { column: 'created_at', order: 'asc' }
        });
      
      if (error) {
        console.error('Error listing files:', error);
        return;
      }
      
      if (!files || files.length === 0) {
        hasMore = false;
        continue;
      }
      
      totalFiles += files.length;
      
      // Process each file
      for (const file of files) {
        if (!file.created_at) continue;
        
        const fileDate = new Date(file.created_at);
        totalSize += file.metadata?.size || 0;
        
        if (fileDate < cutoffDate) {
          // Delete the file
          const { error: deleteError } = await supabaseAdmin.storage
            .from('raw-html')
            .remove([file.name]);
          
          if (deleteError) {
            console.error(`  ❌ Failed to delete ${file.name}: ${deleteError.message}`);
          } else {
            deletedFiles++;
            deletedSize += file.metadata?.size || 0;
            const sizeInMB = ((file.metadata?.size || 0) / (1024 * 1024)).toFixed(2);
            console.log(`  🗑️  Deleted: ${file.name} (${sizeInMB} MB, created: ${fileDate.toISOString().split('T')[0]})`);
          }
        }
      }
      
      if (files.length < limit) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }
    
    // Now clean up folders/prefixes
    console.log('\n📂 Cleaning up empty folders...');
    
    // List all prefixes/folders
    const folders = new Set<string>();
    const { data: allFiles } = await supabaseAdmin.storage
      .from('raw-html')
      .list('', { limit: 10000 });
    
    if (allFiles) {
      for (const file of allFiles) {
        const parts = file.name.split('/');
        for (let i = 1; i <= parts.length - 1; i++) {
          folders.add(parts.slice(0, i).join('/'));
        }
      }
    }
    
    // Try to delete empty folders
    for (const folder of folders) {
      const { data: folderContents } = await supabaseAdmin.storage
        .from('raw-html')
        .list(folder, { limit: 1 });
      
      if (!folderContents || folderContents.length === 0) {
        console.log(`  📁 Empty folder found: ${folder}`);
      }
    }
    
    // DO NOT DELETE DATABASE RECORDS - ONLY STORAGE FILES
    console.log('\n⚠️  Database records are preserved (only storage files are deleted)')
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('CLEANUP COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total files processed: ${totalFiles}`);
    console.log(`Files deleted: ${deletedFiles}`);
    console.log(`Storage freed: ${(deletedSize / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`Storage remaining: ${((totalSize - deletedSize) / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    
  } catch (error) {
    console.error('Fatal error during cleanup:', error);
  }
}

// Run the cleanup
cleanupOldStorage().catch(console.error);