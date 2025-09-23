import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Simple test - just get count
    const { count } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .not('sold_date', 'is', null);

    return NextResponse.json({
      success: true,
      totalListings: count || 0,
      message: 'Test endpoint working'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed', details: error }, { status: 500 });
  }
}