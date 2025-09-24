/**
 * VIN Validation Dataset Builder
 *
 * This script analyzes the database to:
 * 1. Identify all unique year/model/trim combinations
 * 2. Extract representative VIN samples for each combination
 * 3. Build a comprehensive validation dataset for the VIN decoder
 */

import { createClient } from '@supabase/supabase-js';
import { decodePorscheVIN } from '../../lib/utils/porsche-vin-decoder';
import fs from 'fs';
import path from 'path';

// Load environment variables
async function loadEnv() {
  try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env.local' });
  } catch (error) {
    console.log('Running in production environment');
  }
}

let supabase: any;

interface ModelTrimCombination {
  year: number;
  model: string;
  trim: string;
  generation?: string;
  count: number;
  avgPrice: number;
  avgMileage: number;
}

interface VinSample {
  vin: string;
  year: number;
  model: string;
  trim: string;
  generation?: string;
  price: number;
  mileage?: number;
  source: string;
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  decodedData?: any;
}

interface ValidationDataset {
  metadata: {
    generatedAt: string;
    totalCombinations: number;
    totalVins: number;
    selectionCriteria: string[];
  };
  combinations: ModelTrimCombination[];
  vinSamples: VinSample[];
  summaryStats: {
    modelBreakdown: Record<string, number>;
    yearRange: { min: number; max: number };
    confidenceBreakdown: Record<string, number>;
  };
}

/**
 * Query database for unique year/model/trim combinations
 */
async function getModelTrimCombinations(): Promise<ModelTrimCombination[]> {
  console.log('🔍 Querying database for unique year/model/trim combinations...');

  // First, let's see what data structure we have in the raw listings table
  const { data: sampleData, error: sampleError } = await supabase
    .from('listings')
    .select('*')
    .not('vin', 'is', null)
    .limit(5);

  if (sampleError) {
    console.error('❌ Sample query error:', sampleError);
    throw sampleError;
  }

  console.log('📋 Sample listing structure:', sampleData?.[0] ? Object.keys(sampleData[0]) : 'No data');

  // Query raw listings table since active_listings view is empty
  const { data, error } = await supabase
    .from('listings')
    .select(`
      vin,
      price,
      mileage,
      source,
      raw_data
    `)
    .not('vin', 'is', null)
    .not('price', 'is', null)
    .gte('price', 10000) // Filter out obvious errors
    .order('price', { ascending: true })
    .limit(1000); // Limit to get a reasonable sample

  if (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ No data found in listings table');
    return [];
  }

  console.log(`✅ Found ${data.length} listings with VINs`);

  // Decode VINs to extract model/year/trim information
  const combinationMap = new Map<string, ModelTrimCombination>();
  let processedCount = 0;
  let validDecodedCount = 0;

  for (const listing of data) {
    processedCount++;

    if (!listing.vin || !listing.price) continue;

    // Decode the VIN to extract model information
    const decoded = decodePorscheVIN(listing.vin);

    if (!decoded.valid) {
      console.log(`⚠️ Invalid VIN: ${listing.vin}`);
      continue;
    }

    validDecodedCount++;

    // Focus on sports cars only (exclude SUVs and sedans per CLAUDE.md)
    if (decoded.model && (
      decoded.model.toLowerCase().includes('cayenne') ||
      decoded.model.toLowerCase().includes('macan') ||
      decoded.model.toLowerCase().includes('panamera') ||
      decoded.model.toLowerCase().includes('taycan')
    )) {
      continue;
    }

    // Create a key for the combination
    const year = decoded.modelYear || 0;
    const model = decoded.model || 'Unknown';
    const trim = decoded.engineType || decoded.bodyStyle || 'Base';
    const generation = decoded.generation;

    const key = `${year}-${model}-${trim}`;

    if (!combinationMap.has(key)) {
      combinationMap.set(key, {
        year,
        model,
        trim,
        generation,
        count: 0,
        avgPrice: 0,
        avgMileage: 0
      });
    }

    const combo = combinationMap.get(key)!;
    combo.count++;
    combo.avgPrice = (combo.avgPrice * (combo.count - 1) + listing.price) / combo.count;
    if (listing.mileage) {
      combo.avgMileage = (combo.avgMileage * (combo.count - 1) + listing.mileage) / combo.count;
    }

    // Show progress for every 100 processed
    if (processedCount % 100 === 0) {
      console.log(`  Processed ${processedCount}/${data.length} listings (${validDecodedCount} valid VINs)`);
    }
  }

  console.log(`📊 Processed ${processedCount} listings, ${validDecodedCount} valid VIN decodes`);

  const combinations = Array.from(combinationMap.values())
    .filter(combo => combo.count >= 1 && combo.year > 0) // Keep all combinations with valid years
    .sort((a, b) => a.year - b.year || a.model.localeCompare(b.model));

  console.log(`✅ Identified ${combinations.length} unique year/model/trim combinations`);

  return combinations;
}

/**
 * Extract representative VIN samples for each combination
 */
