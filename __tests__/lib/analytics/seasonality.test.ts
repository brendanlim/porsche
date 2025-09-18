import { describe, expect, test } from '@jest/globals';

// Seasonality functions
function getSeason(date: Date): string {
  const month = date.getMonth() + 1; // 0-indexed to 1-indexed
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
}

function calculateSeasonalMedian(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function calculateSeasonalImpact(seasonPrices: Record<string, number[]>) {
  const results: Record<string, { median: number; impact: number; count: number }> = {};
  const allPrices = Object.values(seasonPrices).flat();
  const overallMedian = calculateSeasonalMedian(allPrices);

  for (const [season, prices] of Object.entries(seasonPrices)) {
    const median = calculateSeasonalMedian(prices);
    const impact = overallMedian > 0 ? ((median - overallMedian) / overallMedian) * 100 : 0;
    results[season] = {
      median,
      impact: Math.round(impact * 10) / 10, // Round to 1 decimal
      count: prices.length
    };
  }

  return results;
}

describe('Seasonality Analysis', () => {
  describe('getSeason', () => {
    test('correctly identifies Winter months', () => {
      expect(getSeason(new Date('2024-12-15'))).toBe('Winter');
      expect(getSeason(new Date('2024-01-01'))).toBe('Winter');
      expect(getSeason(new Date('2024-02-28'))).toBe('Winter');
    });

    test('correctly identifies Spring months', () => {
      expect(getSeason(new Date('2024-03-01'))).toBe('Spring');
      expect(getSeason(new Date('2024-04-15'))).toBe('Spring');
      expect(getSeason(new Date('2024-05-31'))).toBe('Spring');
    });

    test('correctly identifies Summer months', () => {
      expect(getSeason(new Date('2024-06-01'))).toBe('Summer');
      expect(getSeason(new Date('2024-07-15'))).toBe('Summer');
      expect(getSeason(new Date('2024-08-31'))).toBe('Summer');
    });

    test('correctly identifies Fall months', () => {
      expect(getSeason(new Date('2024-09-01'))).toBe('Fall');
      expect(getSeason(new Date('2024-10-15'))).toBe('Fall');
      expect(getSeason(new Date('2024-11-30'))).toBe('Fall');
    });

    test('handles edge cases between seasons', () => {
      expect(getSeason(new Date('2024-02-29'))).toBe('Winter'); // Leap year
      expect(getSeason(new Date('2024-03-01'))).toBe('Spring');
      expect(getSeason(new Date('2024-05-31'))).toBe('Spring');
      expect(getSeason(new Date('2024-06-01'))).toBe('Summer');
    });
  });

  describe('calculateSeasonalMedian', () => {
    test('calculates median for odd number of prices', () => {
      expect(calculateSeasonalMedian([100000, 150000, 200000])).toBe(150000);
      expect(calculateSeasonalMedian([50000])).toBe(50000);
    });

    test('calculates median for even number of prices', () => {
      expect(calculateSeasonalMedian([100000, 150000])).toBe(125000);
      expect(calculateSeasonalMedian([100000, 150000, 200000, 250000])).toBe(175000);
    });

    test('handles empty arrays', () => {
      expect(calculateSeasonalMedian([])).toBe(0);
    });

    test('handles unsorted arrays', () => {
      expect(calculateSeasonalMedian([200000, 100000, 150000])).toBe(150000);
      expect(calculateSeasonalMedian([500000, 100000, 300000, 200000])).toBe(250000);
    });

    test('handles GT4 RS typical prices', () => {
      const gt4rsPrices = [320000, 350000, 380000, 340000, 360000];
      expect(calculateSeasonalMedian(gt4rsPrices)).toBe(350000);
    });
  });

  describe('calculateSeasonalImpact', () => {
    test('calculates seasonal impact correctly', () => {
      const seasonPrices = {
        'Winter': [100000, 110000, 105000],
        'Spring': [120000, 125000, 130000],
        'Summer': [140000, 145000, 150000],
        'Fall': [115000, 120000, 125000]
      };

      const results = calculateSeasonalImpact(seasonPrices);

      // Verify all seasons are present
      expect(Object.keys(results)).toHaveLength(4);
      
      // Summer should have highest median
      expect(results['Summer'].median).toBeGreaterThan(results['Winter'].median);
      
      // Winter should have negative impact
      expect(results['Winter'].impact).toBeLessThan(0);
      
      // Summer should have positive impact
      expect(results['Summer'].impact).toBeGreaterThan(0);
    });

    test('handles real GT4 RS seasonal data', () => {
      const gt4rsSeasonPrices = {
        'Winter': [310000, 320000, 315000],
        'Spring': [340000, 345000, 350000],
        'Summer': [360000, 370000, 380000],
        'Fall': [335000, 340000, 345000]
      };

      const results = calculateSeasonalImpact(gt4rsSeasonPrices);

      // Summer should show highest prices for sports cars
      const summerImpact = results['Summer'].impact;
      const winterImpact = results['Winter'].impact;
      
      expect(summerImpact).toBeGreaterThan(0);
      expect(winterImpact).toBeLessThan(0);
      expect(summerImpact).toBeGreaterThan(Math.abs(winterImpact));
    });

    test('handles seasons with different sample sizes', () => {
      const seasonPrices = {
        'Winter': [100000], // Only 1 sale
        'Spring': [120000, 125000], // 2 sales
        'Summer': [140000, 145000, 150000, 155000, 160000], // 5 sales
        'Fall': [115000, 120000, 125000] // 3 sales
      };

      const results = calculateSeasonalImpact(seasonPrices);

      expect(results['Winter'].count).toBe(1);
      expect(results['Spring'].count).toBe(2);
      expect(results['Summer'].count).toBe(5);
      expect(results['Fall'].count).toBe(3);
    });

    test('rounds impact to 1 decimal place', () => {
      const seasonPrices = {
        'Winter': [100000],
        'Spring': [110500], // Should create non-round percentage
        'Summer': [125333],
        'Fall': [115000]
      };

      const results = calculateSeasonalImpact(seasonPrices);

      // All impacts should be rounded to 1 decimal
      Object.values(results).forEach(result => {
        const decimalPlaces = (result.impact.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Real-world seasonality patterns', () => {
    test('confirms sports car seasonality trends', () => {
      // Sports cars typically sell for more in summer, less in winter
      const typicalSportsCarData = {
        'Winter': [180000, 185000, 175000, 170000],
        'Spring': [195000, 200000, 205000, 190000],
        'Summer': [210000, 215000, 220000, 205000],
        'Fall': [190000, 195000, 185000, 200000]
      };

      const results = calculateSeasonalImpact(typicalSportsCarData);

      // Summer should be peak season
      const seasonsByImpact = Object.entries(results)
        .sort((a, b) => b[1].impact - a[1].impact)
        .map(([season]) => season);

      expect(seasonsByImpact[0]).toBe('Summer'); // Highest
      expect(seasonsByImpact[3]).toBe('Winter'); // Lowest
    });
  });
});