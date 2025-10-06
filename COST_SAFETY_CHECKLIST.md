# Cost Safety Checklist for PorscheStats

**Last Updated**: 2025-10-05

## ✅ Cost-Saving Measures in Place

### 1. Switched from Bright Data to ScrapingBee
- **Old**: Bright Data at $8/GB = $400-500/month
- **New**: ScrapingBee at $0.002/request = $4-10/month
- **Savings**: ~$5,000/year (95% reduction)
- **Status**: ✅ Implemented (all workflows using `-sb` scrapers)

### 2. Removed Expensive AI Normalization
- **File**: `lib/services/normalizer.ts`
- **Status**: ✅ "Removed Gemini - using regex-based parsing only" (line 16)
- **Impact**: Eliminated $1,000+/month Gemini API costs

### 3. Reasonable Retry Logic
- **Search pages**: Max 3 retries with exponential backoff
- **Detail pages**: Max 2 retries
- **ScrapingBee wrapper**: Implements smart session rotation
- **Status**: ✅ Implemented without crazy retry loops

### 4. No AI in Scrapers
Verified all `-sb` scrapers are AI-free:
- ✅ `bat-sb.ts` - No AI calls
- ✅ `classic-sb.ts` - No AI calls
- ✅ `carsandbids-sb.ts` - No AI calls
- ✅ `inventory-sb.ts` - No AI calls (Cars.com, Edmunds, AutoTrader)

### 5. Static Color Normalization
- **File**: `lib/color-normalizer.ts`
- **Method**: Static mapping dictionary (no AI)
- **Status**: ✅ Pure lookup-based normalization

## 🚨 Cost Monitoring

### ScrapingBee Usage Limits
- **Monthly budget**: $10
- **Estimated requests**: ~2,000/month
- **Cost per request**: $0.002
- **Alert threshold**: 4,000 requests ($8)

### Where to Monitor
1. **ScrapingBee Dashboard**: https://app.scrapingbee.com/
   - Track request count
   - Set usage alerts
   - Monitor costs

2. **GitHub Actions**:
   - Check workflow run frequency
   - Ensure max-pages defaults are set correctly

## ⚠️ Things That Could Still Cost Money

### 1. Market Narratives (Analytics)
- **Files**:
  - `lib/analytics/market-narrative.ts`
  - `lib/analytics/aggregate-market-narrative.ts`
  - `lib/analytics/llm-predictor.ts`
- **Uses**: OpenAI GPT-4o-mini (cheap but not free)
- **Cost**: ~$5-10/month for narrative generation
- **Status**: ⚠️ Keep monitoring, already switched to cheaper model

### 2. Options Processing
- **File**: `lib/services/options-manager.ts`
- **May use**: Some normalization
- **Status**: ⚠️ Verify no expensive AI calls

## 🔒 Protection Against Cost Spikes

### GitHub Workflows
- ✅ All workflows use ScrapingBee (removed Bright Data env vars)
- ✅ Default `max-pages=1` for daily runs
- ✅ Source options limited to `-sb` versions only

### Environment Variables
**Required** (keep):
- `SCRAPINGBEE_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Safe to remove** (after testing):
- `BRIGHT_DATA_CUSTOMER_ID`
- `BRIGHT_DATA_BROWSER_PASSWORD`
- `BRIGHT_DATA_ZONE_PASSWORD`
- `BRIGHT_DATA_API_KEY`

**Avoid using** (expensive):
- ❌ `GEMINI_API_KEY` - DO NOT USE for normalization
- ⚠️ `OPENAI_API_KEY` - Use only for cheap models (gpt-4o-mini)

## 📊 Cost Tracking

### Expected Monthly Costs
| Service | Monthly Cost | Annual Cost |
|---------|-------------|-------------|
| ScrapingBee | $5-10 | $60-120 |
| OpenAI (narratives) | $5-10 | $60-120 |
| Supabase Storage | $5 | $60 |
| **Total** | **$15-25** | **$180-300** |

### Previous Costs (Before Optimization)
| Service | Monthly Cost | Annual Cost |
|---------|-------------|-------------|
| Bright Data | $400-500 | $4,800-6,000 |
| Gemini API | $100-200 | $1,200-2,400 |
| **Total** | **$500-700** | **$6,000-8,400** |

**Total Annual Savings: ~$6,000-8,000** 🎉

## 🛡️ Emergency Cost Controls

### If Costs Spike Again

1. **Check ScrapingBee Dashboard**
   - Look for unexpected request spikes
   - Check which scrapers are running

2. **Disable GitHub Workflows**
   ```bash
   # Temporarily disable scheduled runs
   # Edit .github/workflows/*.yml and comment out cron schedules
   ```

3. **Set ScrapingBee Budget Alerts**
   - Go to ScrapingBee dashboard
   - Set hard limit at $20/month
   - Set alert at $10/month

4. **Check for Rogue Scripts**
   - Search for any temp scripts with `npx tsx`
   - Verify no infinite loops or retry storms

## ✅ Monthly Audit Checklist

**Run this checklist every month:**

- [ ] Check ScrapingBee usage dashboard
- [ ] Verify total costs are under $25
- [ ] Confirm no Bright Data charges
- [ ] Verify Gemini API key is not being used
- [ ] Check OpenAI usage (should be < $10)
- [ ] Review GitHub Actions workflow runs
- [ ] Verify all scrapers use `-sb` suffix
- [ ] Confirm `max-pages` defaults are still set to 1

## 🔧 Safe Development Practices

### Before Running Any Script
1. Check if it uses expensive APIs (Gemini, GPT-4)
2. Verify retry logic is reasonable (< 5 retries)
3. Test with small datasets first (`--max-pages=1`)
4. Monitor costs in real-time

### When Adding New Features
1. ❌ NO AI normalization (use static dictionaries)
2. ❌ NO Bright Data (use ScrapingBee)
3. ✅ Use cheap models only (gpt-4o-mini, not gpt-4)
4. ✅ Implement reasonable retry limits
5. ✅ Test cost impact before deploying

## 📝 Notes
- Keep this document updated with any new cost-saving measures
- Review quarterly to ensure optimizations are still in place
- Document any new services that could impact costs
