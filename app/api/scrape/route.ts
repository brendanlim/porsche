import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    // Check if this is a Vercel cron request
    const isCron = request.headers.get('x-vercel-cron') === '1';
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isCron && !isDev) {
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
    
    // Trigger GitHub Actions workflow via repository dispatch
    // Note: This requires a GitHub personal access token with workflow permissions
    if (process.env.GITHUB_TOKEN) {
      try {
        const response = await fetch(
          'https://api.github.com/repos/brendanlim/porsche/actions/workflows/daily-scrape.yml/dispatches',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ref: 'main',
              inputs: {
                max_pages: '2'
              }
            })
          }
        );
        
        if (response.ok) {
          console.log('Successfully triggered GitHub Actions workflow');
        } else {
          console.error('Failed to trigger GitHub Actions:', response.statusText);
        }
      } catch (error) {
        console.error('Error triggering GitHub Actions:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cron job executed successfully',
      stats: {
        totalListings,
        todaysListings,
        timestamp: new Date().toISOString()
      },
      note: 'Scraping is handled by GitHub Actions workflow'
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Failed to execute cron job', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}