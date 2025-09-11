import { supabaseAdmin } from '@/lib/supabase/admin'
import { Listing, IngestionRun } from '@/lib/types/database'
import { normalizeOptions } from '@/lib/services/options-normalizer'
import { normalizeModelTrim } from '@/lib/services/model-trim-normalizer'

export interface ScraperResult {
  vin?: string;
  title: string;
  price: number;
  mileage?: number;
  year?: number;
  model?: string;
  trim?: string;
  generation?: string;
  exterior_color?: string;
  interior_color?: string;
  transmission?: string;
  status?: string;
  location?: {
    city?: string;
    state?: string;
    zip?: string;
  };
  dealer_name?: string;
  is_dealer?: boolean;
  source_url: string;
  source_id?: string;
  sold_date?: Date;
  raw_data?: any;
  html?: string;
  options_text?: string;
  url?: string;  // Add this for backward compatibility
  images?: string[];
  source?: string;
  seller_type?: string;
  description?: string;
  scraped_at?: Date;
}

// Export ScrapedListing as alias for backward compatibility
export type ScrapedListing = ScraperResult;

export abstract class BaseScraper {
  protected source: string;
  protected ingestionRun?: IngestionRun;

  constructor(source: string) {
    this.source = source;
  }

  abstract scrapeListings(params?: any): Promise<ScraperResult[]>;
  abstract scrapeDetail(url: string): Promise<ScraperResult>;

  public async startIngestion(): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('ingestion_runs')
      .insert({
        source: this.source,
        status: 'running',
        total_fetched: 0,
        total_processed: 0,
        total_errors: 0
      })
      .select()
      .single();

    if (error) throw error;
    this.ingestionRun = data;
    return data.id;
  }

  public async updateIngestion(updates: Partial<IngestionRun>) {
    if (!this.ingestionRun) return;

    const { error } = await supabaseAdmin
      .from('ingestion_runs')
      .update(updates)
      .eq('id', this.ingestionRun.id);

    if (error) console.error('Failed to update ingestion run:', error);
  }

  public async completeIngestion(status: 'completed' | 'failed' = 'completed') {
    if (!this.ingestionRun) return;

    await this.updateIngestion({
      status,
      completed_at: new Date()
    });
  }

  public async saveListing(result: ScraperResult): Promise<string | null> {
    try {
      // Archive HTML if provided - DISABLED: Already stored via HTMLStorageService
      let htmlArchivePath: string | undefined;
      // if (result.html) {
      //   htmlArchivePath = await this.archiveHtml(result.source_url, result.html);
      // }

      // Normalize model/trim using Gemini
      let normalizedModel = result.model;
      let normalizedTrim = result.trim;
      let normalizedGeneration = result.generation;
      let extractedYear = result.year;
      
      try {
        const modelTrimResult = await normalizeModelTrim(result.title);
        if (modelTrimResult.model) {
          normalizedModel = modelTrimResult.model;
          normalizedTrim = modelTrimResult.trim;
          normalizedGeneration = modelTrimResult.generation || result.generation;
          extractedYear = modelTrimResult.year || result.year;
          console.log(`Normalized model/trim: ${normalizedModel} ${normalizedTrim || ''} (${normalizedGeneration || 'unknown gen'})`);
        }
      } catch (error) {
        console.error('Model/trim normalization failed:', error);
      }
      
      // Skip non-sports cars
      if (!normalizedModel || normalizedModel === null) {
        console.log(`Skipping non-sports car: ${result.title}`);
        return;
      }
      
      // Normalize options using Gemini if available
      let normalizedOptions: string[] = [];
      if (result.options_text) {
        try {
          normalizedOptions = await normalizeOptions(result.options_text);
          console.log(`Normalized ${normalizedOptions.length} options for ${result.title}`);
        } catch (error) {
          console.error('Options normalization failed:', error);
          // Fallback to basic parsing
          normalizedOptions = result.options_text
            .split(/[,;]/)
            .map(opt => opt.trim())
            .filter(opt => opt.length > 0);
        }
      }

      // Check if listing already exists
      let existingListing = null;
      if (result.vin) {
        const { data } = await supabaseAdmin
          .from('listings')
          .select('id, price')
          .eq('vin', result.vin)
          .single();
        existingListing = data;
      }

      // Prepare listing data
      const listingData: Partial<Listing> = {
        vin: result.vin,
        title: result.title,
        price: result.price,
        mileage: result.mileage,
        year: extractedYear,
        model: normalizedModel,
        trim: normalizedTrim,
        generation: normalizedGeneration,
        exterior_color: result.exterior_color,
        interior_color: result.interior_color,
        transmission: result.transmission,
        source: this.source as any,
        source_url: result.source_url,
        source_id: result.source_id,
        city: result.location?.city,
        state: result.location?.state,
        zip_code: result.location?.zip,
        dealer_name: result.dealer_name,
        is_dealer: result.is_dealer ?? true,
        raw_data: result.raw_data,
        html_archive_path: htmlArchivePath,
        status: result.sold_date ? 'sold' : 'active',
        sold_date: result.sold_date,
        sold_price: result.sold_date ? result.price : undefined,
        last_seen_at: new Date().toISOString() as any
      };

      let listingId: string;

      if (existingListing) {
        // Update existing listing
        const { data, error } = await supabaseAdmin
          .from('listings')
          .update(listingData)
          .eq('id', existingListing.id)
          .select()
          .single();

        if (error) throw error;
        listingId = data.id;

        // Track price history if price changed
        if (existingListing.price !== result.price) {
          await this.trackPriceHistory(listingId, result.vin, result.price);
        }
      } else {
        // Insert new listing
        const { data, error } = await supabaseAdmin
          .from('listings')
          .insert(listingData)
          .select()
          .single();

        if (error) throw error;
        listingId = data.id;

        // Track initial price
        await this.trackPriceHistory(listingId, result.vin, result.price);
      }

      return listingId;
    } catch (error) {
      console.error('Failed to save listing:', error);
      return null;
    }
  }

  protected async trackPriceHistory(listingId: string, vin: string | undefined, price: number) {
    await supabaseAdmin
      .from('price_history')
      .insert({
        listing_id: listingId,
        vin,
        price,
        source: this.source
      });
  }

  protected async archiveHtml(url: string, html: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const urlSlug = url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const path = `archives/${this.source}/${timestamp}_${urlSlug}.html`;

    const { error } = await supabaseAdmin.storage
      .from('html-archives')
      .upload(path, html, {
        contentType: 'text/html',
        cacheControl: '31536000' // 1 year
      });

    if (error) {
      console.error('Failed to archive HTML:', error);
      throw error;
    }

    return path;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}