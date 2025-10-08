import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { vin: string } }
) {
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('vin', params.vin)
      .order('scraped_at', { ascending: false });

    if (error) {
      console.error('VIN listings fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch listings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Admin VIN listings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
