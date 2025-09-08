import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are a Porsche vehicle expert and a data normalization specialist. Your task is to extract key vehicle options from raw text and return them as a clean, structured JSON array. Normalize common abbreviations. For example, "PDK" becomes "Porsche Doppelkupplung (PDK)", "LWBS" becomes "Lightweight Bucket Seats", and "PCCB" becomes "Porsche Ceramic Composite Brakes". Only include options, not standard features or descriptive sentences. If a color is "Paint to Sample", identify the specific color if mentioned.`;

export async function normalizeOptions(rawOptionsText: string): Promise<string[]> {
  if (!rawOptionsText || rawOptionsText.trim() === '') {
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `${SYSTEM_PROMPT}

Raw options text:
${rawOptionsText}

Return ONLY a JSON array of normalized option names. Example format:
["Porsche Ceramic Composite Brakes (PCCB)", "Sport Chrono Package", "Paint to Sample - Shark Blue"]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
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
      
  } catch (error) {
    console.error('Gemini options normalization failed:', error);
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