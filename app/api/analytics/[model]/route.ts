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

    // Fetch all listings for this model - join with model_years and models tables
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
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

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

    // Filter listings by model name
    const filteredListings = listings.filter(l => {
      const listingModel = l.model_years?.models?.name?.toLowerCase() || '';
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

    // Market trends over time (group by day)
    const trendsByDay = new Map();
    filteredListings.forEach(listing => {
      const date = new Date(listing.created_at).toISOString().split('T')[0];
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

    // Trim analysis
    const trimGroups = new Map();
    filteredListings.forEach(listing => {
      const trim = listing.trims?.name || 'Base';
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
        // Track recent vs older prices for change calculation
        const listingDate = new Date(listing.created_at);
        const daysAgo = (now.getTime() - listingDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysAgo <= 7) {
          group.recentPrices.push(listing.price);
        } else if (daysAgo >= 23 && daysAgo <= 30) {
          group.olderPrices.push(listing.price);
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

    // Year analysis
    const yearGroups = new Map();
    filteredListings.forEach(listing => {
      const year = listing.model_years?.year;
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
        trim: l.trims?.name || 'Base',
        year: l.model_years?.year || 0
      }));

    // Top performers (highest prices, appreciation calculation would need historical data)
    const topPerformers = filteredListings
      .filter(l => l.price > 0 && l.vin)
      .sort((a, b) => b.price - a.price)
      .slice(0, 10)
      .map(l => {
        // Simple appreciation estimate based on year and average depreciation
        const year = l.model_years?.year || 2020;
        const age = new Date().getFullYear() - year;
        const expectedDepreciation = age * 0.05; // 5% per year typical
        const msrp = l.price / (1 - expectedDepreciation); // Rough MSRP estimate
        const appreciation = ((l.price - msrp * 0.7) / (msrp * 0.7)) * 100; // vs 70% of MSRP baseline
        
        return {
          vin: l.vin,
          year: year,
          trim: l.trims?.name || 'Base',
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