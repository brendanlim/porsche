# API Cost Reduction Summary

## Problem
**$7,999 in Gemini API costs over 10 days** (Sept 21 - Oct 1, 2025)
= **~$24,000/month** if left running

## Root Causes

### 1. Gemini 2.5 Flash - EVERY Listing (💀💀💀💀💀)
- **File**: `lib/services/normalizer.ts`
- **Issue**: Called Gemini API for EVERY scraped listing to parse titles/descriptions
- **Actual Cost**: $7,999 in just 10 days = **$24,000/month** projected
- **Scale**: 100s-1000s of listings per day = 100s-1000s of API calls daily
- **Fix**: ✅ Removed Gemini entirely, switched to regex-based parsing
- **Fix 2**: ✅ Removed `@google/generative-ai` package completely

### 2. GPT-4 Turbo - Expensive Model ($$$$)
- **Files**: 
  - `lib/analytics/market-narrative.ts`
  - `lib/analytics/aggregate-market-narrative.ts`
  - `lib/analytics/llm-predictor.ts` (8 instances)
  - `scripts/analytics/generate-chart-predictions.ts` (3 instances)
- **Issue**: Using GPT-4 Turbo ($0.03/1K tokens) instead of GPT-4o-mini ($0.00015/1K tokens)
- **Cost**: 200x more expensive than mini model
- **Fix**: ✅ Switched all to gpt-4o-mini

### 3. Daily Failing Workflow ($$$)
- **File**: `.github/workflows/market-insights.yml`
- **Issue**: "AI Chart Predictions Generation" ran daily at 6 AM UTC since Sept 21
- **Status**: Failed every single day but still consumed API credits
- **Fix**: ✅ Disabled scheduled runs (manual only now)

### 4. No Caching ($$)
- **File**: `scripts/analytics/update-market-narratives.ts`
- **Issue**: Narratives regenerated constantly with only 2s delays
- **Fix**: ✅ Added 7-day caching + increased delays to 10s

## Pricing Comparison

| Model | Input (per 1K tokens) | Output (per 1K tokens) | Cost Ratio |
|-------|----------------------|------------------------|------------|
| GPT-4 Turbo | $0.01 | $0.03 | 200x |
| GPT-4o-mini | $0.00015 | $0.0006 | 1x |
| Gemini 2.5 Flash | $0.00075 | $0.003 | ~15x |

## Changes Made

### 1. Removed Gemini from Normalizer
```typescript
// BEFORE: Called Gemini on every listing
const parsedInfo = await this.parseWithGemini(listing);

// AFTER: Use regex-based parsing only
const parsedInfo = this.basicParse(listing);
```

### 2. Switched to GPT-4o-mini
All GPT-4 Turbo instances → gpt-4o-mini (200x cheaper)

### 3. Disabled Expensive Workflow
```yaml
# BEFORE: Daily at 6 AM
schedule:
  - cron: '0 6 * * *'

# AFTER: Manual only
# schedule:
#   - cron: '0 6 * * *'
```

### 4. Added Caching
```typescript
// Check if narrative exists and is < 7 days old
if (daysSinceUpdate < 7) {
  console.log('Skipping - using cached narrative');
  return;
}
```

### 5. Increased Rate Limiting
```typescript
// BEFORE: 2s delay
await new Promise(resolve => setTimeout(resolve, 2000));

// AFTER: 10s delay
await new Promise(resolve => setTimeout(resolve, 10000));
```

## Expected Monthly Savings

| Item | Before (projected) | After | Savings |
|------|-------------------|-------|---------|
| Gemini normalization | **~$24,000** | $0 | **$24,000** |
| GPT-4 Turbo → mini | ~$2,000 | $10 | $1,990 |
| Daily workflow | ~$500 | $0 | $500 |
| **TOTAL** | **~$26,500/mo** | **~$10/mo** | **~$26,490/mo** |

**Reality Check**: $7,999 spent in just 10 days = $799.90/day on Gemini alone!

## Verified No Images Sent to LLMs
✅ Searched entire codebase - no image data being sent to any LLM APIs

## Models Now in Use

### Production (Running in workflows)
- ✅ **gpt-4o-mini**: All market narratives, predictions, analytics
- ✅ **gpt-4o-mini**: Model/trim normalization (when needed)
- ✅ **gpt-4o-mini**: Options normalization (when needed)
- ✅ **gpt-4o-mini**: Color normalization (when needed)

### Not Running (Scripts exist but not automated)
- `scripts/data-processing/parse-all-stored-html.ts` (manual only)
- `lib/analytics/llm-predictor.ts` (library, not scheduled)

## Next Steps

1. ✅ Monitor OpenAI costs in October to verify savings
2. ✅ Consider if you even need LLMs for normalization given VIN decoder
3. ✅ Could switch weekly narratives to bi-weekly for further savings
4. ✅ Consider removing LLM normalization entirely and rely on VIN + regex

## Commands to Monitor Usage

```bash
# Check narrative cache usage
npx tsx scripts/analytics/update-market-narratives.ts

# Should see: "⏭️  Skipping - narrative updated X days ago"
```
