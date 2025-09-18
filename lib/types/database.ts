export interface Manufacturer {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface Model {
  id: string;
  manufacturer_id: string;
  name: string;
  model_type?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Generation {
  id: string;
  model_id: string;
  name: string;
  start_year?: number;
  end_year?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Trim {
  id: string;
  model_id: string;
  generation_id?: string;
  name: string;
  is_high_performance: boolean;
  min_realistic_price?: number;
  created_at: Date;
  updated_at: Date;
}

export interface ModelYear {
  id: string;
  model_id: string;
  trim_id: string;
  generation_id?: string;
  year: number;
  msrp?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Color {
  id: string;
  name: string;
  is_pts: boolean;
  hex_code?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Option {
  id: string;
  name: string;
  category?: string;
  typical_price?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Listing {
  id: string;
  vin?: string;
  year?: number;
  model?: string;
  trim?: string;
  generation?: string;
  model_year_id?: string;
  trim_id?: string;
  generation_id?: string;
  
  // Listing details
  title?: string;
  price: number;
  mileage?: number;
  exterior_color?: string;
  exterior_color_id?: string;
  interior_color?: string;
  transmission?: string;
  options_text?: string;
  location?: string;
  dealer?: string;
  
  // Source information
  source: 'bat' | 'cars' | 'cargurus' | 'edmunds' | 'autotrader';
  source_url?: string;
  source_id?: string;
  
  // Location
  city?: string;
  state?: string;
  zip_code?: string;
  dealer_name?: string;
  is_dealer: boolean;
  
  // Status
  status: 'active' | 'sold' | 'removed' | 'expired';
  sold_date?: Date;
  sold_price?: number;
  
  // Metadata
  first_seen_at: Date;
  last_seen_at: Date;
  removed_at?: Date;
  scraped_at?: Date;
  created_at: Date;
  updated_at: Date;
  
  // Raw data
  raw_data?: any;
  html_archive_path?: string;
  
  // Processed flags
  is_normalized: boolean;
  normalized_at?: Date;
  
  // Validation
  is_valid: boolean;
  validation_errors?: any;
}

export interface ListingWithDetails extends Omit<Listing, 'model' | 'trim' | 'generation' | 'exterior_color'> {
  model?: Model;
  trim?: Trim;
  generation?: Generation;
  model_year?: ModelYear;
  exterior_color?: Color;
  options?: Option[];
}

export interface PriceHistory {
  id: string;
  listing_id: string;
  vin?: string;
  price: number;
  observed_at: Date;
  source?: string;
  created_at: Date;
}

export interface IngestionRun {
  id: string;
  source: string;
  started_at: Date;
  completed_at?: Date;
  status: 'running' | 'completed' | 'failed';
  total_fetched: number;
  total_processed: number;
  total_saved?: number;
  total_errors: number;
  error_message?: string;
  error_details?: any;
  created_at: Date;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  subscription_status: 'free' | 'premium' | 'cancelled';
  subscription_id?: string;
  subscription_ends_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: SearchFilters;
  alert_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WatchedVin {
  id: string;
  user_id: string;
  vin: string;
  notes?: string;
  alert_on_price_drop: boolean;
  created_at: Date;
}

export interface SearchFilters {
  model_id?: string;
  trim_id?: string;
  generation_id?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  mileage_max?: number;
  states?: string[];
  colors?: string[];
  options?: string[];
  transmission?: string;
  is_dealer?: boolean;
}

export interface MarketStats {
  model_id: string;
  trim_id?: string;
  year?: number;
  listing_count: number;
  avg_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  avg_mileage: number;
  calculated_date: Date;
}

export interface ChartDataPoint {
  x: number; // mileage
  y: number; // price
  vin?: string;
  title?: string;
  color?: string;
  source?: string;
  url?: string;
}

// User car management types
export interface UserCar {
  id: string;
  user_id: string;
  vin?: string;
  year?: number;
  model_id?: string;
  trim_id?: string;
  generation_id?: string;
  exterior_color_id?: string;
  interior_color?: string;
  mileage?: number;
  purchase_date?: Date;
  purchase_price?: number;
  purchase_notes?: string;
  last_estimated_value?: number;
  last_valuation_date?: Date;
  nickname?: string;
  is_for_sale: boolean;
  asking_price?: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserCarDetailed extends UserCar {
  model_name?: string;
  trim_name?: string;
  generation_name?: string;
  exterior_color_name?: string;
  exterior_color_hex?: string;
  is_paint_to_sample?: boolean;
  latest_estimated_value?: number;
  options_count?: number;
  similar_active_listings?: number;
  recent_sold_avg_price?: number;
  options?: Option[];
}

export interface UserCarValuation {
  id: string;
  user_car_id: string;
  estimated_value: number;
  confidence_score?: number;
  valuation_method: 'market_analysis' | 'manual' | 'ml_prediction';
  market_data_used?: any;
  created_at: Date;
}

export interface MarketAlert {
  id: string;
  user_id: string;
  model_id?: string;
  trim_id?: string;
  generation_id?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  mileage_max?: number;
  states?: string[];
  required_options?: string[];
  alert_name: string;
  is_active: boolean;
  notify_email: boolean;
  notify_frequency: 'immediate' | 'daily' | 'weekly';
  created_at: Date;
  updated_at: Date;
  last_triggered_at?: Date;
}

export interface AlertMatch {
  id: string;
  alert_id: string;
  listing_id: string;
  matched_at: Date;
  notified_at?: Date;
}