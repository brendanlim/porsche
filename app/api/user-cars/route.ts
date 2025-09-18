import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateVIN } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's cars with full details
    const { data: userCars, error } = await supabase
      .from('user_cars_detailed')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user cars:', error);
      return NextResponse.json({ error: 'Failed to fetch user cars' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: userCars || []
    });

  } catch (error) {
    console.error('User cars API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vin, year, model_id, trim_id, generation_id, exterior_color_id, interior_color, mileage, purchase_date, purchase_price, purchase_notes, nickname } = body;

    // Validate VIN if provided
    if (vin && !validateVIN(vin)) {
      return NextResponse.json({ error: 'Invalid VIN format' }, { status: 400 });
    }

    // Check if user already has this VIN
    if (vin) {
      const { data: existingCar } = await supabase
        .from('user_cars')
        .select('id')
        .eq('user_id', user.id)
        .eq('vin', vin)
        .single();

      if (existingCar) {
        return NextResponse.json({ error: 'You already have this VIN in your garage' }, { status: 400 });
      }
    }

    // If VIN is provided, try to get data from existing listings
    let vinData = null;
    if (vin) {
      const { data: listing } = await supabase
        .from('listings')
        .select(`
          *,
          model_years!inner(year, model_id, trim_id, generation_id),
          models!inner(name),
          trims(name),
          generations(name),
          colors(name, hex_code, is_pts)
        `)
        .eq('vin', vin)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (listing) {
        vinData = {
          year: listing.model_years.year,
          model_id: listing.model_years.model_id,
          trim_id: listing.model_years.trim_id,
          generation_id: listing.model_years.generation_id,
          exterior_color_id: listing.exterior_color_id,
          interior_color: listing.interior_color,
          mileage: listing.mileage
        };
      }
    }

    // Create the user car record
    const carData = {
      user_id: user.id,
      vin: vin || null,
      year: year || vinData?.year,
      model_id: model_id || vinData?.model_id,
      trim_id: trim_id || vinData?.trim_id,
      generation_id: generation_id || vinData?.generation_id,
      exterior_color_id: exterior_color_id || vinData?.exterior_color_id,
      interior_color: interior_color || vinData?.interior_color,
      mileage: mileage || vinData?.mileage,
      purchase_date: purchase_date ? new Date(purchase_date).toISOString() : null,
      purchase_price: purchase_price,
      purchase_notes: purchase_notes,
      nickname: nickname
    };

    const { data: newCar, error: insertError } = await supabase
      .from('user_cars')
      .insert(carData)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating user car:', insertError);
      return NextResponse.json({ error: 'Failed to add car to garage' }, { status: 500 });
    }

    // Get the full car details for response
    const { data: fullCarDetails } = await supabase
      .from('user_cars_detailed')
      .select('*')
      .eq('id', newCar.id)
      .single();

    return NextResponse.json({
      success: true,
      data: fullCarDetails || newCar
    });

  } catch (error) {
    console.error('User cars POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}