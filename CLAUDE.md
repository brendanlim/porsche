# PorscheStats Development Rules

## IMPORTANT: Conversation Notes
**Check the `/notes` folder for detailed conversation history**
- Files are named `YYYYMMDD_task.md` (e.g., `20250907_scraping.md`)
- Contains what we tried, what worked, what failed, and lessons learned
- Update these notes periodically during long conversations
- Essential for resuming conversations and understanding context

## CRITICAL: Multi-Source Scraping
**THE SITE RELIES ON SCRAPING FROM ALL SOURCES, NOT JUST BAT**
- We need data from: Bring a Trailer, Classic.com, Cars.com, Edmunds, Cars and Bids, Autotrader, CarGurus
- DO NOT create one-off scripts for individual sources
- **⚠️ CRITICAL: Use `scrape-and-save.ts` NOT `scrape-all.ts`** - The original scrape-all.ts doesn't save to database!

## ⚠️ CRITICAL DATABASE LESSON (September 11, 2025)
**SCRAPERS MUST ACTUALLY SAVE TO THE DATABASE**
- Just returning parsed data is NOT enough - data must be INSERTed into database
- Every scraper run must save to database, not just count results
- ALWAYS verify with `SELECT COUNT(*) FROM listings` after scraping
- The original scrapers were storing HTML but NEVER saving parsed data to DB
- This caused "5957 listings scraped" but only 111 in database
- **For new scraping: Use `scrape-and-save.ts`**
- **For existing HTML: Use `parse-all-stored-html.ts`**
- **For cron jobs: Must use `scrape-and-save.ts`**

## ⚠️ VIN EXTRACTION ISSUE (September 11, 2025) - FIXED
**TWO DIFFERENT BAT SOURCES IN DATABASE**
- "bat" source: Old scraper, 43 listings, 100% have VINs
- "bring-a-trailer" source: New scraper, 5798 listings, only 0.5% have VINs (27/5798)
- **FIXED**: BaTScraperPuppeteer was limiting detail page fetching to `maxPages * 10`
- **FIXED**: Now fetches ALL detail pages to extract VINs

## ⚠️ OPTIONS DATA ISSUE (September 11, 2025)
**OPTIONS ARE NOT BEING STORED PROPERLY**
- 0% of listings have options in the database (0/5863 listings)
- **FIXED**: BaTScraperPuppeteer wasn't calling `extractOptions()` - now it does
- **STILL BROKEN**: Options should be stored relationally in `listing_options` table
- We have 31 predefined options in `options` table but 0 entries in `listing_options`
- The normalized options array is created but NEVER saved to `listing_options`
- **CRITICAL**: Data should be relational - options should link through `listing_options` table
- Currently only saving raw `options_text` to listings table, not creating relationships

## ⚠️ VIN HANDLING (September 12, 2025) - FIXED
**NEVER USE NULL VINS - ALWAYS PRESERVE VIN DATA**
- When a VIN already exists for a different listing URL (relisted car), UPDATE the existing record
- This preserves the VIN and tracks the car's history over time
- Update existing VIN records with newer price, mileage, sold_date when car is relisted
- Both scrape-and-save.ts and parse-all-stored-html.ts implement this strategy
- The wise solution: Update existing record when same VIN appears with different URL
- **FIXED**: Scripts now use UPSERT with onConflict: 'source_url' for proper duplicate handling

## ⚠️ CRITICAL: SOLD DATE vs SCRAPED DATE (September 12, 2025) - FIXED
**ANALYTICS MUST USE SOLD_DATE, NOT SCRAPED_AT**
- Analytics time ranges (7d, 30d, 90d, 1y) MUST filter by when cars actually SOLD
- Using scraped_at completely invalidates time-based analysis
- A car sold in 2022 but scraped today would incorrectly appear as a "recent sale"
- This distorts market trends, appreciation/depreciation, and all time-series data
- **FIXED**: Analytics API now filters by `sold_date` not `scraped_at`
- Only shows cars that actually sold within the selected time period
- Critical for accurate market analysis and price trends over time

## ⚠️ BRING A TRAILER BUYER FEES (September 17, 2025)
**ALL BRING A TRAILER PRICES MUST INCLUDE BUYER FEE**
- BaT charges buyers a 5% fee on top of the hammer price
- Fee is capped at $7,500 maximum
- The website shows hammer price ONLY - does NOT include the fee
- **TRUE SALE PRICE = Hammer Price + min(Hammer Price * 0.05, $7500)**
- All BaT scrapers automatically apply this fee
- Database tracks: `buyer_fee_amount`, `buyer_fee_applied`, `price_before_fee`
- Run `scripts/apply-bat-buyer-fees.ts` to update existing listings
- This ensures accurate price comparisons across all marketplaces

