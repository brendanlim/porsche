import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface ValuationRequest {
  year: number;
  model_id: string;
  trim_id: string;
  mileage: number;
  exterior_color_id?: string;
  options?: string[];
  generation_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has premium subscription for advanced valuations
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_status === 'premium';

    const body: ValuationRequest = await request.json();
    const { year, model_id, trim_id, mileage, exterior_color_id, options } = body;

    // Validate required fields
    if (!year || !model_id || !trim_id || mileage === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get similar sold listings for comparison
    const { data: similarListings, error: listingsError } = await supabase
      .from('listings')
      .select(`
        price,
        mileage,
        sold_date,
        exterior_color_id,
        model_years!inner(year, model_id, trim_id),
        listing_options(option_id)
      `)
      .eq('status', 'sold')
      .eq('model_years.model_id', model_id)
      .eq('model_years.trim_id', trim_id)
      .gte('model_years.year', year - 2)
      .lte('model_years.year', year + 2)
      .gte('sold_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()) // Last year
      .order('sold_date', { ascending: false })
      .limit(50);

    if (listingsError) {
      console.error('Error fetching similar listings:', listingsError);
      return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
    }

    if (!similarListings || similarListings.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          estimated_value: null,
          confidence_score: 0,
          method: 'insufficient_data',
          message: 'Not enough market data available for this vehicle configuration',
          comparable_count: 0
        }
      });
    }

    // Basic valuation algorithm
    let estimatedValue = 0;
    let confidenceScore = 0;
    const comparableCount = similarListings.length;

    if (isPremium) {
      // Advanced valuation for premium users
      estimatedValue = calculateAdvancedValuation(similarListings, {
        year,
        mileage,
        exterior_color_id,
        options: options || []
      });
      confidenceScore = calculateConfidenceScore(similarListings, mileage);
    } else {
      // Basic valuation for free users
      estimatedValue = calculateBasicValuation(similarListings, mileage);
      confidenceScore = Math.min(0.7, similarListings.length / 20); // Max 70% confidence for free users
    }

    // Get market trend data
    const marketTrend = await calculateMarketTrend(supabase, model_id, trim_id, year);

    return NextResponse.json({
      success: true,
      data: {
        estimated_value: Math.round(estimatedValue),
        confidence_score: Math.round(confidenceScore * 100) / 100,
        method: isPremium ? 'advanced_analysis' : 'basic_analysis',
        comparable_count: comparableCount,
        market_trend: marketTrend,
        upgrade_message: !isPremium ? 'Upgrade to Premium for more accurate valuations and detailed analysis' : undefined
      }
    });

  } catch (error) {
    console.error('Valuation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateBasicValuation(listings: { mileage: number; price: number }[], targetMileage: number): number {
  // Simple mileage-adjusted average
  const weights = listings.map((listing) => {
    const mileageDiff = Math.abs(listing.mileage - targetMileage);
    return Math.max(0.1, 1 - (mileageDiff / 100000)); // Weight decreases with mileage difference
  });

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const weightedSum = listings.reduce((sum: number, listing, index: number) => {
    return sum + (listing.price * weights[index]);
  }, 0);

  return weightedSum / totalWeight;
}

function calculateAdvancedValuation(
  listings: { mileage: number; price: number; listing_options?: { option_id: string }[] }[],
  vehicle: { year: number; mileage: number; exterior_color_id?: string; options: string[] }
): number {
  // Advanced valuation considering multiple factors
  let baseValue = 0;
  let totalWeight = 0;

  listings.forEach((listing) => {
    let weight = 1;

    // Mileage adjustment
    const mileageDiff = Math.abs(listing.mileage - vehicle.mileage);
    weight *= Math.max(0.1, 1 - (mileageDiff / 150000));

    // Year adjustment
    const yearDiff = Math.abs(listing.model_years.year - vehicle.year);
    weight *= Math.max(0.3, 1 - (yearDiff * 0.2));

    // Color matching (premium colors add value)
    if (vehicle.exterior_color_id && listing.exterior_color_id === vehicle.exterior_color_id) {
      weight *= 1.1;
    }

    // Options matching
    const listingOptions = listing.listing_options?.map((lo) => lo.option_id) || [];
    const commonOptions = vehicle.options.filter(opt => listingOptions.includes(opt));
    const optionsBonus = commonOptions.length * 0.05; // 5% bonus per matching option
    weight *= (1 + optionsBonus);

    // Time decay (more recent sales are more relevant)
    const daysSinceSale = (Date.now() - new Date(listing.sold_date).getTime()) / (24 * 60 * 60 * 1000);
    weight *= Math.max(0.5, 1 - (daysSinceSale / 365));

    baseValue += listing.price * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? baseValue / totalWeight : 0;
}

function calculateConfidenceScore(listings: { mileage: number; price: number }[]): number {
  if (listings.length === 0) return 0;

  // Base confidence on number of comparables
  const confidence = Math.min(0.9, listings.length / 25);

  // Adjust for mileage spread
  const mileages = listings.map((l) => l.mileage);
  const mileageSpread = Math.max(...mileages) - Math.min(...mileages);
  const mileageConfidence = Math.max(0.5, 1 - (mileageSpread / 200000));

  // Adjust for recency of sales
  const daysSinceNewest = (Date.now() - new Date(Math.max(...listings.map((l: { sold_date: string }) => new Date(l.sold_date).getTime()))).getTime()) / (24 * 60 * 60 * 1000);
  const recencyConfidence = Math.max(0.6, 1 - (daysSinceNewest / 180));

  return confidence * mileageConfidence * recencyConfidence;
}

async function calculateMarketTrend(supabase: { from: (...args: unknown[]) => unknown }, modelId: string, trimId: string, year: number) {
  // Get price trends over the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: recentSales } = await supabase
    .from('listings')
    .select(`
      price,
      sold_date,
      model_years!inner(year, model_id, trim_id)
    `)
    .eq('status', 'sold')
    .eq('model_years.model_id', modelId)
    .eq('model_years.trim_id', trimId)
    .gte('model_years.year', year - 1)
    .lte('model_years.year', year + 1)
    .gte('sold_date', sixMonthsAgo.toISOString())
    .order('sold_date', { ascending: true });

  if (!recentSales || recentSales.length < 3) {
    return {
      direction: 'stable',
      change_percent: 0,
      confidence: 'low'
    };
  }

  // Calculate trend
  const firstThird = recentSales.slice(0, Math.floor(recentSales.length / 3));
  const lastThird = recentSales.slice(-Math.floor(recentSales.length / 3));

  const avgEarly = firstThird.reduce((sum: number, sale) => sum + sale.price, 0) / firstThird.length;
  const avgRecent = lastThird.reduce((sum: number, sale) => sum + sale.price, 0) / lastThird.length;

  const changePercent = ((avgRecent - avgEarly) / avgEarly) * 100;

  let direction = 'stable';
  if (changePercent > 3) direction = 'increasing';
  else if (changePercent < -3) direction = 'decreasing';

  return {
    direction,
    change_percent: Math.round(changePercent * 10) / 10,
    confidence: recentSales.length >= 10 ? 'high' : recentSales.length >= 5 ? 'medium' : 'low'
  };
}