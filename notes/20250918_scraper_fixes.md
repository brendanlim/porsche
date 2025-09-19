# Daily Scraper Fixes - September 18, 2025

## Issues Fixed

### 1. ✅ **100 Model Limit Issue**
**Problem:** Scraper was limiting detail fetching to `maxPages * 50` (e.g., 100 details with maxPages=2)
**Solution:** Removed artificial limit, now fetches ALL listings found
**File:** `lib/scrapers/bat-puppeteer.ts` (lines 335-386)

### 2. ✅ **Operation Canceled Errors**
**Problem:** Scraper would suddenly fail with "The operation was canceled" without explanation
**Solution:**
- Added timeout wrapper with 30-second limit per fetch
- Implemented retry logic (2 attempts) for failed fetches
- Added batch processing to avoid memory issues
- Better error messages explaining cancellation reasons
**File:** `lib/scrapers/bat-puppeteer.ts` (lines 350-430)

### 3. ✅ **Incorrect BaT URLs for Cayman/Boxster**
**Problem:** Using non-existent URLs like `/718-cayman-gts/` that return 404s
**Solution:** Corrected all Cayman/Boxster URLs to use generation-based paths:
- 982: `/982-718-cayman/` and `/982-718-boxster/`
- 981: `/981-cayman/` and `/981-boxster/`
- 987: `/987-cayman/` and `/987-boxster/`
- 986: `/986-boxster/`
- GT4 special case: All GT4 variants use `/cayman-gt4/`
**File:** `lib/scrapers/bat-puppeteer.ts` (lines 16-71)

### 4. ✅ **Duplicate VIN Handling**
**Problem:** Script failed with "duplicate key value violates unique constraint" for relisted cars
**Solution:**
- Properly detect and handle relisted cars (same VIN, different dates)
- Update existing record instead of trying to insert duplicate
- Merge duplicate listings (same VIN, same date, different URLs)
- Clear differentiation between MERGE, RELIST, and SKIP operations
**File:** `scripts/scraping/scrape-and-save.ts` (lines 147-195)

### 5. ✅ **Verbose and Repetitive Logging**
**Problem:** Logs were too verbose with repeated URLs and hard to scan
**Solution:**
- Removed triple URL logging per listing
- Structured output with clear sections and emojis
- Compact format: `[VIN-last-8] | key details`
- Silent operations for storage and options processing
- Better progress indicators with batch numbers
- Success rate calculation at the end
**Files:** Multiple files updated for cleaner logging

## Key Improvements

### Before:
```
Storing detail HTML from bring-a-trailer: bring-a-trailer/20250918/911/gt3/detail/...
Stored HTML for 911 GT3 detail page: bring-a-trailer/20250918/911/gt3/detail/... (531397 bytes)
  ✓ Stored HTML for listing 911 GT3: bring-a-trailer/20250918/911/gt3/detail/... (531316 bytes)
```

### After:
```
  [89/600] 911 GT3 RS
    ✓ Stored HTML (518KB)
    📊 VIN: WPZ12345 | 865 mi | Sold: 9/15/2024
```

## Performance Improvements

1. **No more artificial limits** - Processes all found listings
2. **Better error recovery** - Retries on timeout, continues after errors
3. **Memory management** - Batch processing prevents memory issues
4. **Accurate URL targeting** - No more 404s for Cayman/Boxster models
5. **Smart duplicate handling** - Updates instead of failing on VIN conflicts

## Testing

Run a quick test with:
```bash
npx tsx scripts/scraping/scrape-and-save.ts --source=bat --model=718-cayman --trim=gt4 --max-pages=1
```

The scraper should now:
- Find and process ALL GT4 listings (not just 100)
- Handle timeouts gracefully with retries
- Use correct URLs (no 404s)
- Update existing VINs instead of failing
- Show clean, scannable logs

## Notes

- The "operation canceled" error often indicates memory pressure or network timeouts
- The scraper now explains these errors and attempts recovery
- Batch processing (50 listings at a time) helps prevent memory issues
- All Cayman/Boxster URLs verified against actual BaT site structure