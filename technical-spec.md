# PorscheStats Technical Specification

## Overview

PorscheStats is a comprehensive Porsche market analytics platform that provides real-time pricing insights, market trends, and AI-powered predictions for Porsche sports cars. The platform aggregates data from multiple marketplaces, normalizes it, and presents sophisticated analytics through a modern web interface.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer      │    │   LLM Services  │
│   (Next.js)     │◄──►│   (Next.js API)  │◄──►│   (OpenAI)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Analytics      │◄──►│   Database      │
                       │   Engine         │    │   (Supabase)    │
                       └──────────────────┘    └─────────────────┘
                                │
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Scrapers       │◄──►│   Storage       │
                       │   (Bright Data)  │    │   (Supabase)    │
                       └──────────────────┘    └─────────────────┘
```

## Database Schema

### Core Vehicle Tables

#### listings
Primary table containing all vehicle listings with comprehensive metadata:
- `id` (UUID): Unique identifier
- `source` (VARCHAR): Data source (bat, classic.com, etc.)
- `source_url` (TEXT): Original listing URL
- `vin` (VARCHAR): Vehicle Identification Number (17 chars, UNIQUE)
- `make` (VARCHAR): Always "Porsche"
- `model` (VARCHAR): Model name (911, 718, etc.)
- `trim` (VARCHAR): Trim level (GT3, GT4 RS, etc.)
- `generation` (VARCHAR): Generation code (991.2, 992.1, etc.)
- `year` (INTEGER): Model year
- `price` (INTEGER): Sale price including buyer fees
- `buyer_fee_amount` (INTEGER): Calculated buyer fee (BaT: 5% capped at $7500)
- `price_before_fee` (INTEGER): Original hammer price
- `buyer_fee_applied` (BOOLEAN): Whether fee has been applied
- `mileage` (INTEGER): Odometer reading
- `color` (VARCHAR): Exterior color
- `interior_color` (VARCHAR): Interior color
- `options_text` (TEXT): Raw options text
- `title` (TEXT): Listing title
- `description` (TEXT): Full listing description
- `images` (TEXT[]): Array of image URLs
- `list_date` (DATE): When listing was created
- `sold_date` (DATE): When vehicle sold
- `scraped_at` (TIMESTAMP): When data was collected
- `created_at` (TIMESTAMP): Database insertion time
- `updated_at` (TIMESTAMP): Last modification time
- Various metadata fields (zip_code, location, seller_type, etc.)

**Indexes:**
- `idx_listings_model_trim_year` on (model, trim, year)
- `idx_listings_sold_date` on (sold_date)
- `idx_listings_vin` on (vin)
- `idx_listings_source_url` on (source_url)

### Vehicle Taxonomy Tables

#### manufacturers
- `id` (SERIAL): Primary key
- `name` (VARCHAR): Always "Porsche"

#### models
- `id` (SERIAL): Primary key
- `manufacturer_id` (INTEGER): FK to manufacturers
- `name` (VARCHAR): Model name (911, 718, Boxster, Cayman)
- `type` (VARCHAR): Vehicle type (sports_car)

#### generations
- `id` (SERIAL): Primary key
- `model_id` (INTEGER): FK to models
- `name` (VARCHAR): Generation code (991, 992, 981, 982, 718)
- `start_year` (INTEGER): First model year
- `end_year` (INTEGER): Last model year

#### trims
- `id` (SERIAL): Primary key
- `model_id` (INTEGER): FK to models
- `name` (VARCHAR): Trim name (GT3, GT4, GT4 RS, Turbo, etc.)
- `generation_id` (INTEGER): FK to generations

#### model_years
- `id` (SERIAL): Primary key
- `model_id` (INTEGER): FK to models
- `generation_id` (INTEGER): FK to generations
- `trim_id` (INTEGER): FK to trims
- `year` (INTEGER): Model year

### Options & Features Tables

#### options
Predefined list of 31 factory options:
- `id` (SERIAL): Primary key
- `option_code` (VARCHAR): Factory option code
- `name` (VARCHAR): Option name
- `description` (TEXT): Detailed description
- `category` (VARCHAR): Category (performance, comfort, etc.)

#### listing_options
Many-to-many relationship between listings and options:
- `listing_id` (UUID): FK to listings
- `option_id` (INTEGER): FK to options

### User Management Tables

#### profiles
User profiles with preferences:
- `id` (UUID): Primary key
- `email` (VARCHAR): User email (UNIQUE)
- `full_name` (VARCHAR): Display name
- `subscription_tier` (VARCHAR): free, premium, pro
- `created_at` (TIMESTAMP): Registration date

#### watched_vins
User's watched vehicles:
- `id` (UUID): Primary key
- `user_id` (UUID): FK to profiles
- `vin` (VARCHAR): Vehicle VIN
- `alert_price` (INTEGER): Price alert threshold
- `created_at` (TIMESTAMP): When added

#### saved_searches
User's saved search criteria:
- `id` (UUID): Primary key
- `user_id` (UUID): FK to profiles
- `search_criteria` (JSONB): Search parameters
- `alert_enabled` (BOOLEAN): Email alerts active

### Analytics & AI Tables

#### market_insights
AI-generated market analysis:
- `id` (UUID): Primary key
- `insight_type` (VARCHAR): price_prediction, market_summary, anomaly_detection
- `model` (VARCHAR): Vehicle model
- `trim` (VARCHAR): Vehicle trim
- `generation` (VARCHAR): Generation code
- `analysis_date` (DATE): When analysis was performed
- `prediction_horizon_days` (INTEGER): Forecast period
- `llm_provider` (VARCHAR): openai
- `llm_model` (VARCHAR): gpt-4-turbo-preview
- `prompt_version` (VARCHAR): Version tracking
- `insight_title` (VARCHAR): Human-readable title
- `insight_summary` (TEXT): Executive summary
- `detailed_analysis` (JSONB): Full analysis data
- `confidence_score` (DECIMAL): 0.00 to 1.00
- `data_points_analyzed` (INTEGER): Number of listings analyzed
- `processing_time_ms` (INTEGER): Processing duration
- `cost_usd` (DECIMAL): LLM API cost
- `validated_at` (TIMESTAMP): When validated against actuals
- `accuracy_score` (DECIMAL): Post-validation accuracy

#### chart_predictions
Predictions for chart visualizations:
- `id` (UUID): Primary key
- `chart_type` (VARCHAR): Chart identifier
- `model` (VARCHAR): Vehicle model
- `trim` (VARCHAR): Vehicle trim
- `prediction_date` (DATE): When predicted
- `target_date` (DATE): Prediction target
- `predicted_value` (DECIMAL): Predicted metric
- `confidence_lower` (DECIMAL): Lower confidence bound
- `confidence_upper` (DECIMAL): Upper confidence bound
- `confidence_score` (DECIMAL): Overall confidence

### Scraping Infrastructure Tables

#### scrape_queue
Queue for pending scrape jobs:
- `id` (UUID): Primary key
- `source` (VARCHAR): Target marketplace
- `model` (VARCHAR): Model to scrape
- `trim` (VARCHAR): Specific trim
- `status` (VARCHAR): pending, processing, completed, failed
- `priority` (INTEGER): Execution priority
- `attempts` (INTEGER): Retry count
- `last_attempt` (TIMESTAMP): Last try time
- `error_message` (TEXT): Failure details

#### ingestion_runs
Track scraping execution history:
- `id` (UUID): Primary key
- `source` (VARCHAR): Marketplace source
- `status` (VARCHAR): Execution status
- `listings_found` (INTEGER): Total found
- `listings_saved` (INTEGER): Successfully saved
- `started_at` (TIMESTAMP): Start time
- `completed_at` (TIMESTAMP): End time
- `error_details` (JSONB): Error information

## API Endpoints

### Analytics Endpoints

#### GET /api/analytics/dashboard
Returns comprehensive dashboard data:
```typescript
{
  kpis: {
    totalListings: number,
    avgPrice: number,
    medianPrice: number,
    totalVolume: number,
    priceChange30d: number,
    volumeChange30d: number
  },
  recentSales: Listing[],
  topModels: { model: string, count: number, avgPrice: number }[],
  topTrims: { trim: string, count: number, avgPrice: number }[]
}
```

#### GET /api/analytics/[model]
Model-specific analytics with time range support:
- Query params: `timeRange` (7d, 30d, 90d, 1y, all)
- Returns: Model-specific KPIs, price trends, volume analysis

#### GET /api/analytics/[model]/[trim]
Trim-specific deep analytics:
- Detailed pricing by generation
- Options impact analysis
- Depreciation curves
- Market positioning

### Market Data Endpoints

#### GET /api/market-insights
AI-generated market insights:
```typescript
{
  insights: MarketInsight[],
  lastUpdated: Date,
  nextUpdate: Date
}
```

#### GET /api/predictions
Chart predictions and forecasts:
- Query params: `chartType`, `model`, `trim`, `horizon`
- Returns: Predicted values with confidence intervals

#### GET /api/market-data
Raw market data for charts:
- Query params: `model`, `trim`, `startDate`, `endDate`
- Returns: Time-series data for visualization

### User Management Endpoints

#### GET/POST /api/user-cars
Manage user's garage:
- Add vehicles by VIN
- Track ownership history
- Set valuation alerts

#### GET/POST /api/alerts
Price alert management:
- Create alerts for specific criteria
- Update alert thresholds
- View alert history

## Frontend Architecture

### Pages Structure

#### / (Homepage)
- Market overview with key statistics
- Trending models and recent sales
- Quick search functionality

#### /insights
**Main analytics dashboard** featuring:
- `MetricsDashboard`: KPI cards with trend indicators
- `TimeRangeSelector`: 7d, 30d, 90d, 1y, all time filtering
- Chart components:
  - `ModelComparisonChart`: Sales volume and price comparison
  - `PriceVsMileageScatter`: Depreciation analysis
  - `VolumeAnalysisChart`: Sales trends over time
  - `PriceDistributionChart`: Market segmentation
  - `MarketTrendsChart`: Long-term market movements
- Real-time data refresh
- Export capabilities

#### /models/[model]/analytics
Model-specific analytics page:
- Generation comparison
- Trim performance matrix
- Historical price evolution
- Volume trends by trim

#### /models/[model]/[trim]/analytics
Trim-specific deep dive:
- Pricing by options configuration
- Depreciation curves by mileage
- Market positioning analysis
- Investment recommendations

### Component Architecture

#### Core Components
- `Header`: Global navigation with search
- `Footer`: Site information and links
- `MetricsCard`: Reusable KPI display component
- `ChartContainer`: Responsive chart wrapper
- `DataTable`: Sortable, filterable data tables
- `LoadingSkeletons`: Loading states

#### Analytics Components
- `DashboardGrid`: Responsive grid layout system
- `TimeRangeSelector`: Date range picker
- `ModelSelector`: Model/trim selection UI
- `ChartExporter`: Export charts as images/CSV
- `InsightCard`: AI insight display

## Scraping Infrastructure

### Multi-Source Scraping System

#### Supported Sources
1. **Bring a Trailer (BaT)**: Primary auction site
2. **Classic.com**: Classic and collectible market
3. **Cars.com**: Dealer and private listings
4. **Edmunds**: Dealer inventory
5. **Cars and Bids**: Modern enthusiast auctions
6. **Autotrader**: Broad market coverage
7. **CarGurus**: Price analysis focus

#### Base Scraper Architecture
```typescript
abstract class BaseScraper {
  abstract scrapeSearchResults(model: string, trim?: string): Promise<SearchResult[]>
  abstract scrapeDetailPage(url: string): Promise<ListingDetails>
  abstract parseStoredHtml(html: string, type: 'search' | 'detail'): any

