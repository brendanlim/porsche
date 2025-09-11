import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SYSTEM_PROMPT = `You are a Porsche vehicle expert and a data normalization specialist. Your task is to extract key vehicle options from raw text and return them as a clean, structured JSON array. 

Rules:
1. Normalize common abbreviations (e.g., "PCCB" → "Porsche Ceramic Composite Brakes")
2. Keep paint colors separate from Paint-to-Sample notation
3. Include all genuine options but exclude basic components like "Limited-Slip Differential" (standard on GT3)
4. Exclude basic specifications like engine size or transmission type
5. Include upholstery and interior materials as options
6. Clean up redundant text (e.g., "20" & 21" Center-Lock Wheels" → "Center-Lock Wheels")

Example input from BaT:
"Limited-Slip Differential; Paint-To-Sample Mint Green Paint; Carbon-Fiber Roof; Black Leather & Race-Tex Upholstery; 20" & 21" Center-Lock Wheels; Porsche Ceramic Composite Brakes"

Example output:
["Paint to Sample - Mint Green", "Carbon Fiber Roof", "Black Leather/Race-Tex Interior", "Center-Lock Wheels", "Porsche Ceramic Composite Brakes (PCCB)"]`;

export async function normalizeOptions(rawOptionsText: string): Promise<string[]> {
  if (!rawOptionsText || rawOptionsText.trim() === '') {
    return [];
  }

  try {
    const prompt = `${SYSTEM_PROMPT}

Raw options text:
${rawOptionsText}

Return ONLY a JSON array of normalized option names. Example format:
["Porsche Ceramic Composite Brakes (PCCB)", "Sport Chrono Package", "Paint to Sample - Shark Blue"]`;

    const result = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt
    });
    const text = result.text;
    
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
      console.warn('Gemini rate limit (429) for options. Using fallback parsing.');
    } else {
      console.error('Gemini options normalization failed:', error.message || error);
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