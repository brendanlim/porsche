import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';

// Lazy initialization to ensure env vars are loaded
let openai: OpenAI | null = null;
let SYSTEM_PROMPT: string | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openai;
}

function getSystemPrompt(): string {
  if (!SYSTEM_PROMPT) {
    // Read the prompt from the markdown file
    const promptPath = join(process.cwd(), 'lib', 'prompts', 'options-prompt.md');
    SYSTEM_PROMPT = readFileSync(promptPath, 'utf-8');
  }
  return SYSTEM_PROMPT;
}

export async function normalizeOptions(rawOptionsText: string): Promise<string[]> {
  if (!rawOptionsText || rawOptionsText.trim() === '') {
    return [];
  }

  try {
    const systemPrompt = getSystemPrompt();

    // CRITICAL: Limit input to 500 chars to avoid high token costs
    // Never send full descriptions or long text blocks
    const truncatedText = rawOptionsText.length > 500
      ? rawOptionsText.substring(0, 500) + '...'
      : rawOptionsText;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Raw options text:\n${truncatedText}\n\nReturn ONLY a JSON array of normalized option names that match our database options exactly.` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    
    const text = completion.choices[0].message.content || '';
    
    // Extract JSON array from response
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        const options = JSON.parse(jsonMatch[0]);
        if (Array.isArray(options)) {
          return options.filter(opt => typeof opt === 'string' && opt.length > 0);
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response as JSON:', parseError);
      }
    }
    
    // Fallback: split by common delimiters if JSON parsing fails
    return text
      .split(/[,\n]/)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0 && !opt.includes('{') && !opt.includes('}'));
      
  } catch (error: any) {
    if (error.status === 429) {
      console.warn('OpenAI rate limit (429) for options. Using fallback parsing.');
    } else {
      console.error('OpenAI options normalization failed:', error.message || error);
    }
    // Fallback to basic parsing
    return rawOptionsText
      .split(/[,;]/)
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
  }
}

// Common Porsche option abbreviations for reference
export const OPTION_ABBREVIATIONS = {
  'PDK': 'Porsche Doppelkupplung (PDK)',
  'PCCB': 'Porsche Ceramic Composite Brakes',
  'PDCC': 'Porsche Dynamic Chassis Control',
  'PASM': 'Porsche Active Suspension Management',
  'PCM': 'Porsche Communication Management',
  'PSM': 'Porsche Stability Management',
  'PTV': 'Porsche Torque Vectoring',
  'LWBS': 'Lightweight Bucket Seats',
  'PTS': 'Paint to Sample',
  'PDLS': 'Porsche Dynamic Light System',
  'PSE': 'Porsche Sport Exhaust',
  'SPYDER': 'Spyder Classic Interior Package',
  'HGAS': 'Hydraulic Front Axle Lift System',
  'FVD': 'Factory Vehicle Delivery',
  'PPF': 'Paint Protection Film',
  'XPEL': 'XPEL Paint Protection',
};