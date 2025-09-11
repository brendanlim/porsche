#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

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

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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

async function normalizeWithGemini(description: string): Promise<string | null> {
  try {
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

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    
    const text = result.text.trim();
    
    // Clean up Gemini response
    if (text.toLowerCase() === 'null' || text === '') {
      return null;
    }
    
    // Remove quotes if present
    return text.replace(/^["']|["']$/g, '').trim();
  } catch (error: any) {
    if (error.status === 503 || error.message?.includes('overloaded')) {
      // Wait and retry once
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const result = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Extract the exterior color from: "${description}". Return ONLY the color name or NULL.`
        });
        const text = result.text.trim();
        return text.toLowerCase() === 'null' ? null : text.replace(/^["']|["']$/g, '').trim();
      } catch {
        return null;
      }
    }
    console.error('Gemini error:', error.message);
    return null;
  }
}

async function normalizeColors() {
  console.log('Fetching all listings with exterior colors...\n');
  
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
      // Couldn't normalize with simple rules - try Gemini
      needsGemini.push({
        id: listing.id,
        color: listing.exterior_color,
        model: listing.model,
        trim: listing.trim
      });
    }
  }
  
  // Second pass: use Gemini for difficult cases
  if (needsGemini.length > 0) {
    console.log(`\n🤖 Using Gemini to normalize ${needsGemini.length} complex color descriptions...`);
    
    for (let i = 0; i < needsGemini.length; i++) {
      const item = needsGemini[i];
      
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
      
      const geminiColor = await normalizeWithGemini(item.color);
      
      if (geminiColor && geminiColor !== item.color) {
        updates.push({
          id: item.id,
          old_color: item.color,
          new_color: geminiColor
        });
        console.log(`  ✅ "${item.color.substring(0, 50)}..." → "${geminiColor}"`);
      } else if (!geminiColor) {
        // Gemini couldn't extract a color either - set to null
        updates.push({
          id: item.id,
          old_color: item.color,
          new_color: null
        });
      }
      
      // Add delay every 5 requests to avoid overloading Gemini
      if ((i + 1) % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
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
  
  // Show final color distribution for 996 GT3s
  console.log('\n📊 Updated 996 GT3 color distribution:');
  const { data: updatedColors } = await supabase
    .from('listings')
    .select('exterior_color')
    .eq('model', '911')
    .eq('trim', 'GT3')
    .eq('generation', '996')
    .not('exterior_color', 'is', null);
  
  const colorCounts: Record<string, number> = {};
  updatedColors?.forEach(l => {
    colorCounts[l.exterior_color] = (colorCounts[l.exterior_color] || 0) + 1;
  });
  
  Object.entries(colorCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([color, count]) => {
      console.log(`  ${count.toString().padStart(3)} ${color}`);
    });
}

normalizeColors().catch(console.error);