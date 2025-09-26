import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  const { model } = await params;
  const searchParams = request.nextUrl.searchParams;
  const range = searchParams.get('range') || '30d';
  
  // Convert model from URL format (e.g., "911" or "718-cayman")
  const modelName = model.replace('-', ' ');
  
  try {
    // Get date range
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
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Fetch all SOLD listings for this model - use denormalized columns for better performance
    // Filter by sold_date to ensure we're analyzing cars that actually sold in the time period
    const { data: listings, error: listingsError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .gte('sold_date', startDate.toISOString().split('T')[0]) // Use sold_date for filtering
      .not('sold_date', 'is', null) // Only include listings with a sold_date
      .order('sold_date', { ascending: false });

    if (listingsError) throw listingsError;

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        model: modelName,
        totalListings: 0,
        averagePrice: 0,
        medianPrice: 0,
        priceRange: { min: 0, max: 0 },
        averageMileage: 0,
        marketTrends: [],
        trimAnalysis: [],
        yearAnalysis: [],
        priceVsMileage: [],
        topPerformers: []
      });
    }

    // Filter listings by model name using denormalized model column
    const filteredListings = listings.filter(l => {
      const listingModel = l.model?.toLowerCase() || '';
      return listingModel.includes(modelName.toLowerCase()) ||
             listingModel.includes(model.replace('-', ' ').toLowerCase());
    });

    if (filteredListings.length === 0) {
      return NextResponse.json({
        model: modelName,
        totalListings: 0,
        averagePrice: 0,
        medianPrice: 0,
        priceRange: { min: 0, max: 0 },
        averageMileage: 0,
        marketTrends: [],
        trimAnalysis: [],
        yearAnalysis: [],
        priceVsMileage: [],
        topPerformers: []
      });
    }

    // Calculate basic metrics
    const prices = filteredListings.map(l => l.price).filter(p => p > 0).sort((a, b) => a - b);
    const mileages = filteredListings.map(l => l.mileage).filter(m => m > 0);

    const totalListings = filteredListings.length;
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const medianPrice = prices[Math.floor(prices.length / 2)];
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
    const averageMileage = mileages.reduce((a, b) => a + b, 0) / mileages.length;

    // Calculate appreciation metrics (WoW, MoM, YoY)
    // 'now' is already declared above, reuse it
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Get recent listings (last 30 days) for current baseline
    const recentListings = filteredListings.filter(l =>
      l.sold_date && new Date(l.sold_date) >= oneMonthAgo
    );
    const currentAvg = recentListings.length > 0
      ? recentListings.reduce((sum, l) => sum + l.price, 0) / recentListings.length
      : averagePrice;

    // Week-over-week: Compare last 7 days to previous 7 days
    const currentWeekListings = filteredListings.filter(l =>
      l.sold_date && new Date(l.sold_date) >= oneWeekAgo
    );
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const prevWeekListings = filteredListings.filter(l =>
      l.sold_date && new Date(l.sold_date) >= twoWeeksAgo && new Date(l.sold_date) < oneWeekAgo
    );

    let wowAppreciation = 0;
    if (currentWeekListings.length > 0 && prevWeekListings.length > 0) {
      const currentWeekAvg = currentWeekListings.reduce((sum, l) => sum + l.price, 0) / currentWeekListings.length;
      const prevWeekAvg = prevWeekListings.reduce((sum, l) => sum + l.price, 0) / prevWeekListings.length;
      wowAppreciation = ((currentWeekAvg - prevWeekAvg) / prevWeekAvg) * 100;
    }

    // Month-over-month: Compare last 30 days to previous 30 days
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const currentMonthListings = filteredListings.filter(l =>
      l.sold_date && new Date(l.sold_date) >= oneMonthAgo
    );
    const prevMonthListings = filteredListings.filter(l =>
      l.sold_date && new Date(l.sold_date) >= twoMonthsAgo && new Date(l.sold_date) < oneMonthAgo
    );

    let momAppreciation = 0;
    if (currentMonthListings.length > 0 && prevMonthListings.length > 0) {
      const currentMonthAvg = currentMonthListings.reduce((sum, l) => sum + l.price, 0) / currentMonthListings.length;
      const prevMonthAvg = prevMonthListings.reduce((sum, l) => sum + l.price, 0) / prevMonthListings.length;
      momAppreciation = ((currentMonthAvg - prevMonthAvg) / prevMonthAvg) * 100;
    } else if (filteredListings.length >= 4) {
      // Fallback: If we don't have exact month-over-month data, estimate from available data
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const recentListings = filteredListings.filter(l =>
        l.sold_date && new Date(l.sold_date) >= oneMonthAgo
      );
      const olderListings = filteredListings.filter(l =>
        l.sold_date && new Date(l.sold_date) < oneMonthAgo && new Date(l.sold_date) >= sixMonthsAgo
      );

      if (recentListings.length > 0 && olderListings.length > 0) {
        const recentAvg = recentListings.reduce((sum, l) => sum + l.price, 0) / recentListings.length;
        const olderAvg = olderListings.reduce((sum, l) => sum + l.price, 0) / olderListings.length;

        // Calculate average date for older listings
        const avgOlderDate = new Date(
          olderListings.reduce((sum, l) => sum + new Date(l.sold_date).getTime(), 0) / olderListings.length
        );
        const monthsDiff = (now.getTime() - avgOlderDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

        // Scale to monthly trend
        const totalTrend = ((recentAvg - olderAvg) / olderAvg) * 100;
        momAppreciation = totalTrend / monthsDiff;
      }
    }

    // Year-over-year: Compare recent average to same period last year (with wider window)
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);
    const elevenMonthsAgo = new Date();
    elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);

    // Get listings from around a year ago (11-13 months ago)
    const yearAgoListings = filteredListings.filter(l =>
      l.sold_date &&
      new Date(l.sold_date) >= thirteenMonthsAgo &&
      new Date(l.sold_date) <= elevenMonthsAgo
    );

    let yoyAppreciation = 0;
    if (recentListings.length > 0 && yearAgoListings.length > 0) {
      const yearAgoAvg = yearAgoListings.reduce((sum, l) => sum + l.price, 0) / yearAgoListings.length;
      yoyAppreciation = ((currentAvg - yearAgoAvg) / yearAgoAvg) * 100;
    } else if (filteredListings.length >= 4) {
      // Fallback: If we don't have data from exactly 1 year ago, find any older data
      const sixteenMonthsAgo = new Date();
      sixteenMonthsAgo.setMonth(sixteenMonthsAgo.getMonth() - 16);

      const olderListings = filteredListings.filter(l =>
        l.sold_date &&
        new Date(l.sold_date) < elevenMonthsAgo &&
        new Date(l.sold_date) >= sixteenMonthsAgo
      );

      if (recentListings.length > 0 && olderListings.length > 0) {
        const olderAvg = olderListings.reduce((sum, l) => sum + l.price, 0) / olderListings.length;

        // Calculate average date for older listings
        const avgOlderDate = new Date(
          olderListings.reduce((sum, l) => sum + new Date(l.sold_date).getTime(), 0) / olderListings.length
        );
        const monthsDiff = (now.getTime() - avgOlderDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

        // Scale to 12 month equivalent
        const totalTrend = ((currentAvg - olderAvg) / olderAvg) * 100;
        yoyAppreciation = (totalTrend / monthsDiff) * 12;
      }
    }

    // Market trends over time (group by day) - use sold_date for accurate market analysis
    const trendsByDay = new Map();
    filteredListings.forEach(listing => {
      // Use sold_date for market trends - this shows when cars actually sold
      const date = listing.sold_date ? new Date(listing.sold_date).toISOString().split('T')[0] : null;
      if (!date) return; // Skip listings without sold_date

      if (!trendsByDay.has(date)) {
        trendsByDay.set(date, {
          prices: [],
          mileages: [],
          count: 0
        });
      }
      const day = trendsByDay.get(date);
      if (listing.price > 0) day.prices.push(listing.price);
      if (listing.mileage > 0) day.mileages.push(listing.mileage);
      day.count++;
    });

    const marketTrends = Array.from(trendsByDay.entries())
      .map(([date, data]) => ({
        date,
        averagePrice: data.prices.length > 0 ? data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length : 0,
        listingCount: data.count,
        medianMileage: data.mileages.length > 0 ? data.mileages.sort((a: number, b: number) => a - b)[Math.floor(data.mileages.length / 2)] : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Trim analysis using denormalized trim column
    const trimGroups = new Map();
    filteredListings.forEach(listing => {
      const trim = listing.trim || 'Base';
      if (!trimGroups.has(trim)) {
        trimGroups.set(trim, {
          prices: [],
          mileages: [],
          count: 0,
          recentPrices: [],
          olderPrices: []
        });
      }
      const group = trimGroups.get(trim);
      if (listing.price > 0) {
        group.prices.push(listing.price);
        // Track recent vs older prices for change calculation - use sold_date
        if (listing.sold_date) {
          const soldDate = new Date(listing.sold_date);
          const daysAgo = (now.getTime() - soldDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysAgo <= 7) {
            group.recentPrices.push(listing.price);
          } else if (daysAgo >= 23 && daysAgo <= 30) {
            group.olderPrices.push(listing.price);
          }
        }
      }
      if (listing.mileage > 0) group.mileages.push(listing.mileage);
      group.count++;
    });

    const trimAnalysis = Array.from(trimGroups.entries())
      .map(([trim, data]) => {
        const avgPrice = data.prices.length > 0 ? data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length : 0;
        const avgMileage = data.mileages.length > 0 ? data.mileages.reduce((a: number, b: number) => a + b, 0) / data.mileages.length : 0;
        
        // Calculate price change
        let priceChange = 0;
        if (data.recentPrices.length > 0 && data.olderPrices.length > 0) {
          const recentAvg = data.recentPrices.reduce((a: number, b: number) => a + b, 0) / data.recentPrices.length;
          const olderAvg = data.olderPrices.reduce((a: number, b: number) => a + b, 0) / data.olderPrices.length;
          priceChange = ((recentAvg - olderAvg) / olderAvg) * 100;
        }
        
        return {
          trim,
          count: data.count,
          avgPrice,
          avgMileage,
          priceChange
        };
      })
      .sort((a, b) => b.avgPrice - a.avgPrice);

    // Year analysis using denormalized year column
    const yearGroups = new Map();
    filteredListings.forEach(listing => {
      const year = listing.year;
      if (!year) return;
      
      if (!yearGroups.has(year)) {
        yearGroups.set(year, {
          prices: [],
          mileages: [],
          count: 0
        });
      }
      const group = yearGroups.get(year);
      if (listing.price > 0) group.prices.push(listing.price);
      if (listing.mileage > 0) group.mileages.push(listing.mileage);
      group.count++;
    });

    const yearAnalysis = Array.from(yearGroups.entries())
      .map(([year, data]) => ({
        year,
        count: data.count,
        avgPrice: data.prices.length > 0 ? data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length : 0,
        avgMileage: data.mileages.length > 0 ? data.mileages.reduce((a: number, b: number) => a + b, 0) / data.mileages.length : 0
      }))
      .sort((a, b) => b.year - a.year);

    // Price vs Mileage scatter data
    const priceVsMileage = filteredListings
      .filter(l => l.price > 0 && l.mileage > 0)
      .map(l => ({
        mileage: l.mileage,
        price: l.price,
        trim: l.trim || 'Base',
        year: l.year || 0
      }));

    // Top performers (highest prices, appreciation calculation would need historical data)
    const topPerformers = filteredListings
      .filter(l => l.price > 0 && l.vin)
      .sort((a, b) => b.price - a.price)
      .slice(0, 10)
      .map(l => {
        // Simple appreciation estimate based on year and average depreciation
        const year = l.year || 2020;
        const age = new Date().getFullYear() - year;
        const expectedDepreciation = age * 0.05; // 5% per year typical
        const msrp = l.price / (1 - expectedDepreciation); // Rough MSRP estimate
        const appreciation = ((l.price - msrp * 0.7) / (msrp * 0.7)) * 100; // vs 70% of MSRP baseline

        return {
          vin: l.vin,
          year: year,
          trim: l.trim || 'Base',
          price: l.price,
          mileage: l.mileage || 0,
          appreciation: appreciation
        };
      });

    return NextResponse.json({
      model: modelName,
      totalListings,
      averagePrice,
      medianPrice,
      priceRange,
      averageMileage,
      wowAppreciation,
      momAppreciation,
      yoyAppreciation,
      marketTrends,
      trimAnalysis,
      yearAnalysis,
      priceVsMileage,
      topPerformers
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}