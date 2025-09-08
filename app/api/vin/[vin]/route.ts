import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vin: string }> }
) {
  try {
    const { vin } = await params;
    const supabase = await createClient();

    // Validate VIN format
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
    if (!vinRegex.test(vin)) {
      return NextResponse.json(
        { error: 'Invalid VIN format' },
        { status: 400 }
      );
    }

    // Get all listings for this VIN
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select(`
        id,
        vin,
        title,
        price,
        mileage,
        source,
        source_url,
        status,
        sold_date,
        sold_price,
        first_seen_at,
        last_seen_at,
        removed_at,
        model_years (
          year,
          models (name),
          trims (name)
        ),
        colors (name, is_pts)
      `)
      .eq('vin', vin.toUpperCase())
      .order('first_seen_at', { ascending: false });

    if (listingsError) throw listingsError;

    // Get price history for this VIN
    const { data: priceHistory, error: historyError } = await supabase
      .from('price_history')
      .select('*')
      .eq('vin', vin.toUpperCase())
      .order('observed_at', { ascending: true });

    if (historyError) throw historyError;

    // Format response
    const response = {
      vin: vin.toUpperCase(),
      listings: listings || [],
      priceHistory: priceHistory || [],
      summary: {
        firstSeen: listings?.[0]?.first_seen_at,
        lastSeen: listings?.[0]?.last_seen_at,
        lowestPrice: priceHistory?.length > 0 
          ? Math.min(...priceHistory.map(p => p.price))
          : null,
        highestPrice: priceHistory?.length > 0
          ? Math.max(...priceHistory.map(p => p.price))
          : null,
        currentPrice: listings?.[0]?.price,
        sold: listings?.some(l => l.status === 'sold'),
        soldPrice: listings?.find(l => l.status === 'sold')?.sold_price,
        soldDate: listings?.find(l => l.status === 'sold')?.sold_date,
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('VIN lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VIN data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}