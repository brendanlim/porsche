#!/usr/bin/env npx tsx

import { supabaseAdmin } from '../../lib/supabase/admin';

async function debugAppreciation() {
  const model = '718 cayman';
  const trim = 'gt4 rs';

  console.log(`Debugging appreciation for ${model} ${trim}\n`);

  // Get all listings for this model/trim
  const { data: listings, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .ilike('model', model)
    .ilike('trim', trim)
    .not('sold_date', 'is', null)
    .order('sold_date', { ascending: false });

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log(`Total listings with sold_date: ${listings?.length || 0}\n`);

  if (!listings || listings.length === 0) {
    console.log('No listings found');
    return;
  }

  // Group by date ranges
  const now = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const prevMonthStart = new Date();
  prevMonthStart.setDate(prevMonthStart.getDate() - 37);
  const prevMonthEnd = new Date();
  prevMonthEnd.setDate(prevMonthEnd.getDate() - 30);
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const prevYearStart = new Date();
  prevYearStart.setDate(prevYearStart.getDate() - 372);
  const prevYearEnd = new Date();
  prevYearEnd.setDate(prevYearEnd.getDate() - 365);

  // Categorize listings
  const currentWeek = listings.filter(l => l.sold_date && new Date(l.sold_date) >= oneWeekAgo);
  const prevWeek = listings.filter(l => l.sold_date && new Date(l.sold_date) >= twoWeeksAgo && new Date(l.sold_date) < oneWeekAgo);
  const prevMonth = listings.filter(l => l.sold_date && new Date(l.sold_date) >= prevMonthStart && new Date(l.sold_date) < prevMonthEnd);
  const prevYear = listings.filter(l => l.sold_date && new Date(l.sold_date) >= prevYearStart && new Date(l.sold_date) < prevYearEnd);

  console.log('Data availability:');
  console.log(`- Current week (last 7 days): ${currentWeek.length} listings`);
  console.log(`- Previous week (7-14 days ago): ${prevWeek.length} listings`);
  console.log(`- Previous month (30-37 days ago): ${prevMonth.length} listings`);
  console.log(`- Previous year (365-372 days ago): ${prevYear.length} listings`);
  console.log('');

  // Show date ranges for clarity
  console.log('Date ranges being checked:');
  console.log(`- Current week: ${oneWeekAgo.toISOString().split('T')[0]} to today`);
  console.log(`- Previous week: ${twoWeeksAgo.toISOString().split('T')[0]} to ${oneWeekAgo.toISOString().split('T')[0]}`);
  console.log(`- Previous month: ${prevMonthStart.toISOString().split('T')[0]} to ${prevMonthEnd.toISOString().split('T')[0]}`);
  console.log(`- Previous year: ${prevYearStart.toISOString().split('T')[0]} to ${prevYearEnd.toISOString().split('T')[0]}`);
  console.log('');

  // Show actual sold_dates in the data
  const soldDates = listings.map(l => l.sold_date).filter(d => d).sort();
  console.log('Date range of available data:');
  console.log(`- Earliest sold_date: ${soldDates[0]}`);
  console.log(`- Latest sold_date: ${soldDates[soldDates.length - 1]}`);
  console.log('');

  // Calculate averages where we have data
  const calcAvg = (items: any[]) => {
    const validPrices = items.filter(l => l.sold_price || l.price).map(l => l.sold_price || l.price);
    return validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
  };

  if (currentWeek.length > 0) {
    console.log(`Current week avg price: $${calcAvg(currentWeek).toLocaleString()}`);
  }
  if (prevWeek.length > 0) {
    console.log(`Previous week avg price: $${calcAvg(prevWeek).toLocaleString()}`);
  }
  if (prevMonth.length > 0) {
    console.log(`Previous month avg price: $${calcAvg(prevMonth).toLocaleString()}`);
  }
  if (prevYear.length > 0) {
    console.log(`Previous year avg price: $${calcAvg(prevYear).toLocaleString()}`);
  }

  // Show sample of recent listings
  console.log('\nMost recent 5 listings:');
  listings.slice(0, 5).forEach(l => {
    const price = l.sold_price || l.price;
    console.log(`- ${l.sold_date}: $${price?.toLocaleString()} (${l.year} ${l.model} ${l.trim})`);
  });
}

debugAppreciation().catch(console.error);