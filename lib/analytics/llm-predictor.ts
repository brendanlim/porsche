import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Listing } from '@/lib/types/database';
import crypto from 'crypto';

// Types for LLM Analytics
export interface PredictionRequest {
  model: string;
  trim: string;
  generation?: string;
  timeHorizon: '1m' | '3m' | '6m' | '1y';
  context?: MarketContext;
  mileageRange?: { min: number; max: number };
  yearRange?: { min: number; max: number };
}

export interface MarketContext {
  currentListings: Listing[];
  historicalSales: Listing[];
  marketConditions?: ExternalFactors;
  seasonality?: SeasonalData;
  comparableModels?: string[];
}

export interface ExternalFactors {
  interestRates?: number;
  economicOutlook?: 'positive' | 'neutral' | 'negative';
  newModelReleases?: string[];
  racingEvents?: string[];
  marketSentiment?: 'bullish' | 'neutral' | 'bearish';
}

export interface SeasonalData {
  currentSeason: 'winter' | 'spring' | 'summer' | 'fall';
  historicalSeasonalPremiums: Record<string, number>;
  volumePatterns: Record<string, number>;
}

export interface PricePrediction {
  id: string;
  model: string;
  trim: string;
  generation?: string;
  predictionDate: Date;
  targetDate: Date;
  
  // Price predictions
  predictedPriceLow: number;
  predictedPriceAvg: number;
  predictedPriceHigh: number;
  
  // Confidence and context
  confidenceScore: number; // 0-1
  keyFactors: string[];
  riskFactors: string[];
  marketAssumptions: string[];
  
  // Methodology
  dataPointsAnalyzed: number;
  llmProvider: string;
  llmModel: string;
  promptVersion: string;
  processingTimeMs: number;
  costUsd: number;
}

export interface Anomaly {
  id: string;
  listingId: string;
  anomalyType: 'undervalued' | 'overvalued' | 'unusual_options' | 'data_quality' | 'market_movement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Anomaly details
  expectedPriceMin: number;
  expectedPriceMax: number;
  actualPrice: number;
  deviationPercentage: number;
  
  // Analysis
  explanation: string;
  contributingFactors: Record<string, any>;
  confidenceScore: number;
  
  // Recommendations
  investigationSteps: string[];
  riskAssessment: string;
  
  detectedAt: Date;
  status: 'active' | 'resolved' | 'false_positive';
}

export interface MarketInsight {
  id: string;
  insightType: 'price_prediction' | 'market_summary' | 'trend_analysis' | 'investment_recommendation';
  model?: string;
  trim?: string;
  generation?: string;
  
  // Content
  title: string;
  summary: string;
  detailedAnalysis: Record<string, any>;
  
  // Metadata
  analysisDate: Date;
  predictionHorizonDays?: number;
  confidenceScore: number;
  dataPointsAnalyzed: number;
  
  // LLM details
  llmProvider: string;
  llmModel: string;
  promptVersion: string;
  processingTimeMs: number;
  costUsd: number;
}

export interface CachedResponse {
  cacheKey: string;
  response: any;
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastAccessed: Date;
}

export interface PromptTemplate {
  id: string;
  type: string;
  version: string;
  systemPrompt: string;
  userPromptTemplate: string;
  modelProvider: 'openai' | 'anthropic';
  modelName: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
}

/**
 * Core LLM Predictor class for PorscheStats analytics
 * Handles price predictions, anomaly detection, and market insights
 */
