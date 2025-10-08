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
    const search = searchParams.get('search');
    const source = searchParams.get('source');
    const model = searchParams.get('model');
    const trim = searchParams.get('trim');

    // Build query with filters
    let countQuery = supabase.from('listings').select('*', { count: 'exact', head: true });
    let listingsQuery = supabase
      .from('listings')
      .select('id, title, model, trim, year, price, mileage, source, scraped_at, vin');

    // Apply filters to both queries
    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,model.ilike.%${search}%`);
      listingsQuery = listingsQuery.or(`title.ilike.%${search}%,model.ilike.%${search}%`);
    }
    if (source) {
      countQuery = countQuery.eq('source', source);
      listingsQuery = listingsQuery.eq('source', source);
    }
    if (model) {
      countQuery = countQuery.eq('model', model);
      listingsQuery = listingsQuery.eq('model', model);
    }
    if (trim) {
      countQuery = countQuery.eq('trim', trim);
      listingsQuery = listingsQuery.eq('trim', trim);
    }

    // Get total count with filters
    const { count } = await countQuery;

    // Get paginated listings with filters
    const { data: listings, error } = await listingsQuery
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
