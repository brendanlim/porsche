# Scraping System Migration Guide

## 🚨 IMPORTANT: The scraping system has been completely redesigned

### Old System (DEPRECATED - DO NOT USE)
- **Single workflow**: `daily-scrape.yml`
- **Single script**: `scrape-and-save.ts`
- **Problem**: Takes 1+ hours, times out frequently
- **Status**: REMOVED

### New System (USE THIS)
Two-stage approach that completes reliably:

#### Stage 1: Index Collection
- **Workflow**: `.github/workflows/scrape-index.yml`
- **Script**: `scripts/scraping/scrape-index-only.ts`
- **Runtime**: 5-10 minutes
- **Schedule**: Daily at 2 AM UTC
- **Purpose**: Collects URLs from search pages into queue

#### Stage 2: Detail Processing
- **Workflow**: `.github/workflows/scrape-details.yml`
- **Script**: `scripts/scraping/scrape-details.ts`
- **Runtime**: 30-40 minutes per batch
- **Schedule**: Every 2 hours
- **Purpose**: Processes URLs from queue, fetches detail pages
- **Parallelization**: 3 workers process simultaneously

## Migration Steps

### 1. Create Queue Table
Run this migration in your Supabase dashboard:
```sql
-- See supabase/migrations/011_scrape_queue.sql
```

### 2. Manual Execution

#### To run a full scrape manually:
```bash
# Stage 1: Collect URLs
npx tsx scripts/scraping/scrape-index-only.ts --source=bat

# Stage 2: Process details (can run multiple times)
npx tsx scripts/scraping/scrape-details.ts --batch-size=50
```

#### To process high-priority items:
```bash
npx tsx scripts/scraping/scrape-details.ts --batch-size=50 --priority=1
```

### 3. Monitor Progress

Check queue status:
```sql
SELECT status, COUNT(*)
FROM scrape_queue
GROUP BY status;
```

Reset stuck items:
```sql
SELECT reset_stuck_queue_items();
```

## Benefits of New System

1. **No Timeouts**: Each stage completes well within GitHub Action limits
2. **Resumable**: If Stage 2 fails, it picks up exactly where it left off
3. **Parallel**: 3 workers = 3x faster processing
4. **Priority System**: High-value cars ($200k+) processed first
5. **Error Recovery**: Failed URLs automatically retried up to 3 times
6. **Scalable**: Can add more workers or increase frequency as needed

## Queue Management

### Priority Levels
- `1`: High priority (cars over $200k)
- `2`: Normal priority (default)
- `3`: Low priority

### Status Values
- `pending`: Waiting to be processed
- `processing`: Currently being processed
- `completed`: Successfully processed
- `error`: Failed after max retries

## Troubleshooting

### If scraping seems stuck:
1. Check for processing items older than 1 hour:
```sql
SELECT * FROM scrape_queue
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '1 hour';
```

2. Reset them:
```sql
SELECT reset_stuck_queue_items();
```

### If you need to re-scrape everything:
```sql
-- Clear the queue
TRUNCATE scrape_queue;
-- Then run Stage 1 again
```

## Important Notes

- The old `scrape-and-save.ts` still exists but should NOT be used for daily scraping
- It can be used for one-off manual scraping with specific parameters
- All automated scraping should use the new two-stage system
- The queue system ensures no URLs are lost even if workers fail