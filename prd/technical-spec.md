# PorscheStats Technical Specification

## Architecture Overview

### System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  Data Sources   │────▶│  Data Pipeline   │────▶│    Database     │
│  (Websites)     │     │  (Scrapers)      │     │   (Supabase)    │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │                  │     │                 │
                        │  Normalization   │     │   Analytics     │
                        │   (Gemini AI)    │     │     Engine      │
                        │                  │     │                 │
                        └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │                 │
                                                  │   Web App       │
                                                  │   (Next.js)     │
                                                  │                 │
                                                  └─────────────────┘
```

## Data Pipeline Implementation

### 1. Scraping Infrastructure

#### Bright Data Configuration
```typescript
const BRIGHT_DATA_CONFIG = {
  zone: 'pt_scraping_browser_z1',
  country: 'us',
  proxy: {
    type: 'datacenter',
    rotation: 'automatic'
  },
  browser: {
    type: 'chromium',
    headless: false,  // Required for dynamic content
    viewport: { width: 1920, height: 1080 }
  }
};
```

#### Scraper Base Class
```typescript
abstract class BaseScraper {
  protected source: string;
  protected storage: HTMLStorageService;
  
  abstract scrapeListings(params: ScraperParams): Promise<Listing[]>;
  abstract parseDetailPage(html: string): Listing;
  
  protected async saveToDB(listings: Listing[]): Promise<void> {
    // CRITICAL: Must actually save to database!
    return supabaseAdmin.from('listings').upsert(listings);
  }
}
```

### 2. Data Sources & Scrapers

#### Bring a Trailer (BaT)
- **Frequency**: Every 4 hours
- **Volume**: ~200-500 new listings/day
- **Special Handling**: 
  - Apply 5% buyer fee (max $7,500) to all prices
  - Click "Show More" button repeatedly for pagination
  - Extract from both embedded JSON and DOM

#### Cars.com
- **Frequency**: Hourly for price changes
- **Volume**: ~5,000 active Porsche listings
- **Special Handling**:
  - Filter to sports cars only (911, 718, Boxster, Cayman)
  - Exclude dealers with manipulated prices

#### Classic.com
- **Frequency**: Weekly historical sync
- **Volume**: ~10,000 historical transactions
- **Special Handling**:
  - Bulk CSV export when available
  - Cross-reference VINs for accuracy

### 3. Data Normalization

#### Options Normalization with Gemini
```typescript
const GEMINI_PROMPT = `
Extract and normalize Porsche options from this text.
Map variations to standard names:
- "PDK", "Porsche Doppelkupplung" → "PDK Transmission"
- "PCCB", "Ceramic Brakes" → "Porsche Ceramic Composite Brakes"
- "PTS", "Paint to Sample" → "Paint to Sample"

Return JSON array of normalized option names only.
Text: {options_text}
`;
```

#### Color Standardization
```typescript
const COLOR_MAPPINGS = {
  // Blacks
  'jet black': 'Black',
  'basalt black': 'Black',
  'black metallic': 'Black',
  
  // Whites  
  'carrara white': 'White',
  'white metallic': 'White',
  
  // Special Porsche Colors
  'guards red': 'Guards Red',
  'racing yellow': 'Racing Yellow',
  'miami blue': 'Miami Blue',
  'gt silver': 'GT Silver Metallic'
};
```

### 4. Database Design

#### Optimized Indexes
```sql
-- Critical for performance
CREATE INDEX idx_listings_model_trim ON listings(model, trim);
CREATE INDEX idx_listings_sold_date ON listings(sold_date);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_vin ON listings(vin);
CREATE INDEX idx_listings_source_url ON listings(source_url);

-- For analytics queries
CREATE INDEX idx_listings_analytics ON listings(
  model, trim, generation, sold_date, price
) WHERE sold_date IS NOT NULL;
```

#### Materialized Views for Performance
```sql
CREATE MATERIALIZED VIEW mv_model_analytics AS
SELECT 
  model,
  trim,
  generation,
  DATE_TRUNC('month', sold_date) as month,
  COUNT(*) as sales_count,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price,
  AVG(price) as avg_price,
  AVG(mileage) as avg_mileage
FROM listings
WHERE sold_date IS NOT NULL
GROUP BY model, trim, generation, month;

