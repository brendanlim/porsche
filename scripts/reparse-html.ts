import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import * as cheerio from 'cheerio';
import { supabaseAdmin } from '../lib/supabase/admin';
import { normalizeModelTrim } from '../lib/services/model-trim-normalizer';
import { BaTScraper } from '../lib/scrapers/bat';
import { ClassicScraper } from '../lib/scrapers/classic';
import { EdmundsScraper } from '../lib/scrapers/edmunds';
import { CarsAndBidsScraper } from '../lib/scrapers/carsandbids';
// import { CarsComScraper } from '../lib/scrapers/carscom';
// import { CarGurusScraper } from '../lib/scrapers/cargurus';
// import { AutotraderScraper } from '../lib/scrapers/autotrader';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  source: '',
  date: '',
  model: '',
  trim: '',
  type: 'detail', // detail or search
  dryRun: false,
  limit: 0,
  help: false
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--source':
    case '-s':
      options.source = args[++i];
      break;
    case '--date':
    case '-d':
      options.date = args[++i];
      break;
    case '--model':
    case '-m':
      options.model = args[++i];
      break;
    case '--trim':
    case '-t':
      options.trim = args[++i];
      break;
    case '--type':
      options.type = args[++i];
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--limit':
    case '-l':
      options.limit = parseInt(args[++i]);
      break;
    case '--help':
    case '-h':
      options.help = true;
      break;
  }
}

if (options.help) {
  console.log(`
Reparse stored HTML files and update database

Usage: npx tsx scripts/reparse-html.ts [options]

Options:
  --source, -s <source>  Source to reparse (bat, classic, edmunds, carsandbids, carscom, cargurus, autotrader)
  --date, -d <date>      Date folder to process (e.g., 20250906)
  --model, -m <model>    Model folder to process (e.g., "718-cayman", "911")
  --trim, -t <trim>      Trim folder to process (e.g., "gt4", "gt3")
  --type <type>          Type of HTML to reparse (detail or search, default: detail)
  --dry-run              Preview what would be parsed without saving to database
  --limit, -l <n>        Limit number of files to process
  --help, -h             Show this help message

Examples:
  # Reparse all BaT detail pages from today
  npx tsx scripts/reparse-html.ts --source bat --date 20250906

  # Reparse specific model/trim
  npx tsx scripts/reparse-html.ts --source bat --model 718-cayman --trim gt4

  # Dry run to preview changes
  npx tsx scripts/reparse-html.ts --source classic --dry-run --limit 10

  # Reparse all stored HTML files (no filters)
  npx tsx scripts/reparse-html.ts
`);
  process.exit(0);
}

// Get the appropriate scraper for each source
function getScraperForSource(source: string): any {
  switch (source) {
    case 'bat':
      return new BaTScraper();
    case 'classic':
      return new ClassicScraper();
    case 'edmunds':
      return new EdmundsScraper();
    case 'carsandbids':
      return new CarsAndBidsScraper();
    // case 'carscom':
    //   return new CarsComScraper();
    // case 'cargurus':
    //   return new CarGurusScraper();
    // case 'autotrader':
    //   return new AutotraderScraper();
    default:
      console.warn(`Scraper not implemented for source: ${source}`);
      return null;
  }
}

