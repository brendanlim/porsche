import { describe, expect, test } from '@jest/globals';

// BaT buyer fee calculation functions
function calculateBaTFee(price: number): number {
  const feePercent = 0.05;
  const maxFee = 7500;
  const calculatedFee = price * feePercent;
  return Math.min(calculatedFee, maxFee);
}

function applyBaTFee(price: number): number {
  return price + calculateBaTFee(price);
}

describe('BaT Buyer Fee Calculations', () => {
  describe('calculateBaTFee', () => {
    test('calculates 5% fee for prices under cap', () => {
      expect(calculateBaTFee(100000)).toBe(5000);
      expect(calculateBaTFee(50000)).toBe(2500);
      expect(calculateBaTFee(10000)).toBe(500);
    });

    test('caps fee at $7,500 maximum', () => {
      expect(calculateBaTFee(150000)).toBe(7500); // Would be 7500
      expect(calculateBaTFee(200000)).toBe(7500); // Would be 10000
      expect(calculateBaTFee(500000)).toBe(7500); // Would be 25000
      expect(calculateBaTFee(1000000)).toBe(7500); // Would be 50000
    });

    test('handles edge case at exact cap threshold', () => {
      // $150,000 * 0.05 = $7,500 (exactly at cap)
      expect(calculateBaTFee(150000)).toBe(7500);
    });

    test('handles zero and negative prices', () => {
      expect(calculateBaTFee(0)).toBe(0);
      expect(calculateBaTFee(-1000)).toBe(-50);
    });
  });

  describe('applyBaTFee', () => {
    test('adds fee to original price correctly', () => {
      expect(applyBaTFee(100000)).toBe(105000); // 100k + 5k
      expect(applyBaTFee(50000)).toBe(52500);   // 50k + 2.5k
      expect(applyBaTFee(200000)).toBe(207500); // 200k + 7.5k (capped)
    });

    test('handles GT4 RS typical prices', () => {
      const gt4rsPrice = 350000;
      const expectedFee = 7500; // Capped
      expect(applyBaTFee(gt4rsPrice)).toBe(357500);
    });

    test('handles GT3 typical prices', () => {
      const gt3Price = 180000;
      const expectedFee = 7500; // Capped
      expect(applyBaTFee(gt3Price)).toBe(187500);
    });

    test('handles base 718 typical prices', () => {
      const basePrice = 65000;
      const expectedFee = 3250; // 5% of 65k
      expect(applyBaTFee(basePrice)).toBe(68250);
    });
  });

  describe('Real-world scenarios', () => {
    test('validates against known BaT sales', () => {
      // Example: A car sold for hammer price of $120,000
      const hammerPrice = 120000;
      const buyerPays = applyBaTFee(hammerPrice);
      expect(buyerPays).toBe(126000); // 120k + 6k fee
    });

    test('ensures fees never exceed cap regardless of price', () => {
      const prices = [100000, 250000, 500000, 1000000, 5000000];
      prices.forEach(price => {
        const fee = calculateBaTFee(price);
        expect(fee).toBeLessThanOrEqual(7500);
      });
    });
  });
});