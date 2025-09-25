#!/usr/bin/env npx tsx
/**
 * Test script to verify the scraper disconnect fixes
 *
 * This will run a small test to ensure:
 * 1. HTML is still being cached properly
 * 2. Listings are being saved to database
 * 3. Better error handling is working
 * 4. Partial results are preserved even if scraper fails
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
async function loadEnvironmentVariables() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    try {
      const dotenv = await import('dotenv');
      dotenv.config({ path: envPath });
      console.log('✅ Loaded environment variables');
    } catch (error) {
      console.log('Using system environment variables');
    }
  }
}

async function main() {
  await loadEnvironmentVariables();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('🧪 TESTING SCRAPER FIXES');
  console.log('━'.repeat(80));

  // Get baseline counts
  console.log('📊 Getting baseline counts...');

  const { data: htmlCountBefore } = await supabase
    .from('raw_html_cache')
    .select('*', { count: 'exact', head: true });

  const { data: listingsCountBefore } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });

  console.log(`Baseline - HTML cache: ${htmlCountBefore?.length || 0}, Listings: ${listingsCountBefore?.length || 0}`);

  // Test with a small scraper run
  console.log('\\n🚀 Running test scraper (BaT only, 1 page)...');

  try {
    // Import and run the main scraper with limited scope
    const { spawn } = await import('child_process');

    const testCommand = 'npx tsx scripts/scraping/scrape-and-save.ts --source=bat --max-pages=1';
    console.log(`Command: ${testCommand}`);

    const startTime = Date.now();

    const child = spawn('npx', ['tsx', 'scripts/scraping/scrape-and-save.ts', '--source=bat', '--max-pages=1'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(text.trim());
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(text.trim());
    });

    // Wait for completion with timeout
    const result = await new Promise<number>((resolve) => {
      child.on('close', (code) => {
        resolve(code || 0);
      });

      // 5 minute timeout
      setTimeout(() => {
        console.error('⏰ Test timed out after 5 minutes');
        child.kill();
        resolve(-1);
      }, 5 * 60 * 1000);
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\\n⏱️  Test completed in ${duration} seconds`);

    // Check results
    console.log('\\n📊 Checking post-test counts...');

    const { data: htmlCountAfter } = await supabase
      .from('raw_html_cache')
      .select('*', { count: 'exact', head: true });

    const { data: listingsCountAfter } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    const htmlDiff = (htmlCountAfter?.length || 0) - (htmlCountBefore?.length || 0);
    const listingsDiff = (listingsCountAfter?.length || 0) - (listingsCountBefore?.length || 0);

    console.log(`After test - HTML cache: ${htmlCountAfter?.length || 0} (+${htmlDiff}), Listings: ${listingsCountAfter?.length || 0} (+${listingsDiff})`);

    // Analyze results
    console.log('\\n🔍 ANALYSIS:');
    console.log('━'.repeat(60));

    if (result === 0) {
      console.log('✅ Scraper completed successfully (exit code 0)');
    } else if (result === -1) {
      console.log('❌ Scraper timed out');
    } else {
      console.log(`⚠️ Scraper exited with code ${result}`);
    }

    if (htmlDiff > 0 && listingsDiff > 0) {
      console.log('✅ GOOD: Both HTML and listings were added');
      console.log('✅ Fix appears to be working correctly');
    } else if (htmlDiff > 0 && listingsDiff === 0) {
      console.log('❌ BAD: HTML was cached but no listings saved');
      console.log('❌ The disconnect issue is still occurring');
    } else if (htmlDiff === 0 && listingsDiff === 0) {
      console.log('❓ UNCLEAR: No new HTML or listings (may be no new data available)');
    } else {
      console.log('❓ UNEXPECTED: Listings added without HTML (unusual pattern)');
    }

    // Check for error patterns in output
    if (output.includes('❌') || errorOutput.length > 0) {
      console.log('\\n⚠️ Errors detected in output:');
      if (output.includes('Too many consecutive errors')) {
        console.log('  • Hit error limit during detail fetching');
      }
      if (output.includes('timeout')) {
        console.log('  • Timeout issues detected');
      }
      if (output.includes('failed:')) {
        console.log('  • Scraper failures detected');
      }
    } else {
      console.log('✅ No obvious errors in scraper output');
    }

    console.log('\\n💡 RECOMMENDATIONS:');
    console.log('━'.repeat(60));
    if (htmlDiff > 0 && listingsDiff > 0) {
      console.log('✅ Scraper fixes are working - monitor production runs');
    } else {
      console.log('❌ Additional debugging needed - check logs for specific errors');
    }

    console.log('Monitor next production runs with: npx tsx scripts/temp/check-recent-runs.ts');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);