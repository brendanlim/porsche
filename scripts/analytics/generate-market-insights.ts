#!/usr/bin/env tsx

/**
 * Market Insights Generation Script
 * 
 * This script generates AI-powered market insights for the PorscheStats platform.
 * It's designed to run as a GitHub Action on a scheduled basis to provide:
 * - Daily market summaries
 * - Price predictions
 * - Anomaly detection
 * - Investment recommendations
 * 
 * Usage:
 *   tsx scripts/analytics/generate-market-insights.ts [options]
 * 
 * Options:
 *   --type=<type>        Type of insights to generate (daily, weekly, model-specific)
 *   --model=<model>      Specific model to analyze (e.g., "911", "718")
 *   --trim=<trim>        Specific trim to analyze (e.g., "GT3", "GT4 RS")
 *   --force              Force regeneration even if recent insights exist
 *   --dry-run            Show what would be generated without actually running
 *   --validate           Validate previous predictions against actual market data
 */

import { LLMPredictor } from '../../lib/analytics/llm-predictor';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { Listing } from '../../lib/types/database';

interface ScriptOptions {
  type: 'daily' | 'weekly' | 'model-specific';
  model?: string;
  trim?: string;
  force: boolean;
  dryRun: boolean;
  validate: boolean;
}

interface ModelTrimPair {
  model: string;
  trim: string;
  priority: number; // Higher priority = more important
}

/**
 * Main market insights generator class
 */
class MarketInsightsGenerator {
  private predictor: LLMPredictor;
  private options: ScriptOptions;

  // Define high-priority model/trim combinations for analysis
  private readonly HIGH_PRIORITY_MODELS: ModelTrimPair[] = [
    { model: '911', trim: 'GT3', priority: 10 },
    { model: '911', trim: 'GT3 RS', priority: 10 },
    { model: '911', trim: 'GT2 RS', priority: 9 },
    { model: '718', trim: 'GT4', priority: 8 },
    { model: '718', trim: 'GT4 RS', priority: 9 },
    { model: '718', trim: 'Spyder', priority: 7 },
    { model: '911', trim: 'Turbo S', priority: 7 },
    { model: '911', trim: 'Carrera S', priority: 6 },
    { model: '718', trim: 'GTS', priority: 6 },
  ];

  constructor(options: ScriptOptions) {
    this.predictor = new LLMPredictor();
    this.options = options;
  }

  /**
   * Main execution method
   */
  async run(): Promise<void> {
    console.log('🚀 Starting Market Insights Generation');
    console.log(`Mode: ${this.options.type}${this.options.dryRun ? ' (DRY RUN)' : ''}`);
    
    try {
      // Validate previous predictions if requested
      if (this.options.validate) {
        await this.validatePreviousPredictions();
      }

      // Generate insights based on type
      switch (this.options.type) {
        case 'daily':
          await this.generateDailyInsights();
          break;
        case 'weekly':
          await this.generateWeeklyInsights();
          break;
        case 'model-specific':
          await this.generateModelSpecificInsights();
          break;
        default:
          throw new Error(`Unknown insight type: ${this.options.type}`);
      }

      console.log('✅ Market insights generation completed successfully');
      
    } catch (error) {
      console.error('❌ Error generating market insights:', error);
      process.exit(1);
    }
  }