async function findHtmlFiles(pattern: {
  source?: string;
  date?: string;
  model?: string;
  trim?: string;
  type?: string;
}): Promise<Array<{name: string, path: string}>> {
  const files: Array<{name: string, path: string}> = [];
  
  try {
    // Recursively list files in subdirectories
    async function listFilesRecursive(prefix: string = '', depth: number = 0): Promise<void> {
      if (depth === 0) {
        console.log(`Searching in raw-html bucket...`);
      }
      
      const { data: items, error } = await supabaseAdmin.storage
        .from('raw-html')
        .list(prefix, {
          limit: 1000,
          offset: 0
        });
      
      if (error) {
        console.error(`Error listing ${prefix}:`, error);
        return;
      }
      
      if (!items) return;
      
      if (depth <= 2) {
        console.log(`  ${'  '.repeat(depth)}Checking ${prefix || '/'}: ${items.length} items`);
      }
      
      for (const item of items) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        
        // Check if this is a file (has id) or folder (no id)
        const isFile = !!item.id;
        
        if (isFile && item.name.endsWith('.html')) {
          // This is an HTML file - apply filters
          let include = true;
          
          if (pattern.source && !fullPath.startsWith(pattern.source)) {
            include = false;
          }
          
          if (pattern.date && !fullPath.includes(pattern.date)) {
            include = false;
          }
          
          if (pattern.type && !fullPath.includes(pattern.type)) {
            include = false;
          }
          
          if (pattern.model) {
            const modelNorm = pattern.model.toLowerCase().replace(/\s+/g, '-');
            if (!fullPath.toLowerCase().includes(modelNorm)) {
              include = false;
            }
          }
          
          if (pattern.trim) {
            const trimNorm = pattern.trim.toLowerCase().replace(/\s+/g, '-');
            if (!fullPath.toLowerCase().includes(trimNorm)) {
              include = false;
            }
          }
          
          if (include) {
            files.push({ name: item.name, path: fullPath });
          }
        } else if (!isFile) {
          // This is a folder - recurse into it if it matches filters
          let shouldRecurse = true;
          
          // If we have a source filter and this is the root level, check it
          if (pattern.source && prefix === '' && item.name !== pattern.source) {
            shouldRecurse = false;
          }
          
          if (shouldRecurse) {
            await listFilesRecursive(fullPath, depth + 1);
          }
        }
      }
    }
    
    // Start recursion from root
    await listFilesRecursive('');
    
    if (files.length === 0) {
      console.log('No HTML files found matching the criteria.');
      console.log('Note: Files are organized as source/model/date/type/*.html in the raw-html bucket');
    }
  } catch (error) {
    console.error('Error accessing Supabase storage:', error);
  }
  
  return files;
}

