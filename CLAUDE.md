# PorscheStats Development Guide

## 🚨 ALWAYS CHECK `/notes/` FOLDER FIRST
**Before starting ANY work, read relevant notes in `/notes/` directory**
- Contains lessons learned, what works, what failed
- Files: `YYYYMMDD_task.md` (e.g., `20250923_scraping_mileage_fixes.md`)
- **DO NOT REPEAT PAST MISTAKES** - Learn from documented issues
- Update notes after significant work

## Critical Rules

### Database Safety
- **ALWAYS CREATE BACKUP BEFORE DESTRUCTIVE OPERATIONS**
- Run `npx tsx scripts/backup/backup-database.ts` before:
  - Bulk updates or deletions
  - Schema changes
  - Data migrations
  - Any operation affecting >10 records
- To restore: `npx tsx scripts/backup/restore-database.ts [backup-name]`
- Backups stored in `/backups/` (gitignored)

### Scraping
- **Primary scraper:** `/scripts/scraping/scrape-and-save.ts` (USE THIS)
- **Daily workflow:** Daily Data Collection at 3 AM UTC
- **Data validation:** Mileage limits per year (GT cars: 10k, Regular: 25k)
- **Multiple sources required:** BaT, Classic.com, Cars.com, Edmunds, Cars and Bids
- **Store everything:** HTML in Supabase `raw-html` bucket
- **VIN handling:** UPDATE existing records, never duplicate

### Database
- **Verify saves:** Always check `SELECT COUNT(*) FROM listings` after scraping
- **Required fields:** VIN, mileage, price (with fees), color, model, trim, year
- **BaT fees:** Add 5% buyer fee (capped at $7,500) to all BaT prices
- **Date filtering:** Use `sold_date` NOT `scraped_at` for analytics

### Development
- **NO FAKE DATA:** Never use Math.random() or mock data
- **Sports cars only:** No SUVs (Cayenne/Macan) or sedans (Panamera/Taycan)
- **Fix bugs immediately:** Don't wait to be told
- **Script organization:** Use proper subfolders (`/scripts/scraping/`, `/scripts/analytics/`, etc.)
- **NO ONE-OFF SCRIPTS:** Use reusable scripts with CLI arguments instead of creating temp scripts
  - Test narratives: `npx tsx scripts/analytics/test-narrative.ts --model="911" --trim="GT3" --generation="996"`
  - Update narratives: `npx tsx scripts/analytics/update-market-narratives.ts --model="911" --trim="GT3"`
  - Clean up `/scripts/temp/` regularly

### Data Validation
- GT4 RS min price: $220,000
- GT3 RS min price: $300,000
- Mileage validation: GT cars max 10k/year, regular max 25k/year
- Generation codes: Must be specific (992.1, not 992)

## Quick Reference

### Key Paths
- Main scraper: `/scripts/scraping/scrape-and-save.ts`
- Workflows: `.github/workflows/daily-scraping.yml`
- Migrations: `/supabase/migrations/`
- Notes: `/notes/YYYYMMDD_task.md`

### Common Commands
```bash
# Run scraper locally
npx tsx scripts/scraping/scrape-and-save.ts --source=bat --max-pages=2

# Check database
npx tsx scripts/temp/check-db-status.ts

# Trigger GitHub workflow
gh workflow run "Daily Data Collection" -f source=bat -f max_pages=2
```

### Environment Variables
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Bright Data: `BRIGHT_DATA_CUSTOMER_ID`, `BRIGHT_DATA_BROWSER_PASSWORD`

## Remember
- Check `/notes/` first for context
- Use existing scrapers, don't create new ones
- Validate all data before saving
- Update notes after significant changes
- never push without validating if the build has no errors