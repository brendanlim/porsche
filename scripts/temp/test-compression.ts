#!/usr/bin/env npx tsx

/**
 * Test if compression is actually working
 */

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

async function testCompression() {
  // Load environment variables
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const dotenv = await import('dotenv');
    dotenv.config({ path: envPath });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🧪 TESTING COMPRESSION\n');
  console.log('=' .repeat(60));

  // Check recent HTML storage to see if compression is working
  console.log('\n📊 Checking recent HTML storage...\n');

  const { data: recentHTML } = await supabase
    .from('raw_html_cache')
    .select('url, file_size, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!recentHTML || recentHTML.length === 0) {
    console.log('❌ No HTML cache entries found');
    return;
  }

  console.log(`Found ${recentHTML.length} recent HTML cache entries:\n`);

  let totalOriginal = 0;
  let totalCompressed = 0;
  let compressedCount = 0;

  recentHTML.forEach((entry, i) => {
    const url = entry.url.substring(0, 60) + '...';
    const size = (entry.file_size / 1024).toFixed(1) + 'KB';
    const isCompressed = entry.metadata?.compressed === true;
    const originalSize = entry.metadata?.originalSize || entry.file_size;
    const compressionRatio = entry.metadata?.compressionRatio || '0%';

    console.log(`${i + 1}. ${url}`);
    console.log(`   Size: ${size} | Compressed: ${isCompressed ? '✅' : '❌'}`);

    if (isCompressed) {
      console.log(`   Original: ${(originalSize / 1024).toFixed(1)}KB → ${size} (${compressionRatio} reduction)`);
      console.log(`   Savings: ${((originalSize - entry.file_size) / 1024).toFixed(1)}KB`);
      compressedCount++;
    }

    console.log(`   Date: ${new Date(entry.created_at).toLocaleString()}\n`);

    totalOriginal += originalSize;
    totalCompressed += entry.file_size;
  });

  // Summary
  console.log('=' .repeat(60));
  console.log('\n📊 COMPRESSION SUMMARY:\n');
  console.log(`  Files analyzed: ${recentHTML.length}`);
  console.log(`  Files compressed: ${compressedCount}/${recentHTML.length} (${Math.round(compressedCount/recentHTML.length * 100)}%)`);
  console.log(`  Total original size: ${(totalOriginal / 1024).toFixed(1)}KB`);
  console.log(`  Total compressed size: ${(totalCompressed / 1024).toFixed(1)}KB`);

  if (compressedCount > 0) {
    const overallReduction = ((totalOriginal - totalCompressed) / totalOriginal * 100).toFixed(1);
    console.log(`  Overall reduction: ${overallReduction}%`);
    console.log(`  Space saved: ${((totalOriginal - totalCompressed) / 1024).toFixed(1)}KB`);
  }

  // Check if deduplication is working
  console.log('\n' + '=' .repeat(60));
  console.log('\n🔍 DEDUPLICATION CHECK:\n');

  const { data: duplicates } = await supabase
    .from('raw_html_cache')
    .select('url, count')
    .select('*', { count: 'exact', head: false });

  const urlCounts = new Map();
  duplicates?.forEach(entry => {
    const count = urlCounts.get(entry.url) || 0;
    urlCounts.set(entry.url, count + 1);
  });

  const duplicatedUrls = Array.from(urlCounts.entries())
    .filter(([url, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (duplicatedUrls.length > 0) {
    console.log('⚠️  Found duplicate URLs (same page fetched multiple times):');
    duplicatedUrls.forEach(([url, count]) => {
      console.log(`  ${count}x: ${url.substring(0, 60)}...`);
    });
    console.log('\n  💡 These duplicates should be avoided with proper deduplication!');
  } else {
    console.log('✅ No duplicate URLs found - deduplication may be working!');
  }

  // Estimate monthly costs
  console.log('\n' + '=' .repeat(60));
  console.log('\n💰 COST ANALYSIS:\n');

  const avgOriginalSize = totalOriginal / recentHTML.length;
  const avgCompressedSize = totalCompressed / recentHTML.length;
  const pagesPerMonth = 30000; // Estimated

  const uncompressedCost = (pagesPerMonth * avgOriginalSize / (1024 * 1024 * 1024)) * 8;
  const compressedCost = (pagesPerMonth * avgCompressedSize / (1024 * 1024 * 1024)) * 8;

  console.log(`  Average page size: ${(avgOriginalSize / 1024).toFixed(1)}KB`);
  console.log(`  After compression: ${(avgCompressedSize / 1024).toFixed(1)}KB`);
  console.log(`  Monthly pages: ~${pagesPerMonth.toLocaleString()}`);
  console.log(`  Without compression: $${uncompressedCost.toFixed(2)}/month`);
  console.log(`  With compression: $${compressedCost.toFixed(2)}/month`);
  console.log(`  Compression savings: $${(uncompressedCost - compressedCost).toFixed(2)}/month`);

  console.log('\n✨ RECOMMENDATIONS:');
  if (compressedCount === 0) {
    console.log('  ❌ Compression is NOT working - fix immediately!');
  } else if (compressedCount < recentHTML.length) {
    console.log('  ⚠️  Some files are not being compressed - check compression logic');
  } else {
    console.log('  ✅ Compression is working properly');
  }

  if (duplicatedUrls.length > 5) {
    console.log('  ❌ High duplicate rate - deduplication needed urgently!');
  } else if (duplicatedUrls.length > 0) {
    console.log('  ⚠️  Some duplicates found - deduplication could help');
  } else {
    console.log('  ✅ No duplicates - deduplication working or not needed');
  }
}

testCompression().catch(console.error);