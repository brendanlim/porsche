import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Simple health check endpoint for cron job
// Actual scraping should be done by external service or GitHub Actions
export async function GET(request: NextRequest) {
  try {
    // Check if this is a Vercel cron request
    const isCron = request.headers.get('x-vercel-cron') === '1';
    
    if (!isCron) {
      return NextResponse.json(
        { error: 'This endpoint is only accessible via Vercel Cron' },
        { status: 403 }
      );
    }
    
    // Log that cron job ran
    console.log('Daily scraping cron job triggered at:', new Date().toISOString());
    
    // Get current stats from database
    const { count: totalListings } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true });
    
    const { count: todaysListings } = await supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
    
    // TODO: Trigger actual scraping via:
    // 1. GitHub Actions webhook
    // 2. External scraping service
    // 3. Scheduled task on a dedicated server
    
    return NextResponse.json({
      success: true,
      message: 'Cron job executed successfully',
      stats: {
        totalListings,
        todaysListings,
        timestamp: new Date().toISOString()
      },
      note: 'Actual scraping should be triggered externally'
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to execute cron job', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}