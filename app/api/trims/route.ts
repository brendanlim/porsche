import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // Fetch all trims with their models and listing counts
    const { data: trims, error: trimsError } = await supabaseAdmin
      .from('trims')
      .select(`
        *,
        models!inner(
          name,
          manufacturers!inner(name)
        ),
        model_years(
          id,
          year
        )
      `)
      .eq('models.manufacturers.name', 'Porsche')
      .order('is_high_performance', { ascending: false })
      .order('name');

    if (trimsError) throw trimsError;

    // Get listing stats for each trim
    const trimStats = await Promise.all(
      trims.map(async (trim) => {
        const modelYearIds = trim.model_years?.map((my: { id: string }) => my.id) || [];
        
        if (modelYearIds.length === 0) {
          return {
            ...trim,
            stats: {
              totalListings: 0,
              averagePrice: 0,
              minPrice: 0,
              maxPrice: 0,
              averageMileage: 0,
              appreciation: 0,
              recentListings: 0
            }
          };
        }

        // Get listings for this trim by model and trim name (not model_year_id)
        // Only include sold listings (those with a sold_date)
        const modelName = trim.models.name;
        const trimName = trim.name;

        const { data: listings, error: listingsError } = await supabaseAdmin
          .from('listings')
          .select('price, mileage, created_at, status, sold_date')
          .ilike('model', modelName)
          .ilike('trim', `%${trimName}%`)
          .not('sold_date', 'is', null)
          .gt('price', 0);

        if (listingsError || !listings || listings.length === 0) {
          return {
            ...trim,
            stats: {
              totalListings: 0,
              averagePrice: 0,
              minPrice: 0,
              maxPrice: 0,
              averageMileage: 0,
              appreciation: 0,
              recentListings: 0
            }
          };
        }

        const prices = listings.map(l => l.price).filter(p => p > 0);
        const mileages = listings.map(l => l.mileage).filter(m => m > 0);
        
        // Count recent listings (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentListings = listings.filter(l => 
          new Date(l.created_at) > thirtyDaysAgo
        ).length;

        // All listings here are sold (we filtered for sold_date not null)
        const soldCount = listings.length;
        const activeCount = 0; // We're not tracking active listings yet

        // Calculate real YoY appreciation based on sold prices
        let appreciation = 0;

        if (listings.length >= 10) { // Need minimum data for meaningful calculation
          const now = new Date();
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

          const recentSales = listings.filter(l =>
            new Date(l.sold_date!) > oneYearAgo && new Date(l.sold_date!) <= now
          );
          const olderSales = listings.filter(l =>
            new Date(l.sold_date!) > twoYearsAgo && new Date(l.sold_date!) <= oneYearAgo
          );

          const recentPrices = recentSales.map(l => l.price).filter(p => p > 0);
          const olderPrices = olderSales.map(l => l.price).filter(p => p > 0);

          if (recentPrices.length >= 3 && olderPrices.length >= 3) {
            const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
            const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
            appreciation = ((recentAvg - olderAvg) / olderAvg) * 100;
          }
        }

        return {
          ...trim,
          model: trim.models.name,
          stats: {
            totalListings: listings.length,
            activeListings: activeCount,
            soldListings: soldCount,
            averagePrice: prices.length > 0 
              ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
              : 0,
            minPrice: prices.length > 0 ? Math.min(...prices) : 0,
            maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
            averageMileage: mileages.length > 0
              ? Math.round(mileages.reduce((a, b) => a + b, 0) / mileages.length)
              : 0,
            appreciation,
            recentListings,
            marketHeat: recentListings > 10 ? 'hot' : recentListings > 5 ? 'warm' : 'cool'
          }
        };
      })
    );

    // Filter out trims with no sold listings and sort by performance tier and listing count
    const sortedTrims = trimStats
      .filter(trim => trim.stats.totalListings > 0) // Only show trims with sold listings
      .sort((a, b) => {
        // GT models first
        if (a.is_high_performance && !b.is_high_performance) return -1;
        if (!a.is_high_performance && b.is_high_performance) return 1;

        // Then by listing count
        return b.stats.totalListings - a.stats.totalListings;
      });

    return NextResponse.json(sortedTrims);
  } catch (error) {
    console.error('Trims API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trims' },
      { status: 500 }
    );
  }
}