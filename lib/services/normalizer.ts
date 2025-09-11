import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateVIN, validateModelYear, validatePrice, detectPaintToSample } from '@/lib/utils';

export interface NormalizationResult {
  model_id?: string;
  trim_id?: string;
  generation_id?: string;
  model_year_id?: string;
  exterior_color_id?: string;
  options: string[];
  validation_errors: string[];
}

export class DataNormalizer {
  private genAI: GoogleGenAI;

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  /**
   * Normalize listing data using Gemini AI
   */
  async normalizeListing(listing: {
    title: string;
    year?: number;
    price: number;
    mileage?: number;
    vin?: string;
    exterior_color?: string;
    options_text?: string;
    raw_data?: any;
  }): Promise<NormalizationResult> {
    const validation_errors: string[] = [];
    let result: NormalizationResult = {
      options: [],
      validation_errors
    };

    // Validate VIN if provided
    if (listing.vin && !validateVIN(listing.vin)) {
      validation_errors.push(`Invalid VIN format: ${listing.vin}`);
    }

    // Parse title to extract model, trim, and generation
    const parsedInfo = await this.parseWithGemini(listing);
    
    // Look up IDs from database
    if (parsedInfo.model) {
      result.model_id = await this.findModelId(parsedInfo.model);
    }

    if (parsedInfo.trim && result.model_id) {
      result.trim_id = await this.findTrimId(result.model_id, parsedInfo.trim, parsedInfo.generation);
      
      // Validate model year
      if (listing.year && parsedInfo.model && parsedInfo.trim) {
        if (!validateModelYear(parsedInfo.model, parsedInfo.trim, listing.year)) {
          validation_errors.push(`Invalid model year combination: ${listing.year} ${parsedInfo.model} ${parsedInfo.trim}`);
        }
      }

      // Validate price
      if (!validatePrice(listing.price, parsedInfo.trim)) {
        validation_errors.push(`Unrealistic price for ${parsedInfo.trim}: $${listing.price}`);
      }
    }

    if (parsedInfo.generation) {
      result.generation_id = await this.findGenerationId(result.model_id!, parsedInfo.generation);
    }

    // Find model year
    if (result.model_id && result.trim_id && listing.year) {
      result.model_year_id = await this.findModelYearId(result.model_id, result.trim_id, listing.year);
    }

    // Process color
    if (listing.exterior_color) {
      const { cleanName, isPTS } = detectPaintToSample(listing.exterior_color);
      result.exterior_color_id = await this.findOrCreateColor(cleanName, isPTS);
      
      if (isPTS) {
        result.options.push('Paint to Sample');
      }
    }

    // Extract and normalize options
    if (parsedInfo.options) {
      result.options = [...result.options, ...parsedInfo.options];
    }

    return result;
  }

  /**
   * Use Gemini to parse listing information
   */
  private async parseWithGemini(listing: any): Promise<{
    model?: string;
    trim?: string;
    generation?: string;
    options?: string[];
  }> {
    const prompt = `
      You are a Porsche vehicle expert and data normalization specialist. Analyze this listing and extract structured information.

      Listing Title: ${listing.title}
      Year: ${listing.year || 'Unknown'}
      Price: $${listing.price}
      Mileage: ${listing.mileage || 'Unknown'}
      Color: ${listing.exterior_color || 'Unknown'}
      Options Text: ${listing.options_text || 'None provided'}
      
      Extract and return ONLY a JSON object with these fields:
      - model: The Porsche model (e.g., "911", "718 Cayman", "718 Boxster", "Cayenne", "Macan", "Panamera", "Taycan")
      - trim: The specific trim (e.g., "GT3", "GT3 RS", "GT4 RS", "Turbo S", "Carrera", "GTS", "Base")
      - generation: The generation code if identifiable (e.g., "992.1", "992.2", "991.2", "982", "981")
      - options: Array of normalized option names found in the listing
      
      Important rules:
      1. For model, use exact names: "911", "718 Cayman", "718 Boxster" (not just "Cayman" or "Boxster")
      2. For trim, normalize variations (e.g., "GT3 Manthey" → "GT3", "GT4 RS Weissach" → "GT4 RS")
      3. Only include options that are actual factory options, not standard features
      4. Normalize option abbreviations (e.g., "PDK" → "Porsche Doppelkupplung (PDK)", "PCCB" → "Porsche Ceramic Composite Brakes (PCCB)")
      
      Return ONLY the JSON object, no other text.
    `;

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      const response = result.text;
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Gemini parsing failed:', error);
    }