async function extractVinSamples(combinations: ModelTrimCombination[]): Promise<VinSample[]> {
  console.log('🔍 Extracting representative VIN samples...');

  const vinSamples: VinSample[] = [];

  for (const combo of combinations) {
    console.log(`  Processing ${combo.year} ${combo.model} ${combo.trim}...`);

    // Query raw listings that match this decoded combination
    const { data, error } = await supabase
      .from('listings')
      .select(`
        vin,
        price,
        mileage,
        source
      `)
      .not('vin', 'is', null)
      .not('price', 'is', null)
      .gte('price', 10000)
      .order('price', { ascending: true })
      .limit(50); // Get more samples to filter from

    if (error) {
      console.warn(`⚠️ Error querying VINs for ${combo.year} ${combo.model} ${combo.trim}:`, error);
      continue;
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ No VINs found for combination`);
      continue;
    }

    // Filter listings that decode to this specific combination
    const matchingListings = data.filter(listing => {
      const decoded = decodePorscheVIN(listing.vin);
      if (!decoded.valid) return false;

      const matchesYear = decoded.modelYear === combo.year;
      const matchesModel = decoded.model === combo.model;
      const matchesTrim = (decoded.engineType || decoded.bodyStyle || 'Base') === combo.trim;

      return matchesYear && matchesModel && matchesTrim;
    });

    if (matchingListings.length === 0) {
      console.warn(`⚠️ No matching VINs found for ${combo.year} ${combo.model} ${combo.trim}`);
      continue;
    }

    // Select up to 5 best samples using quality criteria
    const qualitySamples = matchingListings
      .filter(listing => {
        // Basic validation
        if (!listing.vin || listing.vin.length !== 17) return false;
        if (!listing.price || listing.price < 10000) return false;

        // Mileage validation (based on notes from scraping fixes)
        if (listing.mileage) {
          const carAge = new Date().getFullYear() - combo.year;
          const isGTCar = combo.trim && (
            combo.trim.includes('GT3') ||
            combo.trim.includes('GT4') ||
            combo.trim.includes('GT2')
          );
          const maxMileage = isGTCar ? 10000 * carAge : 25000 * carAge;

          if (listing.mileage > maxMileage) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Prioritize by multiple factors:
        // 1. Has reasonable mileage (not null)
        // 2. Price not too extreme (within reasonable range)
        const aScore = (a.mileage ? 1 : 0) + (Math.abs(a.price - combo.avgPrice) < combo.avgPrice * 0.5 ? 1 : 0);
        const bScore = (b.mileage ? 1 : 0) + (Math.abs(b.price - combo.avgPrice) < combo.avgPrice * 0.5 ? 1 : 0);
        return bScore - aScore;
      })
      .slice(0, 5); // Take top 5

    // Process each sample
    for (const sample of qualitySamples) {
      const decoded = decodePorscheVIN(sample.vin);

      // All samples in this loop should be valid (we filtered them above)
      // Assess confidence - since they match our decoded combination, they're high confidence
      let confidence: 'high' | 'medium' | 'low' = 'high';

      if (!decoded.valid) {
        confidence = 'low';
      }

      vinSamples.push({
        vin: sample.vin,
        year: combo.year,
        model: combo.model,
        trim: combo.trim,
        generation: combo.generation,
        price: sample.price,
        mileage: sample.mileage || undefined,
        source: sample.source,
        isValid: decoded.valid,
        confidence,
        decodedData: decoded.valid ? {
          model: decoded.model,
          generation: decoded.generation,
          bodyStyle: decoded.bodyStyle,
          engineType: decoded.engineType
        } : undefined
      });
    }
  }

  console.log(`✅ Extracted ${vinSamples.length} VIN samples`);
  return vinSamples;
}

/**
 * Build and save the validation dataset
 */
async function buildValidationDataset(): Promise<ValidationDataset> {
  console.log('🏗️ Building validation dataset...\n');

  // Get unique combinations
  const combinations = await getModelTrimCombinations();

  // Extract VIN samples
  const vinSamples = await extractVinSamples(combinations);

  // Calculate summary statistics
  const modelBreakdown: Record<string, number> = {};
  const confidenceBreakdown: Record<string, number> = {};
  let minYear = Infinity;
  let maxYear = -Infinity;

  for (const sample of vinSamples) {
    // Model breakdown
    modelBreakdown[sample.model] = (modelBreakdown[sample.model] || 0) + 1;

    // Confidence breakdown
    confidenceBreakdown[sample.confidence] = (confidenceBreakdown[sample.confidence] || 0) + 1;

    // Year range
    minYear = Math.min(minYear, sample.year);
    maxYear = Math.max(maxYear, sample.year);
  }

  const dataset: ValidationDataset = {
    metadata: {
      generatedAt: new Date().toISOString(),
      totalCombinations: combinations.length,
      totalVins: vinSamples.length,
      selectionCriteria: [
        "Sports cars only (no SUVs or sedans)",
        "Valid 17-character VINs",
        "Reasonable price (>$10,000)",
        "Mileage validation based on car age and type",
        "Up to 5 samples per year/model/trim combination",
        "Prioritized samples with complete data and typical characteristics"
      ]
    },
    combinations,
    vinSamples,
    summaryStats: {
      modelBreakdown,
      yearRange: { min: minYear, max: maxYear },
      confidenceBreakdown
    }
  };

  return dataset;
}

/**
 * Save dataset to file
 */
async function saveDataset(dataset: ValidationDataset): Promise<void> {
  const outputDir = path.join(process.cwd(), 'lib', 'data');
  const outputFile = path.join(outputDir, 'vin-validation-dataset.json');

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save full dataset
  fs.writeFileSync(outputFile, JSON.stringify(dataset, null, 2));
  console.log(`✅ Dataset saved to ${outputFile}`);

  // Also save a TypeScript version for easier imports
  const tsContent = `/**
 * Porsche VIN Validation Dataset
 * Generated: ${dataset.metadata.generatedAt}
 * Total Combinations: ${dataset.metadata.totalCombinations}
 * Total VINs: ${dataset.metadata.totalVins}
 *
 * This dataset contains high-confidence VIN samples for validating
 * and improving the Porsche VIN decoder accuracy.
 */

export interface ModelTrimCombination {
  year: number;
  model: string;
  trim: string;
  generation?: string;
  count: number;
  avgPrice: number;
  avgMileage: number;
}

export interface VinSample {
  vin: string;
  year: number;
  model: string;
  trim: string;
  generation?: string;
  price: number;
  mileage?: number;
  source: string;
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  decodedData?: {
    model: string;
    generation?: string;
    bodyStyle?: string;
    engineType?: string;
  };
}

export const VIN_VALIDATION_DATASET = ${JSON.stringify(dataset, null, 2)} as const;

// High confidence samples only (for core validation)
export const HIGH_CONFIDENCE_VINS = VIN_VALIDATION_DATASET.vinSamples
  .filter(sample => sample.confidence === 'high') as const;

// VIN patterns by model for pattern recognition
export const VIN_PATTERNS_BY_MODEL = VIN_VALIDATION_DATASET.vinSamples
  .reduce((patterns, sample) => {
    if (!patterns[sample.model]) {
      patterns[sample.model] = [];
    }
    patterns[sample.model].push({
      vin: sample.vin,
      year: sample.year,
      trim: sample.trim,
      generation: sample.generation
    });
    return patterns;
  }, {} as Record<string, Array<{vin: string; year: number; trim: string; generation?: string}>>);
`;

  const tsFile = path.join(outputDir, 'vin-validation-dataset.ts');
  fs.writeFileSync(tsFile, tsContent);
  console.log(`✅ TypeScript dataset saved to ${tsFile}`);
}

/**
 * Print summary report
 */
function printSummaryReport(dataset: ValidationDataset): void {
  console.log('\n📊 VIN VALIDATION DATASET SUMMARY');
  console.log('=' .repeat(50));

  console.log(`\n📈 Overview:`);
  console.log(`  Generated: ${new Date(dataset.metadata.generatedAt).toLocaleString()}`);
  console.log(`  Total Combinations: ${dataset.metadata.totalCombinations}`);
  console.log(`  Total VIN Samples: ${dataset.metadata.totalVins}`);
  console.log(`  Year Range: ${dataset.summaryStats.yearRange.min} - ${dataset.summaryStats.yearRange.max}`);

  console.log(`\n🚗 Model Breakdown:`);
  Object.entries(dataset.summaryStats.modelBreakdown)
    .sort(([,a], [,b]) => b - a)
    .forEach(([model, count]) => {
      console.log(`  ${model}: ${count} samples`);
    });

  console.log(`\n📊 Confidence Distribution:`);
  Object.entries(dataset.summaryStats.confidenceBreakdown)
    .forEach(([confidence, count]) => {
      const percentage = ((count / dataset.metadata.totalVins) * 100).toFixed(1);
      console.log(`  ${confidence}: ${count} samples (${percentage}%)`);
    });

  console.log(`\n🔍 Top Model/Trim Combinations:`);
  dataset.combinations
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach((combo, index) => {
      console.log(`  ${index + 1}. ${combo.year} ${combo.model} ${combo.trim} (${combo.count} listings)`);
    });

  console.log(`\n📋 Selection Criteria:`);
  dataset.metadata.selectionCriteria.forEach((criteria, index) => {
    console.log(`  ${index + 1}. ${criteria}`);
  });

  console.log('\n✅ Dataset generation complete!');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting VIN Validation Dataset Builder\n');

    // Load environment variables
    await loadEnv();

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase configuration');
      process.exit(1);
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const dataset = await buildValidationDataset();
    await saveDataset(dataset);
    printSummaryReport(dataset);

  } catch (error) {
    console.error('❌ Error building validation dataset:', error);
    process.exit(1);
  }
}

// Run the script
main();