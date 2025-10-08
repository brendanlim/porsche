import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Get total listings
    const { count: totalListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true });

    // Get recent listings (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .gte('scraped_at', sevenDaysAgo.toISOString());

    // Get waitlist count
    const { count: waitlistCount } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get average price
    const { data: avgData } = await supabase
      .from('listings')
      .select('price');

    const avgPrice = avgData && avgData.length > 0
      ? avgData.reduce((sum, item) => sum + (item.price || 0), 0) / avgData.length
      : 0;

    // Get unique models count
    const { data: modelsData } = await supabase
      .from('listings')
      .select('model, trim')
      .not('model', 'is', null)
      .not('trim', 'is', null);

    const uniqueModels = new Set(
      modelsData?.map(item => `${item.model}-${item.trim}`) || []
    );

    return NextResponse.json({
      totalListings: totalListings || 0,
      recentListings: recentListings || 0,
      waitlistCount: waitlistCount || 0,
      totalUsers: totalUsers || 0,
      avgPrice,
      modelsCount: uniqueModels.size,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
