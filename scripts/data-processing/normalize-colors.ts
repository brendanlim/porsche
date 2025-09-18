#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Lazy initialization to ensure env vars are loaded
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openai;
}

// Map of common color variations to normalized names
const COLOR_NORMALIZATION: Record<string, string> = {
  // Arctic Silver variations
  'arctic silver': 'Arctic Silver',
  'arctic silver metallic': 'Arctic Silver Metallic',
  'arctic silver metallic (l92u)': 'Arctic Silver Metallic',
  
  // Black variations
  'black': 'Black',
  'basalt black': 'Basalt Black',
  'basalt black metallic': 'Basalt Black Metallic',
  
  // Speed Yellow
  'speed yellow': 'Speed Yellow',
  'speed yellow (l12h)': 'Speed Yellow',
  'yellow': 'Speed Yellow',
  
  // Blue variations
  'cobalt blue': 'Cobalt Blue',
  'cobalt blue metallic': 'Cobalt Blue Metallic',
  'lapis blue': 'Lapis Blue',
  'lapis blue metallic': 'Lapis Blue Metallic',
  'midnight blue': 'Midnight Blue',
  'midnight blue metallic': 'Midnight Blue Metallic',
  'midnight blue metallic (l39c)': 'Midnight Blue Metallic',
  
  // Grey variations
  'atlas grey': 'Atlas Grey',
  'atlas grey metallic': 'Atlas Grey Metallic',
  'seal grey': 'Seal Grey',
  'seal grey metallic': 'Seal Grey Metallic',
  
  // Red variations
  'guards red': 'Guards Red',
  
  // White variations
  'white': 'White',
  'a white': 'White',
  'carrara white': 'Carrara White',
  
  // Special/Custom colors
  'white and yellow': 'White with Yellow accents',
};

function extractColorFromDescription(description: string): string | null {
  if (!description) return null;
  
  // Convert to lowercase for matching
  const lower = description.toLowerCase();
  
  // Remove common suffixes that aren't colors
  const cleaned = lower
    .replace(/\s+over\s+.*/g, '') // Remove "over [interior]"
    .replace(/\s+and\s+(is|features|equipped|powered).*/g, '') // Remove "and is powered by..."
    .replace(/\s+with\s+.*/g, '') // Remove "with..."
    .replace(/\s+\([^)]+\)/g, '') // Remove parenthetical codes
    .replace(/[_\-]/g, ' ') // Replace underscores/dashes with spaces
    .trim();
  
  // Check if it's in our normalization map
  if (COLOR_NORMALIZATION[cleaned]) {
    return COLOR_NORMALIZATION[cleaned];
  }
  
  // If it starts with a known color, extract just that part
  for (const [key, normalized] of Object.entries(COLOR_NORMALIZATION)) {
    if (cleaned.startsWith(key)) {
      return normalized;
    }
  }
  
  // If it's clearly not a color (contains numbers, file extensions, etc.)
  if (/\d{4,}|\.jpg|\.png|scaled|porsche|gt3/i.test(cleaned)) {
    return null;
  }
  
  // If we can't normalize it, return null to mark for Gemini processing
  return null;
}

