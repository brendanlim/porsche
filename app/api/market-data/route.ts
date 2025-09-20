import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const model = searchParams.get('model');
    const trim = searchParams.get('trim');
    const generation = searchParams.get('generation');
    const yearMin = searchParams.get('year_min');
    const yearMax = searchParams.get('year_max');
    const priceMin = searchParams.get('price_min');
    const priceMax = searchParams.get('price_max');
    const mileageMax = searchParams.get('mileage_max');
    const state = searchParams.get('state');
    const limit = parseInt(searchParams.get('limit') || '500');

    // Build query
    let query = supabase
      .from('listings')
      .select(`
        id,
        vin,
        title,
        price,
        mileage,
        year,
        model,
        trim,
        generation,
        exterior_color,
        city,
        state,
        source,
        source_url,
        sold_date,
        scraped_at
      `)
      .order('price', { ascending: true })
      .gt('price', 0)
      .not('sold_date', 'is', null)
      .limit(limit);

    // Apply filters
    if (model) {
      query = query.ilike('model', `%${model}%`);
    }
    if (trim) {
      query = query.ilike('trim', `%${trim}%`);
    }
    if (generation) {
      query = query.eq('generation', generation);
    }
    if (yearMin) {
      query = query.gte('year', parseInt(yearMin));
    }
    if (yearMax) {
      query = query.lte('year', parseInt(yearMax));
    }
    if (priceMin) {
      query = query.gte('price', parseInt(priceMin));
    }
    if (priceMax) {
      query = query.lte('price', parseInt(priceMax));
    }
    if (mileageMax) {
      query = query.lte('mileage', parseInt(mileageMax));
    }
    if (state) {
      query = query.eq('state', state.toUpperCase());
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform data for chart
    const chartData = data?.map(listing => ({
      x: listing.mileage || 0,
      y: listing.price,
      vin: listing.vin,
      title: listing.title || `${listing.year} ${listing.model} ${listing.trim}`,
      color: listing.exterior_color,
      source: listing.source,
      url: listing.source_url,
      year: listing.year,
      trim: listing.trim,
      generation: listing.generation,
      isPTS: false,
      location: listing.city && listing.state ? `${listing.city}, ${listing.state}` : undefined
    })) || [];

    // Calculate statistics
    const prices = data?.map(d => d.price) || [];
    const stats = {
      count: prices.length,
      avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      medianPrice: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    };

    return NextResponse.json({
      success: true,
      data: chartData,
      stats,
      filters: {
        model,
        trim,
        generation,
        yearMin,
        yearMax,
        priceMin,
        priceMax,
        mileageMax,
        state
      }
    });
  } catch (error) {
    console.error('Market data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}