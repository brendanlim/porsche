# September 23, 2025 - Scraping Timeout Fix & Focused Model Approach

## Problem: Daily Scraper Timing Out

### Issue Details
- Daily Data Collection workflow cancelled after 1h57m (2-hour timeout limit)
- Trying to scrape ALL models (911, 718/Cayman, Boxster) in one run
- BaT Puppeteer scraper experiencing navigation timeouts
- Error logs showed: "Navigation timeout of 60000 ms exceeded" for multiple models

### Root Cause
- Scraping all Porsche models from BaT in a single run takes too long
- Each model requires clicking "Show More" button multiple times
- Processing hundreds of listings per model
- 2-hour timeout insufficient for comprehensive scraping

## Solution: Focused Model Scraping

### Approach
Instead of scraping all models at once, break it up into focused runs by model.

### Implementation

#### 1. Increased Daily Timeout (Backup)
```yaml
# .github/workflows/daily-scraping.yml
timeout-minutes: 180  # Increased from 120 to 180 (3 hours)
```

#### 2. New Focused Model Scraping Workflow
Created `.github/workflows/focused-scraping.yml` with scheduled runs:

**Schedule:**
- **1 AM UTC**: Scrape 911 models
- **5 AM UTC**: Scrape 718/Cayman models
- **9 AM UTC**: Scrape Boxster models

**Configuration:**
- Each run has 60-minute timeout (sufficient for single model)
- Scrapes 5 pages by default (configurable)
- Source: BaT (can be extended to other sources)

### Benefits of Focused Approach

1. **Reliability**: Each model scraped independently - if one fails, others still run
2. **Manageable Timeouts**: 1 hour is sufficient for single model
3. **Better Monitoring**: Easy to see which model is having issues
4. **Flexible Scheduling**: Can adjust timing per model based on listing volume
5. **Parallel Potential**: Could run multiple models simultaneously if needed

### Workflow Usage

#### Manual Trigger
```bash
# Scrape specific model
gh workflow run "Focused Model Scraping" -f model=911 -f max_pages=5
gh workflow run "Focused Model Scraping" -f model=718-cayman -f max_pages=3
gh workflow run "Focused Model Scraping" -f model=boxster -f max_pages=2
```

#### Automatic Schedule
Runs 3x daily automatically at scheduled times for each model.

## Key Learnings

### Scraping at Scale
1. **Break large jobs into smaller chunks** - More reliable than one massive job
2. **Set realistic timeouts** - Better to have multiple smaller jobs than one that times out
3. **Model-specific scheduling** - Different models may need different frequencies
4. **Monitor navigation timeouts** - Puppeteer navigation issues are common with dynamic sites

### GitHub Actions Optimization
1. **Use job outputs** for dynamic configuration
2. **Schedule multiple cron jobs** in same workflow for different parameters
3. **Always include timeout-minutes** to prevent runaway jobs
4. **Add reporting steps** to track what was actually scraped

## Recommended Configuration

### For Production
```yaml
# Daily comprehensive (backup/weekly)
Daily Data Collection:
  - timeout: 180 minutes
  - schedule: Weekly or on-demand
  - purpose: Full refresh

# Focused scraping (primary)
Focused Model Scraping:
  - timeout: 60 minutes per model
  - schedule: 3x daily (staggered by model)
  - purpose: Regular updates
```

### Monitoring
- Check daily for successful completions
- Review logs if any model consistently times out
- Adjust max_pages parameter based on model volume

## Migration Path

1. **Phase 1**: Run both workflows in parallel
2. **Phase 2**: Rely primarily on focused scraping
3. **Phase 3**: Use daily comprehensive only for weekly full refresh
4. **Phase 4**: Consider adding more sources to focused workflow

## Related Files
- `.github/workflows/daily-scraping.yml` - Comprehensive scraper (3hr timeout)
- `.github/workflows/focused-scraping.yml` - Model-specific scraper (1hr timeout)
- `scripts/scraping/scrape-and-save.ts` - Main scraping script (supports --model parameter)

## Next Steps
1. Monitor focused scraping success rate over next few days
2. Add other sources (Classic.com, Cars.com) to focused workflow
3. Consider adding luxury/performance trim-specific runs (GT3, GT4, Turbo)
4. Implement alerting if any scheduled run fails