async function reparseFile(filePath: string, scraper: any): Promise<any> {
  try {
    // Download HTML from Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from('raw-html')
      .download(filePath);
    
    if (error) {
      console.error(`Error downloading ${filePath}:`, error);
      return null;
    }
    
    if (!data) {
      console.error(`No data for ${filePath}`);
      return null;
    }
    
    // Convert blob to text
    const html = await data.text();
    
    // Determine if this is a detail or search page
    const isDetail = filePath.includes('/detail/');
    
    if (!isDetail) {
      console.log(`  Skipping search page: ${filePath.split('/').pop()}`);
      return null;
    }
    
    // Extract URL from HTML
    const $ = cheerio.load(html);
    const url = extractUrlFromHtml($) || 'https://example.com';
    
    // Use scraper's existing parsing logic
    if (scraper && typeof scraper.scrapeDetail === 'function') {
      // Override fetchUrl to return our stored HTML instead of fetching from web
      const originalFetch = scraper.fetchUrl;
      const originalStoreHtml = scraper.storeHtml;
      
      // Mock the fetch to return our stored HTML
      scraper.fetchUrl = async () => html;
      // Mock storeHtml to do nothing (we already have the HTML stored)
      scraper.storeHtml = async () => ({ path: filePath, url: '' });
      
      // Use the scraper's existing parsing logic
      const result = await scraper.scrapeDetail(url);
      
      // Restore original methods
      scraper.fetchUrl = originalFetch;
      scraper.storeHtml = originalStoreHtml;
      
      // Add source from the file path (e.g., "bat" from "bat/718-cayman/...")
      if (result) {
        const pathParts = filePath.split('/');
        result.source = pathParts[0]; // First part is the source
      }
      
      return result;
    }
    
    console.log(`  No scraper available for reparsing`);
    return null;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

function extractUrlFromHtml($: cheerio.CheerioAPI): string | null {
  // Try to extract original URL from meta tags or other sources
  const ogUrl = $('meta[property="og:url"]').attr('content');
  if (ogUrl) return ogUrl;
  
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) return canonical;
  
  return null;
}

async function saveToDatabase(listing: any): Promise<void> {
  try {
    // Normalize model and trim using Gemini
    const modelTrimResult = await normalizeModelTrim(listing.title);
    
    if (!modelTrimResult || !modelTrimResult.model) {
      console.log(`    Skipping non-sports car: ${listing.title}`);
      return;
    }
    
    // Prepare listing data
    const listingData = {
      title: listing.title,
      price: listing.price,
      year: listing.year || modelTrimResult.year,
      mileage: listing.mileage,
      vin: listing.vin,
      source: listing.source,
      source_url: listing.source_url,
      model: modelTrimResult.model,
      trim: modelTrimResult.trim,
      generation: modelTrimResult.generation,
      exterior_color: listing.exterior_color,
      interior_color: listing.interior_color,
      transmission: listing.transmission,
      status: listing.status,
      scraped_at: new Date().toISOString()
    };
    
    // Upsert - update if exists (by source_url), insert if new
    const { error } = await supabaseAdmin
      .from('listings')
      .upsert(listingData, {
        onConflict: 'source_url'
      });
    
    if (error) {
      console.error(`    Failed to save: ${error.message}`);
    } else {
      console.log(`    ✓ Saved: ${modelTrimResult.model} ${modelTrimResult.trim || ''} - $${listing.price?.toLocaleString() || 'N/A'}`);
    }
  } catch (error) {
    console.error(`    Error saving listing:`, error);
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('HTML REPARSE UTILITY');
  console.log('='.repeat(60));
  
  // Build filter summary
  const filters: string[] = [];
  if (options.source) filters.push(`source=${options.source}`);
  if (options.date) filters.push(`date=${options.date}`);
  if (options.model) filters.push(`model=${options.model}`);
  if (options.trim) filters.push(`trim=${options.trim}`);
  if (options.type) filters.push(`type=${options.type}`);
  if (options.dryRun) filters.push('DRY RUN');
  if (options.limit) filters.push(`limit=${options.limit}`);
  
  console.log(`Filters: ${filters.length > 0 ? filters.join(', ') : 'none (processing all files)'}`);
  console.log('='.repeat(60) + '\n');
  
  // Find HTML files in Supabase storage
  const files = await findHtmlFiles(options);
  
  if (files.length === 0) {
    console.log('No HTML files found matching the criteria.');
    return;
  }
  
  console.log(`Found ${files.length} HTML files to process`);
  if (options.limit > 0) {
    console.log(`Processing first ${options.limit} files only`);
  }
  console.log();
  
  // Group files by source
  const filesBySource: Record<string, Array<{name: string, path: string}>> = {};
  for (const file of files) {
    // Extract source from path (first directory)
    const source = file.path.split('/')[0];
    
    if (!filesBySource[source]) {
      filesBySource[source] = [];
    }
    filesBySource[source].push(file);
  }
  
  // Process files
  let totalProcessed = 0;
  let totalSaved = 0;
  const maxFiles = options.limit || files.length;
  
  for (const [source, sourceFiles] of Object.entries(filesBySource)) {
    if (totalProcessed >= maxFiles) break;
    
    console.log(`\nProcessing ${source.toUpperCase()} files (${sourceFiles.length} files):`);
    console.log('-'.repeat(40));
    
    try {
      const scraper = getScraperForSource(source);
      
      if (!scraper) {
        console.log(`  Skipping ${source} - scraper not implemented`);
        continue;
      }
      
      for (const file of sourceFiles) {
        if (totalProcessed >= maxFiles) break;
        
        console.log(`\nFile ${totalProcessed + 1}: ${file.name}`);
        
        const result = await reparseFile(file.path, scraper);
        
        if (result) {
          if (options.dryRun) {
            console.log(`  [DRY RUN] Would save: ${result.title}`);
            console.log(`    Price: $${result.price?.toLocaleString() || 'N/A'}`);
            console.log(`    Year: ${result.year || 'N/A'}`);
            console.log(`    Mileage: ${result.mileage?.toLocaleString() || 'N/A'}`);
          } else {
            await saveToDatabase(result);
            totalSaved++;
          }
        } else {
          console.log(`  Skipped: No valid data extracted`);
        }
        
        totalProcessed++;
      }
    } catch (error) {
      console.error(`Failed to process ${source} files:`, error);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('REPARSE COMPLETE');
  console.log(`Files processed: ${totalProcessed}`);
  if (!options.dryRun) {
    console.log(`Listings saved: ${totalSaved}`);
  }
  console.log('='.repeat(60));
}

main().catch(console.error);