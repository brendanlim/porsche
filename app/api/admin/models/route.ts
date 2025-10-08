import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('model, trim')
      .not('model', 'is', null);

    if (error) {
      console.error('Models fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch models' },
        { status: 500 }
      );
    }

    // Group by model and trim
    const modelMap: Record<string, { totalListings: number; trims: Record<string, number> }> = {};

    listings.forEach((listing) => {
      const model = listing.model;
      const trim = listing.trim || 'Base';

      if (!modelMap[model]) {
        modelMap[model] = { totalListings: 0, trims: {} };
      }

      modelMap[model].totalListings++;
      modelMap[model].trims[trim] = (modelMap[model].trims[trim] || 0) + 1;
    });

    // Convert to array format
    const models = Object.entries(modelMap).map(([model, data]) => ({
      model,
      totalListings: data.totalListings,
      trims: Object.entries(data.trims)
        .map(([trim, count]) => ({ trim, count }))
        .sort((a, b) => b.count - a.count),
    })).sort((a, b) => b.totalListings - a.totalListings);

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Admin models error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