  protected normalizePrice(price: number, source: string): number
  protected extractVin(html: string): string | null
  protected normalizeOptions(optionsText: string): string[]
}
```

#### Scraping Workflow
1. **Queue Management**: Jobs added to scrape_queue
2. **Search Scraping**: Fetch search results pages
3. **Detail Extraction**: Fetch individual listing pages
4. **VIN Extraction**: Extract and validate VINs
5. **Data Normalization**: Standardize across sources
6. **Database Storage**: Upsert with duplicate handling
7. **HTML Archival**: Store in Supabase Storage

#### Special Handling

##### Bring a Trailer
- Uses Bright Data Scraping Browser for dynamic content
- Handles "Show More" button pagination
- Applies 5% buyer fee (capped at $7,500)
- Extracts from both embedded JSON and DOM

##### Storage Organization
- Bucket: `raw-html`
- Path: `source/yyyymmdd/model/trim/type/filename.html`
- Example: `bat/20250906/718-cayman/gt4/detail/listing_123.html`

## AI/LLM Integration

### LLM Predictor System

#### Core Capabilities
```typescript
class LLMPredictor {
  async predictPrices(request: PredictionRequest): Promise<PricePrediction>
  async detectAnomalies(listings: Listing[]): Promise<Anomaly[]>
  async generateMarketInsights(data: MarketData): Promise<MarketInsight>
  async validatePrediction(predictionId: string): Promise<ValidationResult>
}
```

#### Features
- **Price Predictions**: 1m, 3m, 6m, 1y horizons
- **Anomaly Detection**: Identify under/overvalued listings
- **Market Insights**: Trend analysis and recommendations
- **Confidence Scoring**: Statistical confidence levels
- **Cost Tracking**: Monitor API usage and costs
- **Result Caching**: Reduce API calls with intelligent caching

#### Prompt Management
- Version-controlled prompts
- A/B testing capability
- Performance tracking
- Cost optimization

### Caching Strategy

#### Cache Layers
- **Short-term** (1 hour): Real-time anomalies
- **Medium-term** (6 hours): Price predictions
- **Long-term** (24 hours): Market summaries
- **Persistent** (1 week): Historical analysis

## Background Jobs

### Scheduled Tasks

#### Daily Jobs
- Market insight generation
- Anomaly detection
- Price validation
- Data quality checks

#### Weekly Jobs
- Deep market analysis
- Cross-market correlation
- Investment recommendations
- Performance reports

### Queue Processing
- Priority-based execution
- Retry logic with exponential backoff
- Error tracking and alerting
- Progress monitoring

## Performance Optimizations

### Database Optimizations
- Strategic indexes on frequently queried columns
- Materialized views for complex aggregations
- Partition strategies for large tables
- Connection pooling

### Frontend Optimizations
- React Query for data caching
- Lazy loading for charts
- Image optimization with Next.js
- Bundle splitting

### API Optimizations
- Response caching with proper TTLs
- Batch operations where possible
- Pagination for large datasets
- Compression for responses

## Security & Compliance

### Security Measures
- Row Level Security (RLS) in database
- API key rotation
- Rate limiting
- Input validation
- XSS protection

### Data Privacy
- No PII in LLM requests
- Encrypted sensitive data
- GDPR compliance ready
- Data retention policies

### Financial Disclaimers
- Not financial advice warnings
- Historical performance notices
- Risk disclosure statements
- Terms of service compliance

## Monitoring & Observability

### Key Metrics
- API response times
- Scraping success rates
- LLM cost per request
- Cache hit rates
- User engagement metrics

### Error Tracking
- Sentry integration for error monitoring
- Custom error boundaries
- Detailed error logging
- Alert thresholds

### Analytics
- User behavior tracking
- Feature adoption rates
- Performance metrics
- Cost analysis dashboards

## Development Practices

### Code Organization
```
/app                 - Next.js app directory
  /api              - API routes
  /insights         - Analytics dashboard
  /models          - Model pages
