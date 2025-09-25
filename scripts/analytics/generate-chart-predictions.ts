#!/usr/bin/env tsx

/**
 * Chart Predictions Generation Script
 *
 * This script generates AI-powered predictions and analytics data specifically
 * for dashboard charts. It creates structured data that can be visualized:
 * - Price predictions for next 30/60/90 days
 * - Market trend forecasts
 * - Appreciation/depreciation predictions
 * - Volume predictions
 * - Anomaly scores for market movements
 *
 * Usage:
 *   tsx scripts/analytics/generate-chart-predictions.ts [options]
 *
 * Options:
 *   --models=<models>    Comma-separated list of models (default: all)
 *   --days=<days>        Number of days to predict (30, 60, 90)
 *   --force              Force regeneration
 */

import OpenAI from 'openai';
import { supabaseAdmin } from '../../lib/supabase/admin';

// Load environment variables for local development
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: '.env.local' });
} catch (error) {
  // dotenv not available in production, environment variables are already set
  console.log('Using environment variables from system');
}

interface PredictionData {
  model: string;
  trim?: string;
  prediction_date: string;
  target_date: string;
  predicted_price: number;
  predicted_volume: number;
  confidence_score: number;
  trend_direction: 'up' | 'down' | 'stable';
  price_change_percent: number;
  anomaly_score: number;
  factors: string[];
}

interface MarketPrediction {
  date: string;
  avgPrice: number;
  volume: number;
  confidence: number;
}

class ChartPredictionsGenerator {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async run(options: { models?: string[]; days?: number; force?: boolean } = {}) {
    const { models = ['911', '718', 'Boxster', 'Cayman'], days = 30, force = false } = options;

    console.log('🤖 AI-Powered Chart Predictions Generator');
    console.log('=========================================');
    console.log(`Models: ${models.join(', ')}`);
    console.log(`Prediction period: ${days} days`);
    console.log('');

    try {
      // Check if we have recent predictions (unless forced)
      if (!force) {
        const { data: recentPredictions } = await supabaseAdmin
          .from('chart_predictions')
          .select('*')
          .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentPredictions && recentPredictions.length > 0) {
          console.log('⏭️  Recent predictions exist (< 6 hours old), use --force to regenerate');
          return;
        }
      }

      // Generate predictions for each model
      for (const model of models) {
        console.log(`\n📊 Generating predictions for ${model}...`);
        await this.generateModelPredictions(model, days);
      }

      // Generate overall market predictions
      console.log('\n🌍 Generating overall market predictions...');
      await this.generateMarketPredictions(days);

      // Generate anomaly predictions
      console.log('\n⚠️  Generating anomaly predictions...');
      await this.generateAnomalyPredictions();

