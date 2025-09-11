import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Gemini with Google Cloud API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Load prompt from file
let SYSTEM_PROMPT: string;
try {
  SYSTEM_PROMPT = readFileSync(join(process.cwd(), 'lib/prompts/model-trim-prompt.md'), 'utf-8');
} catch (error) {
  console.warn('Could not load model-trim prompt file, using inline prompt');
  SYSTEM_PROMPT = `You are a Porsche vehicle expert. Extract model and trim from vehicle titles.
NEVER return Cayenne, Macan, Panamera, or Taycan - sports cars only!
Return JSON: {"model": "string or null", "trim": "string or null", "generation": "string or null", "year": number or null}`;
}

export interface ModelTrimResult {
  model: string | null;
  trim: string | null;
  generation: string | null;
  year: number | null;
}

/**
 * Normalize model and trim from a vehicle title using Gemini AI
 */
export async function normalizeModelTrim(title: string): Promise<ModelTrimResult> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Gemini API key not set, using fallback parsing');
      return fallbackParsing(title);
    }

    // Use gemini-1.5-flash which has better availability
    let model;
    let result;
    
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `${SYSTEM_PROMPT}\n\nExtract model and trim from this title:\n"${title}"`;
      
      // Retry logic for overload errors
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          result = await model.generateContent(prompt);
          break; // Success, exit loop
        } catch (error: any) {
          lastError = error;
          
          if (error.status === 429) {
            // Rate limit, not quota - show the actual error
            console.warn(`Gemini rate limit (429) for "${title}". Error:`, error.message);
            return fallbackParsing(title);
          } else if (error.status === 503 || error.message?.includes('overloaded')) {
            // Model overloaded, retry with exponential backoff
            retries--;
            if (retries > 0) {
              const delay = (3 - retries) * 2000; // 2s, 4s, 6s
              console.log(`Gemini overloaded, retrying in ${delay/1000}s... (${retries} retries left)`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.warn('Gemini overloaded after retries, using fallback parsing for:', title);
              return fallbackParsing(title);
            }
          } else {
            throw error;
          }
        }
      }
      
      if (!result && lastError) {
        throw lastError;
      }
    } catch (error: any) {
      console.warn('Gemini error, using fallback parsing:', error.message);
      return fallbackParsing(title);
    }
    
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    try {
      // Extract JSON from response (sometimes Gemini adds extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          model: parsed.model || null,
          trim: parsed.trim || null,
          generation: parsed.generation || null,
          year: parsed.year || null
        };
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
    }
    
    // Fall back to basic parsing if Gemini fails
    return fallbackParsing(title);
    
  } catch (error) {
    console.error('Gemini model/trim normalization failed:', error);
    return fallbackParsing(title);
  }
}

/**
 * Fallback parsing when Gemini is not available
 */
function fallbackParsing(title: string): ModelTrimResult {
  let model: string | null = null;
  let trim: string | null = null;
  let generation: string | null = null;
  let year: number | null = null;
  
  // Extract year
  const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  }
  
  // Extract model
  if (title.includes('911')) {
    model = '911';
  } else if (title.includes('Cayman')) {
    model = '718 Cayman';
  } else if (title.includes('Boxster')) {
    model = '718 Boxster';
  } else if (title.includes('Spyder')) {
    model = '718 Spyder';
  }
  
  // Extract trim - check for specific trims in order of specificity
  const trimPatterns = [
    { pattern: /GT3[\s-]?RS/i, trim: 'GT3 RS' },
    { pattern: /GT2[\s-]?RS/i, trim: 'GT2 RS' },
    { pattern: /GT4[\s-]?RS/i, trim: 'GT4 RS' },
    { pattern: /Spyder[\s-]?RS/i, trim: 'Spyder RS' },
    { pattern: /GT3/i, trim: 'GT3' },
    { pattern: /GT2/i, trim: 'GT2' },
    { pattern: /GT4/i, trim: 'GT4' },
    { pattern: /Turbo[\s-]?S/i, trim: 'Turbo S' },
    { pattern: /Turbo/i, trim: 'Turbo' },
    { pattern: /Carrera[\s-]?4S/i, trim: 'Carrera 4S' },
    { pattern: /Carrera[\s-]?S/i, trim: 'Carrera S' },
    { pattern: /Carrera[\s-]?4/i, trim: 'Carrera 4' },
    { pattern: /Carrera/i, trim: 'Carrera' },
    { pattern: /GTS[\s-]?4\.0/i, trim: 'GTS 4.0' },
    { pattern: /GTS/i, trim: 'GTS' },
    { pattern: /Targa/i, trim: 'Targa' },
    { pattern: /S\/T/i, trim: 'S/T' },
    { pattern: /Sport[\s-]?Classic/i, trim: 'Sport Classic' },
    { pattern: /Speedster/i, trim: 'Speedster' },
    { pattern: /Spyder/i, trim: 'Spyder' },
    { pattern: /\bS\b/i, trim: 'S' },
    { pattern: /\bR\b/i, trim: 'R' }
  ];
  
  for (const { pattern, trim: trimName } of trimPatterns) {
    if (pattern.test(title)) {
      trim = trimName;
      break;
    }
  }
  
  // Extract generation
  const genPatterns = ['992.2', '992.1', '992', '991.2', '991.1', '991', '997.2', '997.1', '997', '996', '982', '981', '987.2', '987.1', '986'];
  for (const gen of genPatterns) {
    if (title.includes(gen)) {
      generation = gen;
      break;
    }
  }
  
  // Infer generation from year if not found
  if (!generation && year && model) {
    if (model === '911') {
      if (year >= 2024) generation = '992.2';
      else if (year >= 2019) generation = '992.1';
      else if (year >= 2016) generation = '991.2';
      else if (year >= 2012) generation = '991.1';
      else if (year >= 2009) generation = '997.2';
      else if (year >= 2005) generation = '997.1';
      else if (year >= 1999) generation = '996';
    } else if (model.includes('718') || model.includes('Cayman') || model.includes('Boxster')) {
      if (year >= 2016) generation = '982';
      else if (year >= 2013) generation = '981';
      else if (year >= 2009) generation = '987.2';
      else if (year >= 2005) generation = '987.1';
      else if (year >= 1997) generation = '986';
    }
  }
  
  // Skip SUVs and sedans
  if (title.includes('Cayenne') || title.includes('Macan') || 
      title.includes('Panamera') || title.includes('Taycan')) {
    return { model: null, trim: null, generation: null, year: null };
  }
  
  return { model, trim, generation, year };
}