/components         - React components
  /insights        - Analytics components
  /ui              - Base UI components
/lib               - Core libraries
  /analytics       - Analytics engine
  /scrapers        - Scraper implementations
  /utils           - Utility functions
/scripts           - Automation scripts
  /scraping        - Data collection
  /data-processing - Data transformation
  /maintenance     - Cleanup tasks
/supabase          - Database configuration
  /migrations      - Schema migrations
```

### Testing Strategy
- Unit tests for core logic
- Integration tests for API endpoints
- E2E tests for critical paths
- Performance benchmarking

### Deployment
- Vercel for frontend hosting
- Supabase for database and storage
- GitHub Actions for CI/CD
- Environment-based configuration

## Current Implementation Status

### ✅ Fully Implemented
- Complete database schema with all tables
- Multi-source scraping infrastructure
- Advanced analytics dashboard
- AI-powered insights and predictions
- User management system
- Professional UI/UX with charts
- Background job processing
- Cost-optimized LLM integration

### 🔄 In Progress
- Mobile app development
- Advanced ML models
- Email notification system
- Payment integration

### 📋 Planned
- API monetization
- White-label solutions
- Advanced export features
- Multi-language support

## Success Metrics

### Technical Metrics
- 99.5% uptime
- <5 second page loads
- <10% prediction error rate
- <$1000/month LLM costs

### Business Metrics
- 6,000+ active listings
- 25% premium conversion
- 50% monthly active users
- 90% user satisfaction

---

*Last Updated: January 2025*
*Version: 1.0.0*