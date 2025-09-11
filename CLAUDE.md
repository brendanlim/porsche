# PorscheTrends Development Rules

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

## Remember
- The comprehensive scraper (`scrape-all.ts`) already exists and includes all sources
- Don't create individual scraper scripts - enhance the existing comprehensive one
- All scrapers extend BaseScraper and follow the same pattern
- **NEVER DUPLICATE CORE PARSING LOGIC** - Each scraper class is the single source of truth for parsing its HTML
- Scripts must be designed for cron jobs - simple execution, clear parameters, no duplication
- Reparse functionality should ALWAYS reuse existing scraper methods, never reimplement parsing