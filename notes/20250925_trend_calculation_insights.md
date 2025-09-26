# Trend Calculation Fix and Market Insights
Date: 2025-09-25

## Problem Solved
Fixed the issue where 6-month trends were showing 0% despite clear price movements in the data. The problem was using too narrow time windows that missed data points.

## Solution
1. **Widened time windows** - Instead of looking for data exactly at 3/6/12 months ago, we now look for data "around" those periods (e.g., 5-7 months ago for the 6-month trend)
2. **Used median prices** - More robust than averages, less affected by outliers
3. **Improved fallback logic** - Better handling when exact period data isn't available

## Key Insight: Market Story Interpretation

The trend numbers tell a coherent market story that should be surfaced to users. For example, GT4 RS trends:
- **1 Year: -13.43%**
- **6 Month: -21.17%**
- **3 Month: -5.85%**

### The Story These Numbers Tell:
1. **6 months ago was the peak** (~$257k in March/April) - Market was at its hottest
2. **1 year ago prices were climbing** - Lower than peak but higher than now, market was ascending
3. **3 months ago mid-decline** - Prices had started falling from peak but hadn't dropped as much as now

This reveals a classic enthusiast car market pattern:
- **Speculative bubble forms** (leading up to March)
- **Peak pricing occurs** (March/April at $257k)
- **Reality sets in** and prices correct (last 3-6 months)
- **Market finds equilibrium** (current ~$200k level)

## Implementation Ideas

### 1. Market Narrative Component
Add a "Market Story" section to analytics pages that auto-generates insights like:
```
"The GT4 RS market peaked 6 months ago at $257k and has since corrected 21%.
Despite recent declines, prices remain above multi-year averages, suggesting
the market is finding a sustainable level after speculative excess."
```

### 2. Trend Interpretation Logic
```typescript
function interpretTrends(threeMonth: number, sixMonth: number, oneYear: number) {
  // Peak Detection
  if (Math.abs(sixMonth) > Math.abs(oneYear) && Math.abs(sixMonth) > Math.abs(threeMonth)) {
    if (sixMonth < 0) {
      return "Market peaked around 6 months ago and is now correcting";
    } else {
      return "Market bottomed around 6 months ago and is recovering";
    }
  }

  // Acceleration/Deceleration
  if (Math.abs(threeMonth) < Math.abs(sixMonth)) {
    return sixMonth < 0 ? "Decline is slowing" : "Rally is losing steam";
  }

  // Consistent trend
  if (Math.sign(threeMonth) === Math.sign(sixMonth) && Math.sign(sixMonth) === Math.sign(oneYear)) {
    return oneYear > 0 ? "Steady appreciation trend" : "Consistent depreciation";
  }
}
```

### 3. Visual Enhancements
- Add annotations to charts marking identified peaks/troughs
- Show trend acceleration/deceleration with gradient colors
- Include confidence bands based on data density

### 4. Context Providers
Compare trends to:
- Overall market (S&P 500, luxury goods index)
- Similar models (GT3 RS, other limited editions)
- Historical patterns (previous generation cycles)

## Technical Details

### Files Modified
- `/app/api/analytics/[model]/[trim]/route.ts` - Main trend calculation logic
- `/app/api/analytics/[model]/route.ts` - Model-level analytics

### Key Changes
```typescript
// Old: Narrow window (exactly 6-7 months ago)
const sixMonthAgoListings = filteredListings.filter(l =>
  l.sold_date && new Date(l.sold_date) > sevenMonthsAgo && new Date(l.sold_date) <= sixMonthsAgo
);

// New: Wider window (5-7 months ago)
const sixMonthAgoListings = filteredListings.filter(l =>
  l.sold_date && new Date(l.sold_date) >= sevenMonthsAgo && new Date(l.sold_date) <= fiveMonthsAgo
);
```

## Lessons Learned
1. **Don't assume uniform data distribution** - Real-world data has gaps
2. **Wider windows capture more signal** - Better to have approximate data than no data
3. **Median > Average for market prices** - More resistant to outliers
4. **Context transforms numbers into insights** - Users need the story, not just percentages

## Next Steps
1. Implement market narrative generation
2. Add trend interpretation to all model/trim pages
3. Create visual indicators for market phases (bubble, correction, equilibrium)
4. Build comparative analysis tools
5. Add seasonal adjustment factors

## Impact
This fix transforms bare percentages into actionable market intelligence, helping users understand not just what happened, but why and what it means for future decisions.