import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's market alerts
    const { data: alerts, error } = await supabase
      .from('market_alerts')
      .select(`
        *,
        models(name),
        trims(name),
        generations(name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: alerts || []
    });

  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has premium subscription for unlimited alerts
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_status === 'premium';

    // Check existing alert count for free users
    if (!isPremium) {
      const { count } = await supabase
        .from('market_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count && count >= 3) {
        return NextResponse.json({
          error: 'Free users can only create up to 3 alerts. Upgrade to Premium for unlimited alerts.',
          upgrade_required: true
        }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      alert_name,
      model_id,
      trim_id,
      generation_id,
      year_min,
      year_max,
      price_min,
      price_max,
      mileage_max,
      states,
      required_options,
      notify_frequency
    } = body;

    // Validate required fields
    if (!alert_name) {
      return NextResponse.json({ error: 'Alert name is required' }, { status: 400 });
    }

    // Create the alert
    const alertData = {
      user_id: user.id,
      alert_name,
      model_id: model_id || null,
      trim_id: trim_id || null,
      generation_id: generation_id || null,
      year_min: year_min || null,
      year_max: year_max || null,
      price_min: price_min || null,
      price_max: price_max || null,
      mileage_max: mileage_max || null,
      states: states || null,
      required_options: required_options || null,
      notify_frequency: notify_frequency || 'immediate',
      is_active: true,
      notify_email: true
    };

    const { data: newAlert, error: insertError } = await supabase
      .from('market_alerts')
      .insert(alertData)
      .select(`
        *,
        models(name),
        trims(name),
        generations(name)
      `)
      .single();

    if (insertError) {
      console.error('Error creating alert:', insertError);
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: newAlert
    });

  } catch (error) {
    console.error('Alerts POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}