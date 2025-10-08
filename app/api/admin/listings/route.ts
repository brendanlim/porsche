import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get total count
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    // Get paginated listings
    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, title, model, trim, year, price, mileage, source, scraped_at, vin')
      .order('scraped_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Listings fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch listings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      listings,
      total: count || 0,
      limit,
      offset
    });
  } catch (error) {
    console.error('Admin listings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
