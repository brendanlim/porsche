import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get all distinct sources, models, and trims from the database
    const { data: listings, error } = await supabase
      .from('listings')
      .select('source, model, trim');

    if (error) {
      console.error('Filter options fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch filter options' },
        { status: 500 }
      );
    }

    // Extract unique values
    const sources = Array.from(new Set(listings?.map(l => l.source).filter(Boolean))).sort();
    const models = Array.from(new Set(listings?.map(l => l.model).filter(Boolean))).sort();
    const trims = Array.from(new Set(listings?.map(l => l.trim).filter(Boolean))).sort();

    return NextResponse.json({
      sources,
      models,
      trims
    });
  } catch (error) {
    console.error('Filter options error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