-- Refresh daily
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('refresh-analytics', '0 2 * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_model_analytics');
```

## API Design

### RESTful Endpoints

#### Analytics API
```typescript
GET /api/analytics/{model}/{trim}
Query Parameters:
  - range: 7d | 30d | 90d | 1y | 2y | 3y | all
  - generation: string (e.g., "991.2", "992.1")
  
Response:
{
  totalListings: number,
  medianPrice: number,
  averagePrice: number,
  priceRange: { min: number, max: number },
  seasonalityAnalysis: Array<SeasonData>,
  optionsAnalysis: Array<OptionValue>,
  colorPremiums: Array<ColorPremium>,
  generationComparison: Array<GenerationData>,
  salesData: Array<SalePoint>
}
```

#### Search API
```typescript
POST /api/search
Body:
{
  models: string[],
  trims: string[],
  minPrice: number,
  maxPrice: number,
  maxMileage: number,
  options: string[],
  colors: string[]
}

Response:
{
  results: Listing[],
  aggregations: {
    totalCount: number,
    priceDistribution: Histogram,
    mileageDistribution: Histogram
  }
}
```

### GraphQL Schema (Future)
```graphql
type Listing {
  id: ID!
  vin: String!
  model: Model!
  trim: Trim!
  year: Int!
  mileage: Int!
  price: Int!
  soldDate: Date
  options: [Option!]!
  color: Color!
  images: [Image!]!
}

type Query {
  listing(vin: String!): Listing
  listings(filter: ListingFilter!): ListingConnection!
  analytics(model: String!, trim: String!, range: DateRange!): Analytics!
}

type Subscription {
  priceChange(vin: String!): PriceUpdate!
  newListing(filter: ListingFilter!): Listing!
}
```

## Performance Optimization

### Frontend Optimization

#### Data Fetching Strategy
```typescript
// Use SWR for client-side data fetching with caching
const { data, error } = useSWR(
  `/api/analytics/${model}/${trim}?range=${range}`,
  fetcher,
  {
    refreshInterval: 300000, // 5 minutes
    revalidateOnFocus: false,
    dedupingInterval: 60000
  }
);

// Implement incremental static regeneration
export async function getStaticProps() {
  return {
    props: { data },
    revalidate: 3600 // Rebuild page every hour
  };
}
```

#### Chart Rendering Optimization
```typescript
// Virtualize large datasets
const VirtualizedScatterPlot = () => {
  const [visibleData, setVisibleData] = useState([]);
  
  useEffect(() => {
    // Only render points in viewport
    const inViewport = data.filter(point => 
      isInViewport(point, viewport)
    );
    setVisibleData(inViewport);
  }, [viewport, data]);
  
  return <ScatterChart data={visibleData} />;
};

// Use WebGL for large datasets (>10,000 points)
if (data.length > 10000) {
  return <WebGLScatterPlot data={data} />;
}
```

### Backend Optimization

#### Caching Strategy
```typescript
// Redis caching for expensive queries
const CACHE_KEYS = {
  analytics: (model, trim, range) => 
    `analytics:${model}:${trim}:${range}`,
  listings: (filter) => 
    `listings:${JSON.stringify(filter)}`
};

const CACHE_TTL = {
  analytics: 3600,      // 1 hour
  listings: 300,        // 5 minutes
  staticData: 86400     // 24 hours
};
```

#### Database Query Optimization
```sql
-- Use proper indexes and avoid N+1 queries
WITH listing_options AS (
  SELECT 
    listing_id,
    ARRAY_AGG(o.name) as options
  FROM listing_options lo
  JOIN options o ON lo.option_id = o.id
  GROUP BY listing_id
)
SELECT 
  l.*,
  lo.options
FROM listings l
LEFT JOIN listing_options lo ON l.id = lo.listing_id
WHERE l.model = $1 AND l.trim = $2
  AND l.sold_date >= $3
ORDER BY l.sold_date DESC
LIMIT 1000;
```

## Security Implementation

### Authentication & Authorization
```typescript
// Supabase RLS policies
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Premium users can access all analytics"
  ON listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND subscription_tier IN ('professional', 'enterprise')
    )
  );
