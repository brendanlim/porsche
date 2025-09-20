import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get('range') || '30d';

  try {
    // Get date range based on sold_date, not scraped_at
    const now = new Date();
    const startDate = new Date();
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2000); // Effectively all time
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Fetch listings with proper joins - filter by sold_date for accurate analytics
    const { data: listings, error: listingsError } = await supabaseAdmin
      .from('listings')
      .select(`
        *,
        model_years!inner (
          year,
          models!inner (
            name
          )
        ),
        trims (
          name
        )
      `)
      .gte('sold_date', startDate.toISOString())
      .lte('sold_date', now.toISOString())
      .order('sold_date', { ascending: false });

    if (listingsError) throw listingsError;

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        kpis: {
          totalSales: 0,
          averagePrice: 0,
          medianPrice: 0,
          totalVolume: 0,
          averageDaysToSell: 0,
          topModel: null,
          topTrim: null,
          priceChange30d: 0,
          volumeChange30d: 0
        },
        recentSales: [],
        modelDistribution: [],
        trimDistribution: [],
        priceRanges: [],
        dailyVolume: [],
        monthlyTrends: []
      });
    }

    // Calculate KPIs
    const prices = listings.map(l => l.price).filter(p => p > 0).sort((a, b) => a - b);
    const totalSales = listings.length;
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const medianPrice = prices[Math.floor(prices.length / 2)];
    const totalVolume = prices.reduce((a, b) => a + b, 0);

    // Calculate average days to sell (if we have list_date and sold_date)
    const daysToSellArray = listings
      .filter(l => l.list_date && l.sold_date)
      .map(l => {
        const listDate = new Date(l.list_date);
        const soldDate = new Date(l.sold_date);
        return Math.round((soldDate.getTime() - listDate.getTime()) / (1000 * 60 * 60 * 24));
      })
      .filter(days => days > 0 && days < 365); // Filter out unrealistic values

    const averageDaysToSell = daysToSellArray.length > 0
      ? Math.round(daysToSellArray.reduce((a, b) => a + b, 0) / daysToSellArray.length)
      : 0;

    // Find top model and trim
    const modelCounts = new Map<string, number>();
    const trimCounts = new Map<string, number>();

    listings.forEach(l => {
      const model = l.model_years?.models?.name;
      const trim = l.trims?.name || 'Base';

      if (model) {
        modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
      }
      trimCounts.set(trim, (trimCounts.get(trim) || 0) + 1);
    });

    const topModel = Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const topTrim = Array.from(trimCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Calculate 30-day price and volume changes
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);

    // Current 30-day period
    const currentPeriodListings = listings.filter(l =>
      new Date(l.sold_date) >= thirtyDaysAgo
    );

    // Previous 30-day period (30-60 days ago)
    const { data: previousPeriodListings } = await supabaseAdmin
      .from('listings')
      .select('price, sold_date')
      .gte('sold_date', sixtyDaysAgo.toISOString())
      .lt('sold_date', thirtyDaysAgo.toISOString());

    let priceChange30d = 0;
    let volumeChange30d = 0;

    if (previousPeriodListings && previousPeriodListings.length > 0) {
      const currentAvgPrice = currentPeriodListings
        .filter(l => l.price > 0)
        .reduce((sum, l) => sum + l.price, 0) / currentPeriodListings.length;

      const previousAvgPrice = previousPeriodListings
        .filter(l => l.price > 0)
        .reduce((sum, l) => sum + l.price, 0) / previousPeriodListings.length;

      priceChange30d = previousAvgPrice > 0
        ? ((currentAvgPrice - previousAvgPrice) / previousAvgPrice) * 100
        : 0;

      volumeChange30d = previousPeriodListings.length > 0
        ? ((currentPeriodListings.length - previousPeriodListings.length) / previousPeriodListings.length) * 100
        : 0;
    }

    // Recent sales (last 10)
    const recentSales = listings
      .slice(0, 10)
      .map(l => ({
        id: l.id,
        model: l.model_years?.models?.name || 'Unknown',
        trim: l.trims?.name || 'Base',
        year: l.model_years?.year || 0,
        price: l.price,
        mileage: l.mileage,
        soldDate: l.sold_date,
        vin: l.vin,
        color: l.color
      }));

    // Model distribution for pie chart
    const modelDistribution = Array.from(modelCounts.entries())
      .map(([model, count]) => ({
        model,
        count,
        percentage: (count / totalSales) * 100,
        avgPrice: listings
          .filter(l => l.model_years?.models?.name === model && l.price > 0)
          .reduce((sum, l, _, arr) => sum + l.price / arr.length, 0)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 models

    // Trim distribution for bar chart
    const trimDistribution = Array.from(trimCounts.entries())
      .map(([trim, count]) => ({
        trim,
        count,
        avgPrice: listings
          .filter(l => (l.trims?.name || 'Base') === trim && l.price > 0)
          .reduce((sum, l, _, arr) => sum + l.price / arr.length, 0)
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 15); // Top 15 trims by price

    // Price range distribution
    const priceRanges = [
      { range: '$0-100k', min: 0, max: 100000, count: 0 },
      { range: '$100-200k', min: 100000, max: 200000, count: 0 },
      { range: '$200-300k', min: 200000, max: 300000, count: 0 },
      { range: '$300-500k', min: 300000, max: 500000, count: 0 },
      { range: '$500k+', min: 500000, max: Infinity, count: 0 }
    ];

    listings.forEach(l => {
      if (l.price > 0) {
        const range = priceRanges.find(r => l.price >= r.min && l.price < r.max);
        if (range) range.count++;
      }
    });

    // Daily volume for line chart
    const dailyVolumeMap = new Map<string, { count: number; volume: number; avgPrice: number }>();

    listings.forEach(l => {
      const date = new Date(l.sold_date).toISOString().split('T')[0];
      if (!dailyVolumeMap.has(date)) {
        dailyVolumeMap.set(date, { count: 0, volume: 0, avgPrice: 0 });
      }
      const day = dailyVolumeMap.get(date)!;
      day.count++;
      if (l.price > 0) {
        day.volume += l.price;
      }
    });

    const dailyVolume = Array.from(dailyVolumeMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        volume: data.volume,
        avgPrice: data.volume / data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    // Monthly trends for area chart
    const monthlyTrendsMap = new Map<string, { sales: number; avgPrice: number; totalVolume: number }>();

    listings.forEach(l => {
      const month = new Date(l.sold_date).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyTrendsMap.has(month)) {
        monthlyTrendsMap.set(month, { sales: 0, avgPrice: 0, totalVolume: 0 });
      }
      const monthData = monthlyTrendsMap.get(month)!;
      monthData.sales++;
      if (l.price > 0) {
        monthData.totalVolume += l.price;
      }
    });

    const monthlyTrends = Array.from(monthlyTrendsMap.entries())
      .map(([month, data]) => ({
        month,
        sales: data.sales,
        avgPrice: data.totalVolume / data.sales,
        totalVolume: data.totalVolume
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    return NextResponse.json({
      kpis: {
        totalSales,
        averagePrice,
        medianPrice,
        totalVolume,
        averageDaysToSell,
        topModel,
        topTrim,
        priceChange30d,
        volumeChange30d
      },
      recentSales,
      modelDistribution,
      trimDistribution,
      priceRanges,
      dailyVolume,
      monthlyTrends,
      timeRange: range,
      dataFrom: startDate.toISOString(),
      dataTo: now.toISOString()
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard analytics' },
      { status: 500 }
    );
  }
}