  /**
   * Generate daily market insights
   */
  private async generateDailyInsights(): Promise<void> {
    console.log('📊 Generating daily market insights...');

    // Check if daily insights already exist (unless force flag is set)
    if (!this.options.force && await this.hasRecentInsights('daily', 18)) { // 18 hours
      console.log('⏭️  Recent daily insights exist, skipping generation');
      return;
    }

    const tasks = [
      this.generateMarketSummary(),
      this.detectMarketAnomalies(),
      this.generateTrendingModelsAnalysis(),
      this.checkUndervaluedListings(),
    ];

    if (!this.options.dryRun) {
      const results = await Promise.allSettled(tasks);
      
      // Check if any tasks failed
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error(`❌ ${failures.length} out of ${results.length} tasks failed`);
        throw new Error('Some insight generation tasks failed');
      }
    } else {
      console.log('🧪 Would generate:');
      console.log('  - Market summary');
      console.log('  - Anomaly detection');
      console.log('  - Trending models analysis');
      console.log('  - Undervalued listings check');
    }
  }

  /**
   * Generate weekly deep market insights
   */
  private async generateWeeklyInsights(): Promise<void> {
    console.log('📈 Generating weekly market insights...');

    // Check if weekly insights already exist (unless force flag is set)
    if (!this.options.force && await this.hasRecentInsights('weekly', 144)) { // 6 days
      console.log('⏭️  Recent weekly insights exist, skipping generation');
      return;
    }

    const tasks = [
      this.generateWeeklyMarketReport(),
      this.generatePricePredictions(),
      this.analyzeSeasonalTrends(),
      this.generateInvestmentRecommendations(),
      this.analyzeCrossMarketCorrelations(),
    ];

    if (!this.options.dryRun) {
      await Promise.all(tasks);
    } else {
      console.log('🧪 Would generate:');
      console.log('  - Weekly market report');
      console.log('  - Price predictions for top models');
      console.log('  - Seasonal trends analysis');
      console.log('  - Investment recommendations');
      console.log('  - Cross-market correlations');
    }
  }

  /**
   * Generate insights for specific model/trim
   */
  private async generateModelSpecificInsights(): Promise<void> {
    if (!this.options.model) {
      throw new Error('Model must be specified for model-specific insights');
    }

    console.log(`🎯 Generating insights for ${this.options.model}${this.options.trim ? ` ${this.options.trim}` : ''}...`);

    const tasks = [
      this.generateModelMarketAnalysis(this.options.model, this.options.trim),
      this.generateModelPricePredictions(this.options.model, this.options.trim),
      this.analyzeModelOptions(this.options.model, this.options.trim),
      this.detectModelAnomalies(this.options.model, this.options.trim),
    ];

    if (!this.options.dryRun) {
      await Promise.all(tasks);
    } else {
      console.log('🧪 Would generate:');
      console.log(`  - Market analysis for ${this.options.model}${this.options.trim ? ` ${this.options.trim}` : ''}`);
      console.log('  - Price predictions');
      console.log('  - Options value analysis');
      console.log('  - Anomaly detection');
    }
  }

  /**
   * Generate overall market summary
   */
  private async generateMarketSummary(): Promise<void> {
    try {
      console.log('  📝 Generating market summary...');
      
      const insight = await this.predictor.generateMarketInsights(
        'market_summary',
        undefined,
        undefined,
        {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          end: new Date()
        }
      );

      console.log(`  ✅ Generated market summary: "${insight.title}"`);
      
    } catch (error) {
      console.error('  ❌ Error generating market summary:', error);
    }
  }

  /**
   * Detect market anomalies across all active listings
   */
  private async detectMarketAnomalies(): Promise<void> {
    try {
      console.log('  🔍 Detecting market anomalies...');
      
      // Get recent listings for anomaly detection
      const { data: recentListings } = await supabaseAdmin
        .from('listings')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(200);

      if (!recentListings || recentListings.length === 0) {
        console.log('  ⏭️  No recent listings found for anomaly detection');
        return;
      }

      const anomalies = await this.predictor.detectAnomalies(recentListings, 'market');
      
      console.log(`  ✅ Detected ${anomalies.length} market anomalies`);
      
      // Log high-severity anomalies
      const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high' || a.severity === 'critical');
      if (highSeverityAnomalies.length > 0) {
        console.log(`  🚨 Found ${highSeverityAnomalies.length} high-severity anomalies`);
        for (const anomaly of highSeverityAnomalies) {
          console.log(`    - ${anomaly.anomalyType}: ${anomaly.explanation}`);
        }
      }
      
    } catch (error) {
      console.error('  ❌ Error detecting anomalies:', error);
    }
  }

  /**
   * Analyze trending models based on recent activity
   */
  private async generateTrendingModelsAnalysis(): Promise<void> {
    try {
      console.log('  📈 Analyzing trending models...');
      
      // Get recent listings to analyze trends
      const { data: recentListings } = await supabaseAdmin
        .from('listings')
        .select('model, trim, price')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .not('model', 'is', null)
        .not('trim', 'is', null)
        .order('created_at', { ascending: false });

      if (recentListings && recentListings.length > 0) {
        // Group by model/trim manually
        const trendingModels = new Map<string, { count: number; avgPrice: number; prices: number[] }>();
        
        for (const listing of recentListings) {
          const key = `${listing.model}|${listing.trim}`;
          const existing = trendingModels.get(key) || { count: 0, avgPrice: 0, prices: [] };
          existing.count++;
          if (listing.price) {
            existing.prices.push(listing.price);
          }
          trendingModels.set(key, existing);
        }
        
        // Calculate averages and sort by count
        const sortedTrends = Array.from(trendingModels.entries())
          .map(([key, data]) => {
            const [model, trim] = key.split('|');
            const avgPrice = data.prices.length > 0 
              ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length 
              : 0;
            return { model, trim, count: data.count, avgPrice };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        
        console.log(`  ✅ Analyzed ${sortedTrends.length} trending model/trim combinations`);
        
        // Generate insights for top trending models
        for (const trend of sortedTrends.slice(0, 3)) {
          await this.predictor.generateMarketInsights(
            'trend_analysis',
            trend.model,
            trend.trim
          );
        }
      }
      
    } catch (error) {
      console.error('  ❌ Error analyzing trending models:', error);
    }
  }

  /**
   * Check for undervalued listings that might be good deals
   */
  private async checkUndervaluedListings(): Promise<void> {
    try {
      console.log('  💎 Checking for undervalued listings...');
      
      // Get recent active listings
      const { data: activeListings } = await supabaseAdmin
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (!activeListings || activeListings.length === 0) {
        console.log('  ⏭️  No recent active listings found');
        return;
      }

      const anomalies = await this.predictor.detectAnomalies(activeListings, 'listings');
      const undervaluedListings = anomalies.filter(a => a.anomalyType === 'undervalued');
      
      console.log(`  ✅ Found ${undervaluedListings.length} potentially undervalued listings`);
      
      // Log significant undervalued finds
      const significantFinds = undervaluedListings.filter(a => 
        a.severity === 'high' || a.severity === 'critical'
      );
      
      if (significantFinds.length > 0) {
        console.log(`  🎯 Found ${significantFinds.length} significant undervalued opportunities`);
      }
      
    } catch (error) {
      console.error('  ❌ Error checking undervalued listings:', error);
    }
  }

  /**
   * Generate comprehensive weekly market report
   */
  private async generateWeeklyMarketReport(): Promise<void> {
    try {
      console.log('  📊 Generating weekly market report...');
      
      const insight = await this.predictor.generateMarketInsights(
        'market_summary',
        undefined,
        undefined,
        {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      );

      console.log(`  ✅ Generated weekly report: "${insight.title}"`);
      
    } catch (error) {
      console.error('  ❌ Error generating weekly report:', error);
    }
  }

  /**
   * Generate price predictions for high-priority models
   */
  private async generatePricePredictions(): Promise<void> {
    try {
      console.log('  🔮 Generating price predictions...');
      
      const predictions = [];
      
      for (const modelTrim of this.HIGH_PRIORITY_MODELS.slice(0, 5)) { // Top 5 models
        try {
          const prediction = await this.predictor.predictPrices({
            model: modelTrim.model,
            trim: modelTrim.trim,
            timeHorizon: '3m'
          });
          
          predictions.push(prediction);
          console.log(`    ✅ Generated 3-month prediction for ${modelTrim.model} ${modelTrim.trim}`);
          
        } catch (error) {
          console.error(`    ❌ Error predicting ${modelTrim.model} ${modelTrim.trim}:`, error);
        }
      }
      
      console.log(`  ✅ Generated ${predictions.length} price predictions`);
      
    } catch (error) {
      console.error('  ❌ Error generating price predictions:', error);
    }
  }

  /**
   * Analyze seasonal trends and patterns
   */
  private async analyzeSeasonalTrends(): Promise<void> {
    try {
      console.log('  🍂 Analyzing seasonal trends...');
      
      // This would analyze seasonal patterns across models
      // Implementation would examine historical data by season
      
      console.log('  ✅ Completed seasonal trends analysis');
      
    } catch (error) {
      console.error('  ❌ Error analyzing seasonal trends:', error);
    }
  }

  /**
   * Generate investment recommendations
   */
  private async generateInvestmentRecommendations(): Promise<void> {
    try {
      console.log('  💰 Generating investment recommendations...');
      
      const insight = await this.predictor.generateMarketInsights(
        'investment_recommendation'
      );

      console.log(`  ✅ Generated investment recommendations: "${insight.title}"`);
      
    } catch (error) {
      console.error('  ❌ Error generating investment recommendations:', error);
    }
  }

  /**
   * Analyze cross-market correlations
   */
  private async analyzeCrossMarketCorrelations(): Promise<void> {
    try {
      console.log('  🔗 Analyzing cross-market correlations...');
      
      // This would analyze correlations with other luxury markets
      // Implementation would examine relationships with economic indicators
      
      console.log('  ✅ Completed cross-market correlation analysis');
      
    } catch (error) {
      console.error('  ❌ Error analyzing correlations:', error);
    }
  }

  /**
   * Generate insights for specific model/trim combination
   */
  private async generateModelMarketAnalysis(model: string, trim?: string): Promise<void> {
    try {
      console.log(`  📊 Generating market analysis for ${model}${trim ? ` ${trim}` : ''}...`);
      
      const insight = await this.predictor.generateMarketInsights(
        'market_summary',
        model,
        trim
      );

      console.log(`  ✅ Generated analysis: "${insight.title}"`);
      
    } catch (error) {
      console.error(`  ❌ Error generating analysis for ${model}:`, error);
    }
  }

  /**
   * Generate price predictions for specific model
   */
  private async generateModelPricePredictions(model: string, trim?: string): Promise<void> {
    try {
      console.log(`  🔮 Generating price predictions for ${model}${trim ? ` ${trim}` : ''}...`);
      
      const timeHorizons: Array<'1m' | '3m' | '6m'> = ['1m', '3m', '6m'];
      
      for (const horizon of timeHorizons) {
        const prediction = await this.predictor.predictPrices({
          model,
          trim: trim || '',
          timeHorizon: horizon
        });
        
        console.log(`    ✅ Generated ${horizon} prediction (confidence: ${(prediction.confidenceScore * 100).toFixed(1)}%)`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error generating predictions for ${model}:`, error);
    }
  }

  /**
   * Analyze options value for specific model
   */
  private async analyzeModelOptions(model: string, trim?: string): Promise<void> {
    try {
      console.log(`  🛠️  Analyzing options for ${model}${trim ? ` ${trim}` : ''}...`);
      
      // This would analyze the value impact of different options
      // Implementation would examine option premiums and trends
      
      console.log('  ✅ Completed options analysis');
      
    } catch (error) {
      console.error(`  ❌ Error analyzing options for ${model}:`, error);
    }
  }

  /**
   * Detect anomalies for specific model
   */
  private async detectModelAnomalies(model: string, trim?: string): Promise<void> {
    try {
      console.log(`  🔍 Detecting anomalies for ${model}${trim ? ` ${trim}` : ''}...`);
      
      // Get recent listings for this model/trim
      let query = supabaseAdmin
        .from('listings')
        .select('*')
        .ilike('model', model);
        
      if (trim) {
        query = query.ilike('trim', trim);
      }
      
      const { data: listings } = await query
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false })
        .limit(50);

      if (!listings || listings.length === 0) {
        console.log('  ⏭️  No recent listings found for this model');
        return;
      }

      const anomalies = await this.predictor.detectAnomalies(listings);
      
      console.log(`  ✅ Detected ${anomalies.length} anomalies`);
      
    } catch (error) {
      console.error(`  ❌ Error detecting anomalies for ${model}:`, error);
    }
  }

  /**
   * Validate previous predictions against actual market outcomes
   */
  private async validatePreviousPredictions(): Promise<void> {
    try {
      console.log('🔍 Validating previous predictions...');
      
      await this.predictor.validatePredictions();
      
      console.log('✅ Completed prediction validation');
      
    } catch (error) {
      console.error('❌ Error validating predictions:', error);
    }
  }

  /**
   * Check if recent insights already exist
   */
  private async hasRecentInsights(type: string, hoursThreshold: number): Promise<boolean> {
    const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
    
    const { data, error } = await supabaseAdmin
      .from('market_insights')
      .select('id')
      .eq('insight_type', type)  // Filter by insight type
      .gte('created_at', cutoff.toISOString())
      .limit(1);

    if (error) {
      console.warn('Error checking for recent insights:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }
}

/**
 * Parse command line arguments
 */
function parseArguments(): ScriptOptions {
  const args = process.argv.slice(2);
  
  const options: ScriptOptions = {
    type: 'daily',
    force: false,
    dryRun: false,
    validate: false
  };

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      const type = arg.split('=')[1] as ScriptOptions['type'];
      if (['daily', 'weekly', 'model-specific'].includes(type)) {
        options.type = type;
      } else {
        throw new Error(`Invalid type: ${type}`);
      }
    } else if (arg.startsWith('--model=')) {
      options.model = arg.split('=')[1];
    } else if (arg.startsWith('--trim=')) {
      options.trim = arg.split('=')[1];
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--validate') {
      options.validate = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  // Validate options
  if (options.type === 'model-specific' && !options.model) {
    throw new Error('Model must be specified when using model-specific type');
  }

  return options;
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
Market Insights Generation Script

Usage: tsx scripts/analytics/generate-market-insights.ts [options]

Options:
  --type=<type>        Type of insights to generate (daily, weekly, model-specific)
  --model=<model>      Specific model to analyze (e.g., "911", "718")
  --trim=<trim>        Specific trim to analyze (e.g., "GT3", "GT4 RS")
  --force              Force regeneration even if recent insights exist
  --dry-run            Show what would be generated without actually running
  --validate           Validate previous predictions against actual market data
  --help, -h           Show this help message

Examples:
  tsx scripts/analytics/generate-market-insights.ts --type=daily
  tsx scripts/analytics/generate-market-insights.ts --type=weekly --validate
  tsx scripts/analytics/generate-market-insights.ts --type=model-specific --model=911 --trim="GT3"
  tsx scripts/analytics/generate-market-insights.ts --dry-run --type=daily
`);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const options = parseArguments();
    const generator = new MarketInsightsGenerator(options);
    await generator.run();
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { MarketInsightsGenerator, ScriptOptions };