```

### Data Protection
- No PII stored (no names, addresses, phone numbers)
- VINs are public information
- All external API calls use environment variables
- Rate limiting on all endpoints
- Input sanitization for search queries

### Scraping Ethics
- Respect robots.txt
- Implement delays between requests
- Use proper user agents
- Cache aggressively to minimize requests
- Never scrape user data or private information

## Monitoring & Observability

### Error Tracking (Sentry)
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Integrations.BrowserTracing(),
    new Integrations.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1
});
```

### Performance Monitoring
```typescript
// Track key metrics
const metrics = {
  scrapeSuccess: new Counter('scrape_success_total'),
  scrapeErrors: new Counter('scrape_errors_total'),
  apiLatency: new Histogram('api_latency_seconds'),
  dbQueryTime: new Histogram('db_query_duration_seconds')
};
```

### Health Checks
```typescript
GET /api/health
Response:
{
  status: "healthy",
  database: "connected",
  scraper: {
    lastRun: "2025-09-17T10:00:00Z",
    recordsProcessed: 523
  },
  cache: "connected",
  uptime: 864000
}
```

## Deployment & DevOps

### Automated Scraping (GitHub Actions Cron)

Currently, we use GitHub Actions as our primary scheduling mechanism for periodic scraping, which provides 2,000 free minutes per month and reliable execution.

```yaml
# .github/workflows/scheduled-scraping.yml
name: Scheduled Data Scraping

on:
  schedule:
    # Run every 6 hours at minute 15
    - cron: '15 */6 * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  scrape-bat:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run BaT Scraper
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          BRIGHT_DATA_CUSTOMER_ID: ${{ secrets.BRIGHT_DATA_CUSTOMER_ID }}
          BRIGHT_DATA_ZONE: ${{ secrets.BRIGHT_DATA_ZONE }}
          BRIGHT_DATA_PASSWORD: ${{ secrets.BRIGHT_DATA_PASSWORD }}
        run: |
          npx tsx scripts/scrape-and-save.ts \
            --source=bat \
            --max-pages=10 \
            --save-html=true
      
      - name: Send notification on failure
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Scraping Job Failed',
              body: 'The scheduled scraping job failed. Check the Actions tab for details.'
            })
```

#### Production Scraping Schedule
- **Bring a Trailer**: Every 6 hours (4x daily)
- **Cars.com**: Every 12 hours (2x daily)
- **Classic.com**: Weekly on Sundays
- **Autotrader**: Daily at 2 AM EST
- **Dealer APIs**: Real-time webhooks where available

#### Alternative: Vercel Cron (Future Migration)
When we exceed GitHub Actions limits, we'll migrate to Vercel Cron:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/scrape-bat",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/scrape-cars",
      "schedule": "0 */12 * * *"
    },
    {
      "path": "/api/cron/normalize-options",
      "schedule": "30 * * * *"
    }
  ]
}
```

### CI/CD Pipeline (GitHub Actions)
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run type-check
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Infrastructure as Code
```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/scrape/bat",
      "schedule": "0 */4 * * *"  // Every 4 hours
    },
    {
      "path": "/api/scrape/cars",
      "schedule": "0 * * * *"     // Every hour
    },
    {
      "path": "/api/normalize",
      "schedule": "30 * * * *"    // Every hour at :30
    }
  ],
  "functions": {
    "api/analytics/*": {
      "maxDuration": 30
    },
    "api/scrape/*": {
      "maxDuration": 300
    }
  }
}
```

## Scalability Plan

### Phase 1: Current (0-10K users)
- Single Next.js app on Vercel
- Supabase free tier
- Bright Data pay-as-you-go

### Phase 2: Growth (10K-100K users)
- Vercel Pro with auto-scaling
- Supabase Pro with read replicas
- Redis cache layer
- CDN for static assets

### Phase 3: Scale (100K+ users)
- Multi-region deployment
- Dedicated database clusters
- Elasticsearch for search
- Kubernetes for scraper orchestration
- Data warehouse (Snowflake/BigQuery)

## Disaster Recovery

### Backup Strategy
- Database: Daily automated backups (30-day retention)
- HTML Archives: Immutable storage in Supabase
- Code: Git with protected branches
- Configuration: Encrypted secrets in Vercel

### Recovery Time Objectives
- RTO: 4 hours for full service restoration
- RPO: 24 hours maximum data loss

---

*Last Updated: September 17, 2025*