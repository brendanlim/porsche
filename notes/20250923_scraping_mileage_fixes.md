# September 23, 2025 - Scraping & Mileage Validation Fixes

## Issues Fixed

### 1. GitHub Actions Scraping Workflows
**Problem:** Workflows failing with dotenv import errors and timeouts
**Solution:**
- Fixed async dotenv imports with conditional loading for production
- Increased timeouts: 90min for index scraping, 60min for details
- Removed redundant workflows (scrape-index.yml, scrape-details.yml)
- Daily Data Collection is the primary workflow at 3 AM UTC

**Key Learning:** Use conditional imports for dotenv to avoid production failures:
```typescript
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
} catch (error) {
  // Production environment
}
```

### 2. GT4 RS Mileage Data Issue
**Problem:** GT4 RS listings showing 425k and 283k miles (impossible for 2024 models)
**Root Cause:** BaT scraper parsing error adding extra zeros to mileage

**Solution:**
- Fixed existing bad data by dividing by 100 (4,253 and 2,835 miles)
- Added smart validation in scrape-and-save.ts

**Validation Rules (Generous to avoid false positives):**
- GT cars (GT3/GT4/GT2): Max 10,000 miles/year
- Regular Porsches: Max 25,000 miles/year
- Brand new cars (≤1 year): Max 20,000 miles total

**Auto-correction Logic:**
1. If mileage > max reasonable, try dividing by 100 or 10
2. If result is reasonable, use corrected value
3. Otherwise, set to null for re-scraping

### 3. Mobile Responsiveness Issues
**Problem:** Trim analytics page breaking on mobile
- Generation buttons not wrapping
- Charts overflowing screen width

**Solution:**
- Changed generation buttons container to `flex-wrap`
- Updated charts to use ResponsiveContainer at 100% width
- Added overflow-x-auto for chart containers
- Adjusted mobile-specific chart width calculations

## Data Collection Status

### Scraping Infrastructure
- **Working:** Daily Data Collection workflow running successfully
- **Data Volume:** 6,011 listings in database (69 new in last 24 hours)
- **Sources Active:** BaT successfully scraping, other sources configured

### Current Limitations
- Only scraping 718 Cayman models in recent runs
- Need to ensure workflows run without model parameter for all models
- Bright Data credentials needed for full functionality

## Important Patterns to Remember

### Mileage Validation
Always validate mileage based on:
1. Car age (current year - model year)
2. Car type (GT cars driven less than regular models)
3. Common parsing errors (extra zeros)

### Scraping Best Practices
1. **Use scrape-and-save.ts** - The comprehensive scraper
2. **Never trust raw scraped data** - Always validate
3. **Store everything** - HTML, search pages, detail pages
4. **Check for existing VINs** - Update rather than duplicate

### Workflow Management
- Daily Data Collection is the primary workflow
- Manual triggers should omit model parameter for comprehensive scraping
- Always check ingestion_runs table for scraping history

## Recommended Next Steps
1. Monitor daily scraping runs for variety of models
2. Check Bright Data credential status
3. Verify all sources are being scraped (not just BaT)
4. Consider adding more validation for other unrealistic data patterns