      console.log('\n✅ Chart predictions generated successfully!');
    } catch (error) {
      console.error('❌ Error generating predictions:', error);
      process.exit(1);
    }
  }

  private async generateModelPredictions(modelName: string, days: number) {
    // Get historical data for the model
    const { data: historicalData } = await supabaseAdmin
      .from('listings')
      .select('price, sold_date, mileage, trim, year')
      .eq('model', modelName)
      .not('sold_date', 'is', null)
      .gte('sold_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .order('sold_date', { ascending: true });

    if (!historicalData || historicalData.length < 10) {
      console.log(`  ⚠️  Insufficient data for ${modelName}, skipping...`);
      return;
    }

    // Prepare data for AI analysis
    const pricesByMonth = new Map<string, number[]>();
    const volumeByMonth = new Map<string, number>();

    historicalData.forEach(listing => {
      const month = listing.sold_date.substring(0, 7);
      if (!pricesByMonth.has(month)) {
        pricesByMonth.set(month, []);
        volumeByMonth.set(month, 0);
      }
      pricesByMonth.get(month)!.push(listing.price);
      volumeByMonth.set(month, volumeByMonth.get(month)! + 1);
    });

    // Calculate monthly averages
    const monthlyData = Array.from(pricesByMonth.entries())
      .map(([month, prices]) => ({
        month,
        avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        volume: volumeByMonth.get(month)!,
        medianPrice: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
      }))
      .slice(-12); // Last 12 months

    // Generate AI predictions
    const prompt = `
      Analyze this Porsche ${modelName} market data and generate price predictions for the next ${days} days.

      Historical monthly data (last 12 months):
      ${JSON.stringify(monthlyData, null, 2)}

      Current market factors:
      - Total listings analyzed: ${historicalData.length}
      - Average price last 30 days: $${historicalData.slice(-30).reduce((sum, l) => sum + l.price, 0) / Math.min(30, historicalData.length)}
      - Price trend: ${this.calculateTrend(monthlyData.map(m => m.avgPrice))}

      Generate predictions in this exact JSON format:
      {
        "predictions": [
          {
            "daysAhead": 7,
            "predictedPrice": <number>,
            "predictedVolume": <number>,
            "confidence": <0.0-1.0>,
            "trendDirection": "<up|down|stable>",
            "priceChangePercent": <number>,
            "factors": ["<factor1>", "<factor2>"]
          }
        ],
        "anomalyScore": <0.0-1.0>,
        "marketOutlook": "<bullish|bearish|neutral>",
        "keyInsights": ["<insight1>", "<insight2>"]
      }

      Provide predictions for: 7, 14, 21, and ${days} days ahead.
      Base predictions on historical patterns, seasonality, and market trends.
      Be realistic and conservative in predictions.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a market analyst specializing in Porsche collector cars. Generate accurate predictions based on historical data. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in AI response');
      }

      const predictions = JSON.parse(jsonMatch[0]);

      // Save predictions to database
      const predictionRecords = predictions.predictions.map((p: any) => ({
        model: modelName,
        prediction_type: 'price',
        prediction_date: new Date().toISOString(),
        target_date: new Date(Date.now() + p.daysAhead * 24 * 60 * 60 * 1000).toISOString(),
        predicted_value: {
          price: p.predictedPrice,
          volume: p.predictedVolume,
          trend: p.trendDirection,
          changePercent: p.priceChangePercent
        },
        confidence_score: p.confidence,
        factors: p.factors,
        anomaly_score: predictions.anomalyScore
      }));

      const { error } = await supabaseAdmin
        .from('chart_predictions')
        .insert(predictionRecords);

      if (error) {
        console.error(`  ❌ Error saving predictions for ${modelName}:`, error);
      } else {
        console.log(`  ✅ Saved ${predictionRecords.length} predictions for ${modelName}`);
      }

    } catch (error) {
      console.error(`  ❌ Error generating predictions for ${modelName}:`, error);
    }
  }

  private async generateMarketPredictions(days: number) {
    // Get overall market data
    const { data: marketData } = await supabaseAdmin
      .from('listings')
      .select('price, sold_date')
      .not('sold_date', 'is', null)
      .gte('sold_date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
      .order('sold_date', { ascending: true });

    if (!marketData || marketData.length < 50) {
      console.log('  ⚠️  Insufficient market data for predictions');
      return;
    }

    // Generate weekly aggregates
    const weeklyData = this.aggregateWeeklyData(marketData);

    const prompt = `
      Analyze overall Porsche sports car market data and predict trends for the next ${days} days.

      Weekly market data (last 12 weeks):
      ${JSON.stringify(weeklyData.slice(-12), null, 2)}

      Generate market-wide predictions in JSON format:
      {
        "weeklyPredictions": [
          {
            "weekNumber": <1-4>,
            "avgPrice": <number>,
            "totalVolume": <number>,
            "confidence": <0.0-1.0>,
            "marketSentiment": "<bullish|bearish|neutral>"
          }
        ],
        "hotModels": ["<model1>", "<model2>"],
        "coldModels": ["<model1>", "<model2>"],
        "priceInflectionPoints": [
          {
            "date": "<ISO date>",
            "event": "<description>",
            "impact": "<high|medium|low>"
          }
        ]
      }

      Consider seasonality, collector market trends, and historical patterns.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a market analyst specializing in Porsche collector cars. Analyze market data and generate predictions. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in market prediction response');
      }

      const marketPredictions = JSON.parse(jsonMatch[0]);

      // Save market predictions
      const { error } = await supabaseAdmin
        .from('chart_predictions')
        .insert({
          model: 'MARKET_OVERALL',
          prediction_type: 'market_trend',
          prediction_date: new Date().toISOString(),
          target_date: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
          predicted_value: marketPredictions,
          confidence_score: 0.75,
          factors: ['Historical patterns', 'Seasonal trends', 'Market sentiment']
        });

      if (!error) {
        console.log('  ✅ Saved overall market predictions');
      }

    } catch (error) {
      console.error('  ❌ Error generating market predictions:', error);
    }
  }

  private async generateAnomalyPredictions() {
    // Get recent unusual market movements
    const { data: recentListings } = await supabaseAdmin
      .from('listings')
      .select('*')
      .not('sold_date', 'is', null)
      .gte('sold_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('price', { ascending: false })
      .limit(100);

    if (!recentListings || recentListings.length === 0) {
      return;
    }

    // Find outliers and unusual patterns
    const prompt = `
      Analyze these recent Porsche sales for anomalies and unusual patterns:

      ${JSON.stringify(recentListings.slice(0, 20).map(l => ({
        model: l.model,
        trim: l.trim,
        year: l.year,
        price: l.price,
        mileage: l.mileage,
        sold_date: l.sold_date
      })), null, 2)}

      Identify in JSON format:
      {
        "anomalies": [
          {
            "type": "<overpriced|underpriced|unusual_volume|rare_combo>",
            "severity": "<high|medium|low>",
            "description": "<description>",
            "affectedModels": ["<model1>", "<model2>"],
            "recommendedAction": "<buy|sell|hold|watch>"
          }
        ],
        "marketRisks": ["<risk1>", "<risk2>"],
        "opportunities": ["<opportunity1>", "<opportunity2>"]
      }
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a market analyst specializing in Porsche collector cars. Analyze market data and generate predictions. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const anomalies = JSON.parse(jsonMatch[0]);

      // Save anomaly predictions
      await supabaseAdmin
        .from('chart_predictions')
        .insert({
          model: 'ANOMALY_DETECTION',
          prediction_type: 'anomaly',
          prediction_date: new Date().toISOString(),
          target_date: new Date().toISOString(),
          predicted_value: anomalies,
          confidence_score: 0.8,
          factors: ['Statistical outliers', 'Pattern recognition', 'Market analysis']
        });

      console.log('  ✅ Saved anomaly predictions');

    } catch (error) {
      console.error('  ❌ Error generating anomaly predictions:', error);
    }
  }

  private calculateTrend(prices: number[]): string {
    if (prices.length < 2) return 'stable';

    const recent = prices.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, prices.length);
    const older = prices.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, prices.length);

    const change = ((recent - older) / older) * 100;

    if (change > 5) return 'strong upward';
    if (change > 2) return 'upward';
    if (change < -5) return 'strong downward';
    if (change < -2) return 'downward';
    return 'stable';
  }

  private aggregateWeeklyData(data: any[]): any[] {
    const weeklyMap = new Map<string, { prices: number[]; count: number }>();

    data.forEach(item => {
      const date = new Date(item.sold_date);
      const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, { prices: [], count: 0 });
      }

      const week = weeklyMap.get(weekKey)!;
      week.prices.push(item.price);
      week.count++;
    });

    return Array.from(weeklyMap.entries()).map(([week, data]) => ({
      week,
      avgPrice: data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
      volume: data.count
    }));
  }
}

// Run the script
const generator = new ChartPredictionsGenerator();

const args = process.argv.slice(2);
const options: any = {};

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    if (key === 'models' && value) {
      options.models = value.split(',');
    } else if (key === 'days' && value) {
      options.days = parseInt(value);
    } else if (key === 'force') {
      options.force = true;
    }
  }
});

generator.run(options).catch(console.error);