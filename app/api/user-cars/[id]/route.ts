import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { validateVIN } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get specific user car with full details
    const { data: userCar, error } = await supabase
      .from('user_cars_detailed')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user car:', error);
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: userCar
    });

  } catch (error) {
    console.error('User car GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      vin,
      year,
      model_id,
      trim_id,
      generation_id,
      exterior_color_id,
      interior_color,
      mileage,
      purchase_date,
      purchase_price,
      purchase_notes,
      nickname,
      is_for_sale,
      asking_price
    } = body;

    // Validate VIN if provided
    if (vin && !validateVIN(vin)) {
      return NextResponse.json({ error: 'Invalid VIN format' }, { status: 400 });
    }

    // Check if the car exists and belongs to the user
    const { data: existingCar, error: checkError } = await supabase
      .from('user_cars')
      .select('id, vin')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existingCar) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    // Check if VIN conflicts with another car (if VIN is being changed)
    if (vin && vin !== existingCar.vin) {
      const { data: vinConflict } = await supabase
        .from('user_cars')
        .select('id')
        .eq('user_id', user.id)
        .eq('vin', vin)
        .neq('id', id)
        .single();

      if (vinConflict) {
        return NextResponse.json({ error: 'You already have this VIN in your garage' }, { status: 400 });
      }
    }

    // Update the car
    const updateData = {
      vin: vin || null,
      year,
      model_id,
      trim_id,
      generation_id,
      exterior_color_id,
      interior_color,
      mileage,
      purchase_date: purchase_date ? new Date(purchase_date).toISOString() : null,
      purchase_price,
      purchase_notes,
      nickname,
      is_for_sale,
      asking_price
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const { error: updateError } = await supabase
      .from('user_cars')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating user car:', updateError);
      return NextResponse.json({ error: 'Failed to update car' }, { status: 500 });
    }

    // Get the updated car details
    const { data: updatedCar } = await supabase
      .from('user_cars_detailed')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({
      success: true,
      data: updatedCar
    });

  } catch (error) {
    console.error('User car PUT API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the car exists and belongs to the user
    const { data: existingCar, error: checkError } = await supabase
      .from('user_cars')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existingCar) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    // Delete the car (this will cascade delete valuations and options)
    const { error: deleteError } = await supabase
      .from('user_cars')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting user car:', deleteError);
      return NextResponse.json({ error: 'Failed to delete car' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Car removed from garage'
    });

  } catch (error) {
    console.error('User car DELETE API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}