## NON-NEGOTIABLES - REQUIRED DATA FIELDS (September 12, 2025)
**Every listing MUST have these fields - NO EXCEPTIONS:**
- **VIN** - Vehicle Identification Number (NEVER null)
- **Mileage** - Odometer reading
- **Color** - Exterior color at minimum
- **Price** - Sale price INCLUDING buyer fees (not list price)
- **Options** - Raw options text
- **Listing Options** - Normalized options in listing_options table
- **Make** - Always "Porsche"
- **Model** - e.g., "911", "718"
- **Trim** - e.g., "GT3", "GT4 RS"
- **Year** - Model year
- **List Date** - When listing was created (ideally)
- **Sold Date** - When car sold (ideally)

## Golden Rules
1. **Storage is cheap, scraping is not** - Store everything (HTML, search pages, detail pages)
2. **HTML FILES ARE STORED IN SUPABASE STORAGE** - Bucket name: `raw-html` (NOT `scraped-html`)
3. **Organization**: Store in `raw-html` bucket as: `source/yyyymmdd/model/trim/type/filename.html`
   - Example: `bat/20250906/718-cayman/gt4/detail/listing_123.html`
   - Type is either `search` or `detail`
   - Date comes AFTER source for better organization
4. **Never store auction prices** - Only SOLD prices from completed sales
5. **NEVER USE FAKE/SEED DATA** - ABSOLUTELY NO random numbers, synthetic data points, or mock listings. If there's no real data, show nothing. NO generateMockListings, NO Math.random() for data, NO synthetic points!
6. **SPORTS CARS ONLY** - ABSOLUTELY NO SUVs (Cayenne, Macan), NO sedans (Panamera, Taycan) - EVER!
7. **FIX BUGS IMMEDIATELY** - If you notice you created a bug, FIX IT RIGHT AWAY. Don't wait for the user to tell you to fix it!

## Scraping Requirements
- Use Bright Data for ALL scraping (never curl)
- Implement proper pagination for all sources
- Fetch ALL models and ALL trims, not just a subset
- Store both search and detail pages separately
- Use Gemini for options normalization with the exact prompt from plan-backup.md

## BaT Scraping with Puppeteer
- **USE BRIGHT DATA SCRAPING BROWSER** for BaT to handle dynamic content
- BaT uses "Show More" button to load listings - must click it repeatedly
- Scraping Browser credentials: zone `pt_scraping_browser_z1`, password in env
- The BaTScraperPuppeteer properly clicks "Show More" button multiple times
- Extracts from both embedded JSON and dynamically loaded DOM content
- Button selector: `button.button.button-show-more[data-bind="click: loadNextPage"]`
- Check if button is visible before clicking (not in loading state)
- Successfully tested clicking 10+ times to load all listings

## Data Validation
- GT4 RS minimum price: $220,000
- GT3 RS minimum price: $300,000
- Generation mapping must be model-specific (718 vs 911)
- No bare generation codes (must be 992.1 or 992.2, never just "992")

## Database Migrations
- **Location**: Store all migrations in `/supabase/migrations/`
- **Naming**: Use format `XXX_description.sql` where XXX is a sequential number (001, 002, 003, etc.)
- **Check existing migrations first**: ALWAYS check what migrations already exist before creating new ones
- **Sequential numbering**: Never reuse or duplicate migration numbers
- **Current migrations**:
  - 001_initial_schema.sql - Base tables and schema
  - 002_raw_html_storage.sql - Storage bucket configuration
  - 003_add_generation_column.sql - Added generation column to listings

## Script Organization Rules
**ALWAYS organize scripts into proper subfolders:**
- `/scripts/setup/` - Initial setup and configuration scripts
- `/scripts/scraping/` - Data collection scripts (scrape-and-save.ts, etc.)
- `/scripts/data-processing/` - Data transformation and normalization
- `/scripts/maintenance/` - Cleanup and maintenance scripts  
- `/scripts/utilities/` - Utility scripts for checking data
- `/scripts/temp/` - **ONE-OFF SCRIPTS AND CHECKS** (e.g., check-specific-listing.ts)

**IMPORTANT:** 
- Never put scripts directly in `/scripts/` root - always use subfolders
- One-off debugging or checking scripts go in `/scripts/temp/`
- The temp folder should be periodically cleaned
- Always create scripts in the appropriate subfolder based on their purpose
- Main scraper path: `/scripts/scraping/scrape-and-save.ts`

## Remember
- The comprehensive scraper (`scrape-and-save.ts`) includes all sources - it's in `/scripts/scraping/`
- Don't create individual scraper scripts - enhance the existing comprehensive one
- All scrapers extend BaseScraper and follow the same pattern
- **NEVER DUPLICATE CORE PARSING LOGIC** - Each scraper class is the single source of truth for parsing its HTML
- Scripts must be designed for cron jobs - simple execution, clear parameters, no duplication
- Reparse functionality should ALWAYS reuse existing scraper methods, never reimplement parsing