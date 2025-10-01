#!/usr/bin/env npx tsx

// This script shows how the trend calculations SHOULD work
// Like stock prices: compare current to specific points in the past

interface Listing {
  price: number;
  sold_date: string;
}

function calculateStockLikeTrend(
  listings: Listing[],
  currentDate: Date,
  monthsAgo: number
): number | null {
  // Define windows: 1 month for "current" and "past" periods
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

  // Current window: last 30 days from the most recent date
  const currentStart = new Date(currentDate.getTime() - oneMonthMs);
  const currentListings = listings.filter(l => {
    const date = new Date(l.sold_date);
    return date > currentStart && date <= currentDate;
  });

  // Past window: 30 days around the target date
  const targetDate = new Date(currentDate);
  targetDate.setMonth(targetDate.getMonth() - monthsAgo);
  const pastStart = new Date(targetDate.getTime() - oneMonthMs);
  const pastEnd = new Date(targetDate.getTime());

  const pastListings = listings.filter(l => {
    const date = new Date(l.sold_date);
    return date > pastStart && date <= pastEnd;
  });

  // Need minimum sample sizes
  if (currentListings.length < 2 || pastListings.length < 2) {
    return null;
  }

  // Calculate medians (more stable than averages)
  const currentPrices = currentListings.map(l => l.price).sort((a, b) => a - b);
  const currentMedian = currentPrices[Math.floor(currentPrices.length / 2)];

  const pastPrices = pastListings.map(l => l.price).sort((a, b) => a - b);
  const pastMedian = pastPrices[Math.floor(pastPrices.length / 2)];

  // Calculate trend
  const trend = ((currentMedian - pastMedian) / pastMedian) * 100;

  console.log(`${monthsAgo} Month Trend:`);
  console.log(`  Current (last 30 days): ${currentListings.length} sales, median $${currentMedian.toLocaleString()}`);
  console.log(`  ${monthsAgo} months ago: ${pastListings.length} sales, median $${pastMedian.toLocaleString()}`);
  console.log(`  Trend: ${trend > 0 ? '+' : ''}${trend.toFixed(2)}%`);

  return trend;
}

// Example with fake data to show the concept
const exampleListings: Listing[] = [
  // Current month
  { price: 220000, sold_date: '2025-08-15' },
  { price: 225000, sold_date: '2025-08-10' },
  // 3 months ago
  { price: 190000, sold_date: '2025-05-15' },
  { price: 185000, sold_date: '2025-05-10' },
  // 6 months ago
  { price: 180000, sold_date: '2025-02-15' },
  { price: 175000, sold_date: '2025-02-10' },
  // 1 year ago
  { price: 190000, sold_date: '2024-08-15' },
  { price: 195000, sold_date: '2024-08-10' },
];

console.log('PROPER STOCK-LIKE TREND CALCULATIONS');
console.log('━'.repeat(60));
console.log('\nHow it SHOULD work:');
console.log('  - Compare current prices to specific past periods');
console.log('  - Use consistent windows (e.g., 30 days)');
console.log('  - No overlapping or confusing date ranges');
console.log('\nExample calculations:\n');

const currentDate = new Date('2025-08-27');
calculateStockLikeTrend(exampleListings, currentDate, 3);
console.log();
calculateStockLikeTrend(exampleListings, currentDate, 6);
console.log();
calculateStockLikeTrend(exampleListings, currentDate, 12);

console.log('\n' + '━'.repeat(60));
console.log('The PROBLEM with current code:');
console.log('  - 3M trend compares months 0-2 to months 2-5 (overlap!)');
console.log('  - 6M trend compares months 0-2 to months 5-8');
console.log('  - Windows are inconsistent and confusing');
console.log('  - This causes illogical results like 3M = 6M trends');