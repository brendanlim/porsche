import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
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
        const modelYearIds = trim.model_years?.map((my: any) => my.id) || [];
        
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

        // Get listings for this trim
        const { data: listings, error: listingsError } = await supabaseAdmin
          .from('listings')
          .select('price, mileage, created_at, status')
          .in('model_year_id', modelYearIds)
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

        // Count active vs sold
        const activeCount = listings.filter(l => l.status === 'active').length;
        const soldCount = listings.filter(l => l.status === 'sold').length;

        // Calculate appreciation (mock for now)
        let appreciation = 0;
        const trimName = trim.name.toLowerCase();
        if (trimName.includes('gt3 rs')) appreciation = 12.5;
        else if (trimName.includes('gt3')) appreciation = 8.3;
        else if (trimName.includes('gt4 rs')) appreciation = 15.2;
        else if (trimName.includes('gt4')) appreciation = 7.1;
        else if (trimName.includes('spyder rs')) appreciation = 13.8;
        else if (trimName.includes('turbo s')) appreciation = 4.2;
        else if (trimName.includes('turbo')) appreciation = 3.8;
        else if (trimName.includes('gts')) appreciation = 5.5;
        else if (trimName.includes('carrera 4s')) appreciation = 3.2;
        else if (trimName.includes('carrera s')) appreciation = 2.8;
        else if (trimName.includes('carrera')) appreciation = 2.1;

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

    // Sort by performance tier and listing count
    const sortedTrims = trimStats.sort((a, b) => {
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