# Scripts Organization

This directory contains all utility scripts for the PorscheTrends project, organized by purpose.

## Directory Structure

### 📂 `/setup`
Initial setup and configuration scripts
- `setup-database.js` - Initialize database schema
- `create-storage-bucket.ts` - Create Supabase storage buckets
- `apply-migrations.ts` - Apply database migrations
- `run-migration.ts` - Run specific migration files
- `deploy.sh` - Deployment script

### 📂 `/scraping`
Data collection scripts
- `scrape-and-save.ts` - Main scraper (all sources)
- `scrape-bat-90-days.ts` - Scrape last 90 days from BaT
- `daily-collection.ts` - Scheduled daily scraping

### 📂 `/data-processing`
Data transformation and normalization
- `parse-all-stored-html.ts` - Parse stored HTML files
- `normalize-database.ts` - Normalize existing database data
- `normalize-colors.ts` - Standardize color names
- `apply-bat-buyer-fees.ts` - Apply 5% buyer fees to BaT listings
- `populate-listing-options.ts` - Populate options relationships
- `extract-mileage.ts` - Extract mileage from listings
- `extract-vins-from-html.ts` - Extract VINs from stored HTML

### 📂 `/maintenance`
Cleanup and maintenance scripts
- `cleanup-old-storage.ts` - Remove old files from storage

### 📂 `/utilities`
Utility and checking scripts
- `check-all-data.ts` - Validate all data integrity
- `check-vins.ts` - Check VIN data completeness

## Common Usage

```bash
# Main scraping (all sources)
npx tsx scripts/scraping/scrape-and-save.ts

# Scrape specific model/trim
npx tsx scripts/scraping/scrape-and-save.ts --model=911 --trim=gt3

# Parse stored HTML
npx tsx scripts/data-processing/parse-all-stored-html.ts

# Clean up old storage
npx tsx scripts/maintenance/cleanup-old-storage.ts
```

## Notes
- All scripts use TypeScript and should be run with `npx tsx`
- Environment variables are loaded from `.env.local`
- Scripts require Supabase service role key for database access