export class LLMPredictor {
  private openai: OpenAI;
  private defaultModel: string = 'gpt-4-turbo-preview';
  private cacheManager: CacheManager;
  private promptManager: PromptManager;
  private costTracker: CostTracker;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.cacheManager = new CacheManager();
    this.promptManager = new PromptManager();
    this.costTracker = new CostTracker();
  }

  /**
   * Generate price predictions for a specific model/trim
   */
  async predictPrices(request: PredictionRequest): Promise<PricePrediction> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('price_prediction', request);
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached.response;
      }

      // Gather market context
      const context = await this.gatherMarketContext(request);
      
      // Get prompt template
      const prompt = await this.promptManager.getPrompt('price_prediction', 'v1.0');
      
      // Prepare LLM request
      const systemPrompt = prompt.systemPrompt;
      const userPrompt = this.buildUserPrompt(prompt.userPromptTemplate, request, context);
      
      // Make LLM request
      const response = await this.openai.chat.completions.create({
        model: prompt.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: prompt.temperature,
        max_tokens: prompt.maxTokens,
        response_format: { type: 'json_object' }
      });

      const processingTime = Date.now() - startTime;
      
      // Parse and validate response with error handling
      let analysis;
      try {
        const content = response.choices[0].message.content || '{}';
        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : content;
        analysis = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Error parsing price prediction JSON:', parseError);
        console.error('Raw response:', response.choices[0].message.content?.substring(0, 500));
        
        // Fallback to a basic prediction structure
        analysis = {
          prediction: {
            lowEstimate: 0,
            expectedPrice: 0,
            highEstimate: 0,
            currency: 'USD'
          },
          confidence: 0,
          factors: [],
          error: 'Failed to parse LLM response'
        };
      }
      
      // Create prediction object
      const prediction: PricePrediction = {
        id: crypto.randomUUID(),
        model: request.model,
        trim: request.trim,
        generation: request.generation,
        predictionDate: new Date(),
        targetDate: this.calculateTargetDate(request.timeHorizon),
        
        predictedPriceLow: analysis.price_prediction?.low || 0,
        predictedPriceAvg: analysis.price_prediction?.average || 0,
        predictedPriceHigh: analysis.price_prediction?.high || 0,
        
        confidenceScore: analysis.confidence_score || 0,
        keyFactors: analysis.key_factors || [],
        riskFactors: analysis.risk_factors || [],
        marketAssumptions: analysis.market_assumptions || [],
        
        dataPointsAnalyzed: context.historicalSales.length + context.currentListings.length,
        llmProvider: 'openai',
        llmModel: prompt.modelName,
        promptVersion: prompt.version,
        processingTimeMs: processingTime,
        costUsd: this.calculateCost(response.usage)
      };

      // Store in database and cache
      await this.storePrediction(prediction);
      await this.cacheManager.set(cacheKey, prediction, this.getCacheTTL('price_prediction'));
      
      // Track costs
      await this.costTracker.track('openai', prompt.modelName, response.usage, prediction.costUsd);

      return prediction;
      
    } catch (error) {
      console.error('Error generating price prediction:', error);
      throw new Error(`Price prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect anomalies in listings or market movements
   */
  async detectAnomalies(listings: Listing[], analysisType: 'listings' | 'market' = 'listings'): Promise<Anomaly[]> {
    const startTime = Date.now();
    
    try {
      if (listings.length === 0) {
        return [];
      }

      // Check cache
      const cacheKey = this.generateCacheKey('anomaly_detection', { 
        listings: listings.map(l => l.id).sort(),
        analysisType 
      });
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached.response;
      }

      // Get market benchmarks for comparison
      const benchmarks = await this.getMarketBenchmarks(listings);
      
      // Get prompt template
      const prompt = await this.promptManager.getPrompt('anomaly_detection', 'v1.0');
      
      // Prepare data for LLM
      const listingData = this.formatListingsForLLM(listings);
      const benchmarkData = this.formatBenchmarksForLLM(benchmarks);
      
      // Build prompt
      const userPrompt = this.buildAnomalyDetectionPrompt(
        prompt.userPromptTemplate,
        listingData,
        benchmarkData,
        analysisType
      );
      
      // Make LLM request
      const response = await this.openai.chat.completions.create({
        model: prompt.modelName,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: prompt.temperature,
        max_tokens: prompt.maxTokens,
        response_format: { type: 'json_object' }
      });

      const processingTime = Date.now() - startTime;
      
      // Parse response
      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Convert to Anomaly objects
      const anomalies: Anomaly[] = (analysis.anomalies || []).map((anomaly: any) => ({
        id: crypto.randomUUID(),
        listingId: anomaly.listing_id,
        anomalyType: anomaly.type,
        severity: anomaly.severity,
        
        expectedPriceMin: anomaly.expected_price_range?.min || 0,
        expectedPriceMax: anomaly.expected_price_range?.max || 0,
        actualPrice: anomaly.actual_price || 0,
        deviationPercentage: anomaly.deviation_percentage || 0,
        
        explanation: anomaly.explanation || '',
        contributingFactors: anomaly.contributing_factors || {},
        confidenceScore: anomaly.confidence_score || 0,
        
        investigationSteps: anomaly.investigation_steps || [],
        riskAssessment: anomaly.risk_assessment || '',
        
        detectedAt: new Date(),
        status: 'active' as const
      }));

      // Store anomalies
      await this.storeAnomalies(anomalies);
      
      // Cache results
      await this.cacheManager.set(cacheKey, anomalies, this.getCacheTTL('anomaly_detection'));
      
      // Track costs
      await this.costTracker.track('openai', prompt.modelName, response.usage, this.calculateCost(response.usage));

      return anomalies;
      
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw new Error(`Anomaly detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate market insights and summaries
   */
  async generateMarketInsights(
    insightType: MarketInsight['insightType'],
    model?: string,
    trim?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<MarketInsight> {
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = this.generateCacheKey('market_insights', { 
        insightType, model, trim, timeRange 
      });
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached.response;
      }

      // Gather relevant market data
      const marketData = await this.gatherMarketInsightsData(model, trim, timeRange);
      
      // Get prompt template
      const prompt = await this.promptManager.getPrompt(`market_${insightType}`, 'v1.0');
      
      // Build prompt with market data
      const userPrompt = this.buildMarketInsightsPrompt(
        prompt.userPromptTemplate,
        insightType,
        marketData
      );
      
      // Make LLM request
      const response = await this.openai.chat.completions.create({
        model: prompt.modelName,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: prompt.temperature,
        max_tokens: prompt.maxTokens,
        response_format: { type: 'json_object' }
      });

      const processingTime = Date.now() - startTime;
      
      // Parse response
      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Create insight object
      const insight: MarketInsight = {
        id: crypto.randomUUID(),
        insightType,
        model,
        trim,
        
        title: analysis.title || `${insightType} Analysis`,
        summary: analysis.summary || '',
        detailedAnalysis: analysis.detailed_analysis || {},
        
        analysisDate: new Date(),
        predictionHorizonDays: this.getHorizonDays(analysis.prediction_horizon),
        confidenceScore: analysis.confidence_score || 0,
        dataPointsAnalyzed: marketData.totalDataPoints || 0,
        
        llmProvider: 'openai',
        llmModel: prompt.modelName,
        promptVersion: prompt.version,
        processingTimeMs: processingTime,
        costUsd: this.calculateCost(response.usage)
      };

      // Store insight
      await this.storeMarketInsight(insight);
      
      // Cache result
      await this.cacheManager.set(cacheKey, insight, this.getCacheTTL('market_insights'));
      
      // Track costs
      await this.costTracker.track('openai', prompt.modelName, response.usage, insight.costUsd);

      return insight;
      
    } catch (error) {
      console.error('Error generating market insights:', error);
      throw new Error(`Market insights generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate previous predictions against actual market outcomes
   */
  async validatePredictions(cutoffDate: Date = new Date()): Promise<void> {
    try {
      // Get predictions that should be validated
      const { data: predictions, error } = await supabaseAdmin
        .from('price_predictions')
        .select('*')
        .lte('target_date', cutoffDate.toISOString())
        .is('validated_at', null);

      if (error) throw error;

      for (const prediction of predictions || []) {
        try {
          // Get actual market data for the prediction period
          const actualData = await this.getActualMarketData(
            prediction.model,
            prediction.trim,
            new Date(prediction.target_date)
          );

          if (actualData.salesCount >= 3) { // Minimum data for validation
            // Calculate accuracy
            const accuracy = this.calculatePredictionAccuracy(prediction, actualData);
            
            // Update prediction with validation data
            await supabaseAdmin
              .from('price_predictions')
              .update({
                actual_avg_price: actualData.avgPrice,
                actual_min_price: actualData.minPrice,
                actual_max_price: actualData.maxPrice,
                accuracy_percentage: accuracy,
                validated_at: new Date().toISOString()
              })
              .eq('id', prediction.id);

            console.log(`Validated prediction ${prediction.id} with ${accuracy}% accuracy`);
          }
        } catch (error) {
          console.error(`Error validating prediction ${prediction.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error validating predictions:', error);
      throw error;
    }
  }

  // Private helper methods

  private generateCacheKey(operation: string, params: any): string {
    const paramsString = JSON.stringify(params, Object.keys(params).sort());
    return crypto.createHash('md5').update(`${operation}:${paramsString}`).digest('hex');
  }

  private async gatherMarketContext(request: PredictionRequest): Promise<MarketContext> {
    // Get historical sales data
    const { data: historicalSales } = await supabaseAdmin
      .from('listings')
      .select('*')
      .ilike('model', request.model)
      .ilike('trim', request.trim)
      .not('sold_date', 'is', null)
      .gte('sold_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .order('sold_date', { ascending: false })
      .limit(100);

    // Get current listings
    const { data: currentListings } = await supabaseAdmin
      .from('listings')
      .select('*')
      .ilike('model', request.model)
      .ilike('trim', request.trim)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    return {
      historicalSales: historicalSales || [],
      currentListings: currentListings || [],
      seasonality: await this.getSeasonalData(request.model, request.trim),
      marketConditions: await this.getExternalFactors()
    };
  }

  private buildUserPrompt(template: string, request: PredictionRequest, context: MarketContext): string {
    // Replace template variables with actual data
    return template
      .replace('{model}', request.model)
      .replace('{trim}', request.trim)
      .replace('{generation}', request.generation || 'All')
      .replace('{time_horizon}', request.timeHorizon)
      .replace('{historical_sales_data}', JSON.stringify(context.historicalSales.slice(0, 20)))
      .replace('{current_listings_data}', JSON.stringify(context.currentListings.slice(0, 10)))
      .replace('{seasonal_data}', JSON.stringify(context.seasonality))
      .replace('{market_conditions}', JSON.stringify(context.marketConditions));
  }

  private calculateTargetDate(timeHorizon: string): Date {
    const now = new Date();
    switch (timeHorizon) {
      case '1m': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case '3m': return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      case '6m': return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      case '1y': return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateCost(usage: any): number {
    // OpenAI GPT-4 Turbo pricing (approximate)
    const inputCostPer1k = 0.01;
    const outputCostPer1k = 0.03;
    
    const inputCost = (usage?.prompt_tokens || 0) * inputCostPer1k / 1000;
    const outputCost = (usage?.completion_tokens || 0) * outputCostPer1k / 1000;
    
    return inputCost + outputCost;
  }

  private getCacheTTL(operation: string): number {
    const ttls = {
      'price_prediction': 6 * 60 * 60, // 6 hours
      'anomaly_detection': 1 * 60 * 60, // 1 hour
      'market_insights': 24 * 60 * 60, // 24 hours
    };
    return ttls[operation as keyof typeof ttls] || 3600;
  }

  private async storePrediction(prediction: PricePrediction): Promise<void> {
    const { error } = await supabaseAdmin
      .from('price_predictions')
      .insert({
        id: prediction.id,
        model: prediction.model,
        trim: prediction.trim,
        generation: prediction.generation,
        predicted_price_low: prediction.predictedPriceLow,
        predicted_price_avg: prediction.predictedPriceAvg,
        predicted_price_high: prediction.predictedPriceHigh,
        prediction_date: prediction.predictionDate.toISOString(),
        target_date: prediction.targetDate.toISOString(),
        key_assumptions: prediction.marketAssumptions,
        risk_factors: prediction.riskFactors,
        market_conditions: {
          data_points_analyzed: prediction.dataPointsAnalyzed,
          confidence_score: prediction.confidenceScore,
          key_factors: prediction.keyFactors
        }
      });

    if (error) {
      console.error('Error storing prediction:', error);
      throw error;
    }
  }

  private async storeAnomalies(anomalies: Anomaly[]): Promise<void> {
    // Anomalies are now stored in market_insights table as JSONB
    // This method is kept for backward compatibility but does nothing
    if (anomalies.length === 0) return;
    
    // TODO: Store anomalies in market_insights table instead
    console.log(`Would store ${anomalies.length} anomalies (feature disabled - stored in market_insights instead)`);
  }

  private async storeMarketInsight(insight: MarketInsight): Promise<void> {
    const { error } = await supabaseAdmin
      .from('market_insights')
      .insert({
        id: insight.id,
        insight_type: insight.insightType,
        model: insight.model,
        trim: insight.trim,
        time_range: '7d', // Default time range
        summary: insight.summary || insight.insight_summary,
        key_findings: insight.keyFindings || [],
        anomalies: insight.anomalies || [],
        predictions: insight.predictions || [],
        recommendations: insight.recommendations || [],
        trending_models: insight.trendingModels || [],
        undervalued_listings: insight.undervaluedListings || [],
        data_points: insight.dataPointsAnalyzed || 0,
        confidence_score: insight.confidenceScore,
        generated_at: insight.analysisDate.toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Expire in 7 days
      });

    if (error) {
      console.error('Error storing market insight:', error);
      throw error;
    }
  }

  // Additional helper methods would be implemented here...
  private async getSeasonalData(model: string, trim: string): Promise<SeasonalData> {
    // Implementation would fetch and analyze seasonal patterns
    return {
      currentSeason: this.getCurrentSeason(),
      historicalSeasonalPremiums: {},
      volumePatterns: {}
    };
  }

  private getCurrentSeason(): 'winter' | 'spring' | 'summer' | 'fall' {
    const month = new Date().getMonth();
    if (month >= 11 || month <= 1) return 'winter';
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    return 'fall';
  }

  private async getExternalFactors(): Promise<ExternalFactors> {
    // Implementation would fetch current market conditions
    return {
      economicOutlook: 'neutral',
      marketSentiment: 'neutral'
    };
  }

  private formatListingsForLLM(listings: Listing[]): any {
    return listings.map(listing => ({
      id: listing.id,
      year: listing.year,
      model: listing.model,
      trim: listing.trim,
      price: listing.price,
      mileage: listing.mileage,
      color: listing.exterior_color,
      location: listing.location,
      daysOnMarket: listing.sold_date && listing.created_at 
        ? Math.floor((new Date(listing.sold_date).getTime() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : null
    }));
  }

  private async getMarketBenchmarks(listings: Listing[]): Promise<any> {
    // Implementation would calculate market benchmarks for comparison
    return {};
  }

  private formatBenchmarksForLLM(benchmarks: any): any {
    return benchmarks;
  }

  private buildAnomalyDetectionPrompt(template: string, listingData: any, benchmarkData: any, analysisType: string): string {
    return template
      .replace('{listings_data}', JSON.stringify(listingData))
      .replace('{benchmark_data}', JSON.stringify(benchmarkData))
      .replace('{analysis_type}', analysisType);
  }

  private async gatherMarketInsightsData(model?: string, trim?: string, timeRange?: any): Promise<any> {
    // Implementation would gather comprehensive market data
    return { totalDataPoints: 0 };
  }

  private buildMarketInsightsPrompt(template: string, insightType: string, marketData: any): string {
    return template
      .replace('{insight_type}', insightType)
      .replace('{market_data}', JSON.stringify(marketData));
  }

  private getHorizonDays(horizon?: string): number | undefined {
    if (!horizon) return undefined;
    const horizonMap: Record<string, number> = {
      '1m': 30, '3m': 90, '6m': 180, '1y': 365
    };
    return horizonMap[horizon];
  }

  private async getActualMarketData(model: string, trim: string, targetDate: Date): Promise<any> {
    // Implementation would fetch actual sales data around the target date
    return { salesCount: 0, avgPrice: 0, minPrice: 0, maxPrice: 0 };
  }

  private calculatePredictionAccuracy(prediction: any, actualData: any): number {
    // Implementation would calculate accuracy percentage
    const predictedAvg = prediction.predicted_price_avg;
    const actualAvg = actualData.avgPrice;
    return Math.max(0, 100 - Math.abs((predictedAvg - actualAvg) / actualAvg) * 100);
  }
}

// Supporting classes that would be implemented

class CacheManager {
  async get(key: string): Promise<CachedResponse | null> {
    const { data } = await supabaseAdmin
      .from('llm_cache')
      .select('*')
      .eq('cache_key', key)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (data) {
      // Update hit count and last accessed
      await supabaseAdmin
        .from('llm_cache')
        .update({ 
          hit_count: data.hit_count + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('cache_key', key);
      
      return {
        cacheKey: data.cache_key,
        response: data.response_data,
        createdAt: new Date(data.created_at),
        expiresAt: new Date(data.expires_at),
        hitCount: data.hit_count,
        lastAccessed: new Date(data.last_accessed)
      };
    }
    
    return null;
  }

  async set(key: string, response: any, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    await supabaseAdmin
      .from('llm_cache')
      .upsert({
        cache_key: key,
        prompt_hash: crypto.createHash('md5').update(JSON.stringify(response)).digest('hex'),
        model_provider: 'openai',
        model_name: 'gpt-4-turbo-preview',
        response_data: response,
        expires_at: expiresAt.toISOString(),
        hit_count: 0
      });
  }

  async invalidate(pattern: string): Promise<void> {
    // Implementation would clear cache entries matching pattern
  }
}

import * as fs from 'fs';
import * as path from 'path';

class PromptManager {
  private prompts: Map<string, PromptTemplate> = new Map();
  private promptsDir = path.join(process.cwd(), 'lib', 'prompts');
  
  constructor() {
    this.loadPrompts();
  }
  
  private loadPrompts() {
    // Map of prompt types to their file names
    const promptFiles: Record<string, { file: string, modelConfig?: Partial<PromptTemplate> }> = {
      'market_market_summary': { 
        file: 'market-summary.md',
        modelConfig: {
          modelProvider: 'openai',
          modelName: 'gpt-4-turbo-preview',
          temperature: 0.7,
          maxTokens: 1000
        }
      },
      'anomaly_detection': { 
        file: 'anomaly-detection.md',
        modelConfig: {
          modelProvider: 'openai',
          modelName: 'gpt-4-turbo-preview',
          temperature: 0.3,
          maxTokens: 800
        }
      },
      'price_prediction': { 
        file: 'price-prediction.md',
        modelConfig: {
          modelProvider: 'openai',
          modelName: 'gpt-4-turbo-preview',
          temperature: 0.5,
          maxTokens: 600
        }
      },
      'trend_analysis': {
        file: 'trend-analysis.md',
        modelConfig: {
          modelProvider: 'openai',
          modelName: 'gpt-4-turbo-preview',
          temperature: 0.6,
          maxTokens: 800
        }
      },
      'market_trend_analysis': {  // Also register with market_ prefix for compatibility
        file: 'trend-analysis.md',
        modelConfig: {
          modelProvider: 'openai',
          modelName: 'gpt-4-turbo-preview',
          temperature: 0.6,
          maxTokens: 800
        }
      },
      'investment_recommendation': {
        file: 'investment-recommendation.md',
        modelConfig: {
          modelProvider: 'openai',
          modelName: 'gpt-4-turbo-preview',
          temperature: 0.5,
          maxTokens: 1200
        }
      },
      'market_investment_recommendation': {  // Also with market_ prefix
        file: 'investment-recommendation.md',
        modelConfig: {
          modelProvider: 'openai',
          modelName: 'gpt-4-turbo-preview',
          temperature: 0.5,
          maxTokens: 1200
        }
      }
    };
    
    for (const [type, config] of Object.entries(promptFiles)) {
      try {
        const filePath = path.join(this.promptsDir, config.file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const { systemPrompt, userPrompt } = this.parsePromptFile(content);
          
          this.prompts.set(type, {
            id: type,
            type: type,
            version: '1.0',
            systemPrompt,
            userPromptTemplate: userPrompt,
            modelProvider: config.modelConfig?.modelProvider || 'openai',
            modelName: config.modelConfig?.modelName || 'gpt-4-turbo-preview',
            temperature: config.modelConfig?.temperature || 0.7,
            maxTokens: config.modelConfig?.maxTokens || 1000,
            isActive: true
          });
        }
      } catch (error) {
        console.warn(`Failed to load prompt ${type}:`, error);
      }
    }
  }
  
  private parsePromptFile(content: string): { systemPrompt: string; userPrompt: string } {
    const systemMatch = content.match(/## System Prompt\n([\s\S]*?)(?=##|$)/);
    const userMatch = content.match(/## User Prompt\n([\s\S]*?)(?=##|$)/);
    
    return {
      systemPrompt: systemMatch ? systemMatch[1].trim() : '',
      userPrompt: userMatch ? userMatch[1].trim() : ''
    };
  }
  
  async getPrompt(type: string, version?: string): Promise<PromptTemplate> {
    const prompt = this.prompts.get(type);
    
    if (!prompt) {
      throw new Error(`No active prompt found for type: ${type}`);
    }
    
    return prompt;
  }
}

class CostTracker {
  async track(provider: string, model: string, usage: any, cost: number): Promise<void> {
    // Implementation would track API usage and costs
    console.log(`${provider} ${model}: $${cost.toFixed(4)} for ${usage?.total_tokens || 0} tokens`);
  }
}

export default LLMPredictor;