async function normalizeWithOpenAI(description: string): Promise<string | null> {
  const prompt = `Extract ONLY the exterior paint color from this Porsche vehicle description.
    
Description: "${description}"

Rules:
1. Return ONLY the exterior color name (e.g., "Arctic Silver Metallic", "Speed Yellow", "Black")
2. If the description contains "over [interior color]", ignore the interior color
3. If no clear exterior color is mentioned, return NULL
4. Normalize common abbreviations (e.g., "GT Silver" → "GT Silver Metallic")
5. Do not include interior colors, features, or any other information
6. Common Porsche colors include: Arctic Silver, Speed Yellow, Guards Red, Black, Basalt Black, Cobalt Blue, Seal Grey, Atlas Grey, Carrara White, GT Silver, Midnight Blue

Return ONLY the color name or NULL, nothing else.`;

  // Retry logic for overload errors - similar to model-trim-normalizer.ts
  let retries = 3;
  let lastError: any;
  
  while (retries > 0) {
    try {
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Extract ONLY the exterior paint color from Porsche vehicle descriptions. Return ONLY the color name or NULL, nothing else.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 50,
      });
      
      const text = completion.choices[0].message.content?.trim() || '';
      
      // Clean up Gemini response
      if (text.toLowerCase() === 'null' || text === '') {
        return null;
      }
      
      // Remove quotes if present
      return text.replace(/^["']|["']$/g, '').trim();
    } catch (error: any) {
      lastError = error;
      
      if (error.status === 429) {
        // Quota exhausted - give up immediately to avoid burning through quota
        console.warn(`OpenAI quota exhausted (429). Stopping color normalization.`);
        throw new Error('QUOTA_EXHAUSTED');
      } else if (error.status === 503 || error.message?.includes('overloaded')) {
        // Model overloaded, retry with exponential backoff
        retries--;
        if (retries > 0) {
          const delay = (3 - retries) * 2000; // 2s, 4s, 6s
          console.log(`OpenAI overloaded, retrying in ${delay/1000}s... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.warn('OpenAI overloaded after retries for:', description.substring(0, 50));
          return null;
        }
      } else {
        // Unknown error, log and return null
        console.error('OpenAI error:', error.message);
        return null;
      }
    }
  }
  
  return null;
}

async function normalizeColors() {
  console.log('Fetching all listings with exterior colors...\n');
  
  // Check if OpenAI API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not set. Only simple normalization will be performed.');
  }
  
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, exterior_color, model, trim, generation')
    .not('exterior_color', 'is', null);
  
  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }
  
  console.log(`Found ${listings?.length || 0} listings with colors\n`);
  
  const updates: Array<{ id: string; old_color: string; new_color: string | null }> = [];
  const needsGemini: Array<{ id: string; color: string; model: string; trim: string }> = [];
  
  // First pass: try simple normalization
  for (const listing of listings || []) {
    const normalized = extractColorFromDescription(listing.exterior_color);
    
    if (normalized && normalized !== listing.exterior_color) {
      updates.push({
        id: listing.id,
        old_color: listing.exterior_color,
        new_color: normalized
      });
    } else if (!normalized && listing.exterior_color) {
      // Couldn't normalize with simple rules - try OpenAI
      needsGemini.push({
        id: listing.id,
        color: listing.exterior_color,
        model: listing.model,
        trim: listing.trim
      });
    }
  }
  
  // Second pass: use OpenAI for difficult cases
  if (needsGemini.length > 0) {
    if (process.env.OPENAI_API_KEY) {
      console.log(`\n🤖 Using OpenAI to normalize ${needsGemini.length} complex color descriptions...`);
      console.log(`(Processing with delay every 5 items to avoid overload)\n`);
      
      for (let i = 0; i < needsGemini.length; i++) {
        const item = needsGemini[i];
        console.log(`  Processing ${i+1}/${needsGemini.length}: "${item.color.substring(0, 40)}..."`)
        
        // Skip obvious non-colors
        if (item.color.includes('.jpg') || 
            item.color.includes('scaled') || 
            item.color.includes('_') ||
            item.color.length > 200) {
          updates.push({
            id: item.id,
            old_color: item.color,
            new_color: null
          });
          continue;
        }
        
        try {
          const geminiColor = await normalizeWithOpenAI(item.color);
          
          if (geminiColor && geminiColor !== item.color) {
            updates.push({
              id: item.id,
              old_color: item.color,
              new_color: geminiColor
            });
            console.log(`  ✅ "${item.color.substring(0, 50)}..." → "${geminiColor}"`);
          } else if (!geminiColor) {
            // OpenAI couldn't extract a color either - set to null
            updates.push({
              id: item.id,
              old_color: item.color,
              new_color: null
            });
          }
        } catch (error: any) {
          if (error.message === 'QUOTA_EXHAUSTED') {
            console.log('\n⚠️ OpenAI quota exhausted. Stopping OpenAI processing.');
            console.log(`Processed ${i} of ${needsGemini.length} items before quota limit.`);
            
            // Mark remaining items as skipped
            for (let j = i; j < needsGemini.length; j++) {
              updates.push({
                id: needsGemini[j].id,
                old_color: needsGemini[j].color,
                new_color: null  // Can't process without OpenAI
              });
            }
            break;
          }
          // For other errors, just skip this item
          updates.push({
            id: item.id,
            old_color: item.color,
            new_color: null
          });
        }
        
        // Add delay every 5 requests to avoid overloading OpenAI
        if ((i + 1) % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      console.log(`\n⚠️ Skipping OpenAI normalization for ${needsGemini.length} complex colors (no API key).`);
      // Mark all as unable to process without OpenAI
      for (const item of needsGemini) {
        // For obvious non-colors, set to null
        if (item.color.includes('.jpg') || 
            item.color.includes('scaled') || 
            item.color.includes('_') ||
            item.color.length > 200) {
          updates.push({
            id: item.id,
            old_color: item.color,
            new_color: null
          });
        }
        // For others, leave unchanged since we can't process without OpenAI
      }
    }
  }
  
  console.log(`Found ${updates.length} colors to update\n`);
  
  // Show some examples
  if (updates.length > 0) {
    console.log('Sample updates:');
    updates.slice(0, 10).forEach(u => {
      if (u.new_color) {
        console.log(`  "${u.old_color}" → "${u.new_color}"`);
      } else {
        console.log(`  "${u.old_color.substring(0, 50)}..." → NULL (not a color)`);
      }
    });
    console.log();
  }
  
  // Apply updates
  console.log('Applying updates...');
  let successCount = 0;
  let errorCount = 0;
  
  for (const update of updates) {
    const { error } = await supabase
      .from('listings')
      .update({ exterior_color: update.new_color })
      .eq('id', update.id);
    
    if (error) {
      console.error(`Error updating ${update.id}:`, error.message);
      errorCount++;
    } else {
      successCount++;
      if (successCount % 10 === 0) {
        console.log(`  Updated ${successCount}/${updates.length}...`);
      }
    }
  }
  
  console.log(`\n✅ Successfully updated ${successCount} listings`);
  if (errorCount > 0) {
    console.log(`❌ Failed to update ${errorCount} listings`);
  }
  
  // Show final color distribution for all models
  console.log('\n📊 Updated color distribution across all models:');
  const { data: updatedColors } = await supabase
    .from('listings')
    .select('exterior_color, model, trim')
    .not('exterior_color', 'is', null);
  
  const colorCounts: Record<string, number> = {};
  const modelColorCounts: Record<string, Record<string, number>> = {};
  
  updatedColors?.forEach(l => {
    // Overall counts
    colorCounts[l.exterior_color] = (colorCounts[l.exterior_color] || 0) + 1;
    
    // Per-model counts
    const modelKey = `${l.model}${l.trim ? ' ' + l.trim : ''}`;
    if (!modelColorCounts[modelKey]) {
      modelColorCounts[modelKey] = {};
    }
    modelColorCounts[modelKey][l.exterior_color] = 
      (modelColorCounts[modelKey][l.exterior_color] || 0) + 1;
  });
  
  // Show top colors overall
  console.log('\nTop colors overall:');
  Object.entries(colorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15)
    .forEach(([color, count]) => {
      console.log(`  ${count.toString().padStart(4)} ${color}`);
    });
  
  // Show top models with color data
  const modelsWithColors = Object.entries(modelColorCounts)
    .map(([model, colors]) => ({
      model,
      total: Object.values(colors).reduce((a, b) => a + b, 0),
      topColor: Object.entries(colors).sort(([,a], [,b]) => b - a)[0]
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  
  console.log('\nTop models with color data:');
  modelsWithColors.forEach(({ model, total, topColor }) => {
    console.log(`  ${model}: ${total} listings (most common: ${topColor[0]} with ${topColor[1]} listings)`);
  });
}

normalizeColors().catch(console.error);