    // Fallback to basic parsing
    return this.basicParse(listing);
  }

  /**
   * Basic parsing fallback when Gemini fails
   */
  private basicParse(listing: any): { model?: string; trim?: string; generation?: string; options?: string[] } {
    const title = listing.title.toLowerCase();
    let model: string | undefined;
    let trim: string | undefined;
    let generation: string | undefined;

    // Detect model
    if (title.includes('911')) model = '911';
    else if (title.includes('718') && title.includes('cayman')) model = '718 Cayman';
    else if (title.includes('718') && title.includes('boxster')) model = '718 Boxster';
    else if (title.includes('cayenne')) model = 'Cayenne';
    else if (title.includes('macan')) model = 'Macan';
    else if (title.includes('panamera')) model = 'Panamera';
    else if (title.includes('taycan')) model = 'Taycan';

    // Detect trim
    const trimPatterns = [
      { pattern: 'gt3 rs', trim: 'GT3 RS' },
      { pattern: 'gt3', trim: 'GT3' },
      { pattern: 'gt4 rs', trim: 'GT4 RS' },
      { pattern: 'gt4', trim: 'GT4' },
      { pattern: 'spyder rs', trim: 'Spyder RS' },
      { pattern: 'spyder', trim: 'Spyder' },
      { pattern: 'turbo s', trim: 'Turbo S' },
      { pattern: 'turbo', trim: 'Turbo' },
      { pattern: 'gts 4.0', trim: 'GTS 4.0' },
      { pattern: 'gts', trim: 'GTS' },
      { pattern: 'carrera gts', trim: 'Carrera GTS' },
      { pattern: 'carrera 4 gts', trim: 'Carrera 4 GTS' },
      { pattern: 'carrera 4s', trim: 'Carrera 4S' },
      { pattern: 'carrera s', trim: 'Carrera S' },
      { pattern: 'carrera', trim: 'Carrera' },
    ];

    for (const { pattern, trim: trimName } of trimPatterns) {
      if (title.includes(pattern)) {
        trim = trimName;
        break;
      }
    }

    // Detect generation
    if (listing.year) {
      if (model === '911') {
        if (listing.year >= 2024) generation = '992.2';
        else if (listing.year >= 2020) generation = '992.1';
        else if (listing.year >= 2016) generation = '991.2';
        else if (listing.year >= 2012) generation = '991.1';
        else if (listing.year >= 2005) generation = '997';
        else if (listing.year >= 1999) generation = '996';
        else if (listing.year >= 1995) generation = '993';
      } else if (model?.includes('718')) {
        if (listing.year >= 2020) generation = '982';
        else if (listing.year >= 2016) generation = '981';
      }
    }

    // Extract options from options_text
    const options: string[] = [];
    if (listing.options_text) {
      const optionKeywords = [
        'PCCB', 'Sport Chrono', 'PDCC', 'PASM', 'Sport Exhaust',
        'Carbon', 'Leather', 'Bose', 'Burmester', 'Weissach',
        'Lightweight', 'Bucket Seats', 'Matrix', 'Lift System'
      ];

      for (const keyword of optionKeywords) {
        if (listing.options_text.toLowerCase().includes(keyword.toLowerCase())) {
          options.push(keyword);
        }
      }
    }

    return { model, trim, generation, options };
  }

  private async findModelId(modelName: string): Promise<string | undefined> {
    const { data } = await supabaseAdmin
      .from('models')
      .select('id')
      .eq('name', modelName)
      .single();
    return data?.id;
  }

  private async findTrimId(modelId: string, trimName: string, generation?: string): Promise<string | undefined> {
    let query = supabaseAdmin
      .from('trims')
      .select('id')
      .eq('model_id', modelId)
      .eq('name', trimName);

    if (generation) {
      const genId = await this.findGenerationId(modelId, generation);
      if (genId) {
        query = query.eq('generation_id', genId);
      }
    }

    const { data } = await query.single();
    return data?.id;
  }

  private async findGenerationId(modelId: string, generationName: string): Promise<string | undefined> {
    const { data } = await supabaseAdmin
      .from('generations')
      .select('id')
      .eq('model_id', modelId)
      .eq('name', generationName)
      .single();
    return data?.id;
  }

  private async findModelYearId(modelId: string, trimId: string, year: number): Promise<string | undefined> {
    const { data } = await supabaseAdmin
      .from('model_years')
      .select('id')
      .eq('model_id', modelId)
      .eq('trim_id', trimId)
      .eq('year', year)
      .single();

    if (data) return data.id;

    // Create model year if it doesn't exist
    const { data: newData } = await supabaseAdmin
      .from('model_years')
      .insert({
        model_id: modelId,
        trim_id: trimId,
        year
      })
      .select()
      .single();

    return newData?.id;
  }

  private async findOrCreateColor(colorName: string, isPTS: boolean): Promise<string | undefined> {
    // Check if color exists
    const { data } = await supabaseAdmin
      .from('colors')
      .select('id')
      .eq('name', colorName)
      .single();

    if (data) return data.id;

    // Create new color
    const { data: newData } = await supabaseAdmin
      .from('colors')
      .insert({
        name: colorName,
        is_pts: isPTS
      })
      .select()
      .single();

    return newData?.id;
  }

  /**
   * Process and save normalized options for a listing
   */
  async saveOptions(listingId: string, options: string[]): Promise<void> {
    for (const optionName of options) {
      // Find or create option
      let optionId: string;
      
      const { data } = await supabaseAdmin
        .from('options')
        .select('id')
        .eq('name', optionName)
        .single();

      if (data) {
        optionId = data.id;
      } else {
        const { data: newOption } = await supabaseAdmin
          .from('options')
          .insert({ name: optionName })
          .select()
          .single();
        
        if (!newOption) continue;
        optionId = newOption.id;
      }

      // Link option to listing (upsert to handle duplicates)
      await supabaseAdmin
        .from('listing_options')
        .upsert({
          listing_id: listingId,
          option_id: optionId
        }, {
          onConflict: 'listing_id,option_id'
        });
    }
  }
}