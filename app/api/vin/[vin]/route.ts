import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  decodePorscheVIN,
  formatDecodedVIN,
  getTrimFromVIN
} from '@/lib/utils/porsche-vin-decoder';

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

    // Decode VIN using our Porsche decoder
    const decodedVIN = decodePorscheVIN(vin);
    const formattedVIN = formatDecodedVIN(decodedVIN);
    // const modelDisplay = getModelDisplay(decodedVIN);
    const trimDisplay = getTrimFromVIN(decodedVIN);

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
    
    // If we have no listings but valid VIN decode, consider storing it for future reference
    const hasListings = listings && listings.length > 0;

    const response = {
      vin: vin.toUpperCase(),
      decodedVIN: decodedVIN,
      formattedDescription: formattedVIN,
      listings: listings || [],
      priceHistory: priceHistory || [],
      summary: {
        model: mostRecent?.model || decodedVIN.model,
        trim: mostRecent?.trim || trimDisplay,
        year: mostRecent?.year || decodedVIN.modelYear,
        generation: decodedVIN.generation,
        bodyStyle: decodedVIN.bodyStyle,
        engineType: decodedVIN.engineType,
        manufacturer: decodedVIN.manufacturer,
        plantCode: decodedVIN.plantCode,
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
        totalListings: listings?.length || 0,
        hasListings: hasListings,
        vinValid: decodedVIN.valid
      }
    };

    // If VIN is valid but we have no listings, consider storing as a placeholder
    if (decodedVIN.valid && !hasListings && decodedVIN.model !== 'Unknown') {
      // Store VIN-only record for future tracking
      // This creates an opportunity to track cars even before they appear in listings
      const { error: insertError } = await supabase
        .from('vin_records')
        .insert({
          vin: vin.toUpperCase(),
          model_year: decodedVIN.modelYear,
          model: decodedVIN.model,
          trim: trimDisplay || null,
          generation: decodedVIN.generation || null,
          body_style: decodedVIN.bodyStyle || null,
          engine_type: decodedVIN.engineType || null,
          manufacturer: decodedVIN.manufacturer,
          plant_code: decodedVIN.plantCode,
          decoded_at: new Date().toISOString(),
          decoded_data: decodedVIN
        })
        .select()
        .single();

      // Don't fail if insert fails (table might not exist yet)
      if (insertError) {
        console.log('VIN record storage skipped:', insertError.message);
      }
    }

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