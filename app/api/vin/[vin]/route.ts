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
        model,
        trim,
        year,
        price,
        mileage,
        source,
        source_url,
        list_date,
        sold_date,
        created_at,
        scraped_at,
        options_text
      `)
      .eq('vin', vin.toUpperCase())
      .order('created_at', { ascending: false });

    if (listingsError) throw listingsError;

    // Build price history from listings (we don't have a separate price_history table)
    const priceHistory = listings?.map(listing => ({
      id: listing.id,
      price: listing.price,
      observed_at: listing.created_at,
      source: listing.source
    })).filter(p => p.price > 0) || [];

    // Format response
    const soldListing = listings?.find(l => l.sold_date);
    const mostRecent = listings?.[0];
    const oldest = listings?.[listings.length - 1];
    
    const response = {
      vin: vin.toUpperCase(),
      listings: listings || [],
      priceHistory: priceHistory || [],
      summary: {
        model: mostRecent?.model,
        trim: mostRecent?.trim,
        year: mostRecent?.year,
        firstSeen: oldest?.created_at,
        lastSeen: mostRecent?.created_at,
        lowestPrice: priceHistory?.length > 0 
          ? Math.min(...priceHistory.map(p => p.price))
          : null,
        highestPrice: priceHistory?.length > 0
          ? Math.max(...priceHistory.map(p => p.price))
          : null,
        currentPrice: mostRecent?.price,
        sold: !!soldListing,
        soldPrice: soldListing?.price,
        soldDate: soldListing?.sold_date,
        totalListings: listings?.length || 0
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