import { NextRequest, NextResponse } from 'next/server';
import { BaTScraper } from '@/lib/scrapers/bat';
import { ClassicScraper } from '@/lib/scrapers/classic';
import { EdmundsScraper } from '@/lib/scrapers/edmunds';
import { CarGurusScraper } from '@/lib/scrapers/cargurus';
import { AutotraderScraper } from '@/lib/scrapers/autotrader';
import { CarsAndBidsScraper } from '@/lib/scrapers/carsandbids';
import { DataNormalizer } from '@/lib/services/normalizer';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Check for API key or authentication (implement proper auth later)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.SCRAPER_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { source = 'bat', model, maxPages = 3, normalize = true, onlySold } = body;

    let results: any[] = [];
    
    // Handle different scrapers
    switch (source) {
      case 'bat':
        const batScraper = new BaTScraper();
        results = await batScraper.scrapeListings({
          model,
          maxPages,
          onlySold: onlySold !== false
        });
        break;
        
      case 'classic':
        const classicScraper = new ClassicScraper();
        results = await classicScraper.scrapeListings({
          model,
          maxPages,
          onlySold: onlySold !== false
        });
        break;
        
      case 'edmunds':
        const edmundsScraper = new EdmundsScraper();
        results = await edmundsScraper.scrapeListings({
          model,
          maxPages,
          onlySold: false // Edmunds shows available inventory
        });
        break;
        
      case 'cargurus':
        const cargurusScraper = new CarGurusScraper();
        results = await cargurusScraper.scrapeListings({
          model,
          maxPages,
          onlySold: false // CarGurus shows available inventory
        });
        break;
        
      case 'autotrader':
        const autotraderScraper = new AutotraderScraper();
        results = await autotraderScraper.scrapeListings({
          model,
          maxPages,
          onlySold: false // Autotrader shows available inventory
        });
        break;
        
      case 'carsandbids':
        const carsandbidsScraper = new CarsAndBidsScraper();
        results = await carsandbidsScraper.scrapeListings({
          model,
          maxPages,
          onlySold: true // Cars and Bids past auctions are sold
        });
        break;
        
      case 'all':
        // Run all scrapers in parallel for daily collection
        const scrapers = [
          { instance: new BaTScraper(), sold: true },
          { instance: new ClassicScraper(), sold: true },
          { instance: new CarsAndBidsScraper(), sold: true },
          { instance: new EdmundsScraper(), sold: false },
          { instance: new CarGurusScraper(), sold: false },
          { instance: new AutotraderScraper(), sold: false }
        ];
        
        const allResults = await Promise.allSettled(
          scrapers.map(({ instance, sold }) => 
            instance.scrapeListings({ 
              model, 
              maxPages: Math.min(maxPages, 2), // Limit pages when running all
              onlySold: sold
            })
          )
        );
        
        results = allResults
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => (r as PromiseFulfilledResult<any>).value);
        
        console.log(`Scraped from all sources: ${results.length} total listings`);
        break;
        
      default:
        return NextResponse.json({ error: `Unknown source: ${source}` }, { status: 400 });
    }

    // Normalize data if requested
    if (normalize) {
      const normalizer = new DataNormalizer();
      
      for (const result of results) {
        try {
          // Get the listing ID from database
          const { data: listing } = await supabaseAdmin
            .from('listings')
            .select('id')
            .eq('source_url', result.source_url)
            .single();

          if (listing) {
            const normalized = await normalizer.normalizeListing({
              title: result.title,
              year: result.year,
              price: result.price,
              mileage: result.mileage,
              vin: result.vin,
              exterior_color: result.exterior_color,
              options_text: result.options_text,
              raw_data: result.raw_data
            });

            // Update listing with normalized data
            await supabaseAdmin
              .from('listings')
              .update({
                model_year_id: normalized.model_year_id,
                trim_id: normalized.trim_id,
                generation_id: normalized.generation_id,
                exterior_color_id: normalized.exterior_color_id,
                is_normalized: true,
                normalized_at: new Date().toISOString(),
                validation_errors: normalized.validation_errors.length > 0 
                  ? normalized.validation_errors 
                  : null,
                is_valid: normalized.validation_errors.length === 0
              })
              .eq('id', listing.id);

            // Save options
            if (normalized.options.length > 0) {
              await normalizer.saveOptions(listing.id, normalized.options);
            }
          }
        } catch (error) {
          console.error('Failed to normalize listing:', error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      source,
      count: results.length,
      results: results.slice(0, 5) // Return sample of results
    });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape listings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for Vercel cron job
export async function GET(request: NextRequest) {
  try {
    // Check if this is a Vercel cron request
    const authHeader = request.headers.get('authorization');
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}` || 
                        request.headers.get('x-vercel-cron') === '1';
    
    if (!isVercelCron) {
      // Return recent ingestion runs for status checks
      const { data, error } = await supabaseAdmin
        .from('ingestion_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        runs: data
      });
    }

    // Execute daily scraping for all sources
    console.log('Starting daily scraping job from Vercel cron...');
    
    const scrapers = [
      { instance: new BaTScraper(), sold: true },
      { instance: new ClassicScraper(), sold: true },
      { instance: new CarsAndBidsScraper(), sold: true },
      { instance: new EdmundsScraper(), sold: false },
      { instance: new CarGurusScraper(), sold: false },
      { instance: new AutotraderScraper(), sold: false }
    ];
    
    const allResults = await Promise.allSettled(
      scrapers.map(({ instance, sold }) => 
        instance.scrapeListings({ 
          maxPages: 5, // Run more pages for cron job
          onlySold: sold
        })
      )
    );
    
    const results = allResults
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => (r as PromiseFulfilledResult<any>).value);
    
    console.log(`Daily scraping completed: ${results.length} total listings`);

    // Normalize data
    const normalizer = new DataNormalizer();
    let normalizedCount = 0;
    
    for (const result of results) {
      try {
        const { data: listing } = await supabaseAdmin
          .from('listings')
          .select('id')
          .eq('source_url', result.source_url)
          .single();

        if (listing) {
          const normalized = await normalizer.normalizeListing({
            title: result.title,
            year: result.year,
            price: result.price,
            mileage: result.mileage,
            vin: result.vin,
            exterior_color: result.exterior_color,
            options_text: result.options_text,
            raw_data: result.raw_data
          });

          await supabaseAdmin
            .from('listings')
            .update({
              model_year_id: normalized.model_year_id,
              trim_id: normalized.trim_id,
              generation_id: normalized.generation_id,
              exterior_color_id: normalized.exterior_color_id,
              is_normalized: true,
              normalized_at: new Date().toISOString(),
              validation_errors: normalized.validation_errors.length > 0 
                ? normalized.validation_errors 
                : null,
              is_valid: normalized.validation_errors.length === 0
            })
            .eq('id', listing.id);

          if (normalized.options.length > 0) {
            await normalizer.saveOptions(listing.id, normalized.options);
          }
          
          normalizedCount++;
        }
      } catch (error) {
        console.error('Failed to normalize listing:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Daily scraping completed',
      totalListings: results.length,
      normalizedCount
    });
  } catch (error) {
    console.error('Cron scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to run daily scraping', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}