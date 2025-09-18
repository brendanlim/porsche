# PorscheStats - Market Intelligence Platform

A comprehensive market analytics platform providing real-time pricing intelligence, investment tracking, and data-driven insights for the Porsche sports car market.

![PorscheStats](https://img.shields.io/badge/Next.js-15.5-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Supabase](https://img.shields.io/badge/Supabase-Ready-green) ![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Automated-success)

## 🎯 Mission

To democratize access to Porsche market data by transforming fragmented, opaque pricing information into clear, actionable intelligence that empowers buyers to avoid overpaying, sellers to maximize value, and collectors to make strategic portfolio decisions.

## 🚀 Key Features

### Market Analytics
- **Real-Time Price Tracking**: Live market data from 5+ major platforms
- **Seasonal Price Analysis**: Median price impact by season (Winter/Spring/Summer/Fall)
- **Options Value Calculator**: How specific options affect market value
- **Days on Market Analysis**: How options impact selling speed
- **Generation Comparisons**: Side-by-side analysis across model generations
- **Color Premium Analysis**: Price differences by exterior/interior combinations
- **True Cost Transparency**: Includes all marketplace fees (e.g., BaT's 5% buyer premium)

### Data Intelligence
- **Multi-Source Aggregation**: BaT, Classic.com, Cars.com, Edmunds, Cars & Bids, Autotrader
- **AI-Powered Normalization**: Google Gemini for consistent options categorization
- **VIN History Tracking**: Complete transaction history for any vehicle
- **Automated Data Pipeline**: GitHub Actions cron jobs for continuous updates
- **HTML Archival System**: Complete data integrity with reprocessing capabilities

### User Experience
- **Interactive Visualizations**: Price vs. mileage scatter plots with filters
- **Model/Trim Analytics**: Dedicated pages for each Porsche variant
- **Time Range Filters**: 7d, 30d, 90d, 1y, 2y, 3y, All-time views
- **Mobile Responsive**: Full optimization for all devices
- **Browse & Search**: Filter by model, price, mileage, options, colors

## 📋 Prerequisites

Before you begin, you'll need:

1. **Node.js** (v18 or higher)
2. **Supabase Account** - [Sign up here](https://supabase.com)
3. **Google AI Studio API Key** - [Get it here](https://makersuite.google.com/app/apikey)
4. **Bright Data Account** - For web scraping proxy
5. **Stripe Account** (optional for payments) - [Sign up here](https://stripe.com)
6. **Vercel Account** (for deployment) - [Sign up here](https://vercel.com)

## 🛠️ Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/yourusername/porschetrends.git
cd porschetrends

# Install dependencies
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run migrations in order:
   ```sql
   -- Run each file in sequence:
   -- /supabase/migrations/001_initial_schema.sql
   -- /supabase/migrations/002_raw_html_storage.sql
   -- /supabase/migrations/003_add_generation_column.sql
   -- /supabase/migrations/004_add_list_date.sql
   -- /supabase/migrations/005_add_buyer_fee_fields.sql
   -- /supabase/migrations/006_add_options_tables.sql
   -- /supabase/migrations/007_add_options_and_list_date.sql
   ```
3. Get your API keys from Project Settings > API

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Bright Data Configuration (Required for scraping)
BRIGHT_DATA_API_KEY=your_bright_data_api_key
BRIGHT_DATA_CUSTOMER_ID=your_customer_id
BRIGHT_DATA_PASSWORD=your_password
BRIGHT_DATA_ZONE=pt_unlocker_z1

# Google Gemini API (Required for data normalization)
GEMINI_API_KEY=your_gemini_api_key

# Stripe (Optional - for payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Scraper Security
SCRAPER_API_KEY=generate_a_secure_random_string

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🌐 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables in Vercel's project settings
4. Deploy!

The app includes a `vercel.json` configuration with:
- Automated cron jobs for daily scraping
- Environment variable mappings
- Build settings

## 📱 Application Structure

```
porschetrends/
├── app/                  # Next.js app directory
│   ├── api/             # API routes
│   │   ├── analytics/   # Analytics endpoints
│   │   ├── scrape/      # Scraping endpoints
│   │   └── vin/         # VIN lookup API
│   ├── models/          # Model/trim analytics pages
│   ├── browse/          # Browse listings page
│   ├── vin/             # VIN history page
│   └── page.tsx         # Homepage
├── components/          # React components
│   ├── MarketChart.tsx  # Interactive price chart
│   ├── Header.tsx       # Navigation header
│   └── Footer.tsx       # Site footer
├── lib/                 # Core libraries
│   ├── scrapers/        # Web scraping logic
│   ├── services/        # Business logic
│   ├── supabase/        # Database clients
│   └── types/           # TypeScript definitions
├── scripts/             # Data pipeline scripts
├── prd/                 # Product documentation
├── notes/               # Development notes
└── .github/            # GitHub Actions workflows
    └── workflows/
        └── scheduled-scraping.yml

## 🔧 API Endpoints

### Analytics
```
GET /api/analytics/[model]/[trim]
Query Parameters:
  - range: 7d | 30d | 90d | 1y | 2y | 3y | all
  - generation: string (e.g., "991.2", "992.1")

Response includes:
  - Price trends and median values
  - Seasonal price analysis
  - Options value impact
  - Days on market by options
  - Generation comparisons
  - Color premiums
```

### Market Data
```
GET /api/market-data?model=911&trim=GT3
```

### VIN History
```
GET /api/vin/[VIN]
```

## 🗄️ Database Schema

The application uses a comprehensive PostgreSQL schema with:
- **Listings**: Core listing data with VIN tracking and buyer fee calculations
- **Options**: Normalized options with many-to-many relationships
- **Listing Options**: Junction table linking listings to their options
- **Users & Profiles**: Authentication and subscription management
- **Saved Searches**: User alerts and saved filters

Key fields tracked:
- True sale prices (including marketplace fees)
- List date and sold date for time-on-market analysis
- Normalized options for value impact analysis
- VIN for complete vehicle history

## 🤖 Automated Data Pipeline

### GitHub Actions Cron Jobs
The platform uses GitHub Actions for automated scraping (2,000 free minutes/month):

```yaml
# Runs every 6 hours automatically
- Bring a Trailer: */6 hours (includes 5% buyer fee)
- Cars.com: */12 hours
- Classic.com: Weekly on Sundays
- Autotrader: Daily at 2 AM EST
```

### Manual Scripts

#### Primary Scraping (SAVES to database)
```bash
# Scrape and save to database
npx tsx scripts/scrape-and-save.ts --source=bat --max-pages=10
```

#### Parse Stored HTML
```bash
# Parse all stored HTML and save to database
npx tsx scripts/parse-all-stored-html.ts
```

#### Apply BaT Buyer Fees
```bash
# Update all BaT listings with 5% buyer fee (capped at $7,500)
npx tsx scripts/apply-bat-buyer-fees.ts
```

#### Data Normalization
```bash
# Normalize colors across all listings
npx tsx scripts/normalize-colors.ts

# Extract and populate options
npx tsx scripts/populate-listing-options.ts
```

### Data Sources
The platform collects data from:
- **Bring a Trailer (BaT)**: Auction results and sold prices
- **Classic.com**: Historical sales data
- **Cars.com**: Current listings
- **Edmunds**: Market valuations
- **Cars & Bids**: Auction results
- **Autotrader**: Current listings
- **CarGurus**: Market pricing

### HTML Storage Structure
All scraped HTML is archived in Supabase Storage (`raw-html` bucket):
```
source/yyyymmdd/model/trim/type/filename.html

Example structure:
bat/
├── 20250906/
│   ├── 718-cayman/
│   │   ├── gt4/
│   │   │   ├── search/
│   │   │   └── detail/
│   │   └── base/
│   │       ├── search/
│   │       └── detail/
│   └── 911/
│       ├── gt3/
│       │   ├── search/
│       │   └── detail/
│       └── gt2-rs/
│           ├── search/
│           └── detail/
classic/
├── 20250906/
│   └── [model structure]
carscom/
└── [other sources]/
```

### Data Collection Principles
1. **Storage is cheap, scraping is not** - Always store raw HTML for reprocessing
2. **Sports cars only** - 911, 718, Boxster, Cayman models ONLY
3. **Real data only** - No synthetic data, all from actual marketplace listings
4. **True costs** - Include all fees (BaT 5% buyer premium, dealer fees)
5. **Normalize with AI** - Google Gemini for consistent options categorization
6. **Verify saves** - Always confirm data is actually saved to database

## 🔐 Authentication Flow

1. Users sign up with email/password or Google OAuth
2. Profile automatically created in database
3. Subscription status tracked (free/premium)
4. Premium features behind paywall

## 💳 Payment Integration (Coming Soon)

Stripe integration is prepared but requires:
1. Create products in Stripe Dashboard
2. Set up webhook endpoints
3. Implement checkout flow
4. Handle subscription lifecycle

## 🚦 Testing Locally

1. **Test Authentication**: Create an account at `/signup`
2. **Test VIN Lookup**: Use example VINs on the VIN page
3. **Test Browse**: Filter listings by model, price, mileage
4. **Test Scraping**: Use the API endpoint with your scraper key

## 📊 Implementation Status

✅ **Live Features**
- Multi-source data aggregation (BaT, Classic.com, Cars.com)
- Real-time market analytics with interactive charts
- Seasonal price analysis (median prices by season)
- Options value calculator
- Days on market analysis
- Color premium analysis
- Generation comparisons
- BaT buyer fee calculations (5% capped at $7,500)
- GitHub Actions automated scraping
- AI-powered options normalization
- VIN history tracking
- Mobile responsive design

🚧 **Coming Soon (Q4 2025)**
- Stripe subscription tiers ($49-$999/month)
- Email/SMS alerts for price changes
- API access for developers
- Portfolio management tools
- Machine learning price predictions
- Mobile app (React Native)

## 🐛 Troubleshooting

### Module not found errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection issues
- Verify your environment variables are correct
- Check if your Supabase project is running
- Ensure tables are created with the migration script

### Scraping not working
- Verify SCRAPER_API_KEY is set
- Check if GEMINI_API_KEY is valid
- Review logs for specific errors

## 📚 Documentation

### Product Documentation
- [Product Requirements Document](/prd/README.md)
- [Technical Specification](/prd/technical-spec.md)
- [Development Notes](/notes/)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Google AI Studio](https://makersuite.google.com)

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 💰 Monetization Strategy

### Subscription Tiers (Coming Q4 2025)
- **Free**: Limited 30-day data, blurred charts
- **Enthusiast** ($49/mo): Full data access, email alerts
- **Professional** ($199/mo): API access, advanced analytics
- **Enterprise** ($999+/mo): White-label, custom integrations

### Additional Revenue
- Affiliate partnerships (insurance, financing)
- Data licensing to OEMs and insurers
- Premium valuation certificates

## 📈 Success Metrics

- **Data Coverage**: 95% of Porsche sports car transactions
- **Price Accuracy**: Within 5% of actual sale price
- **Update Frequency**: <24 hours for new listings
- **Uptime**: 99.9% availability

## 📄 License

Proprietary - All rights reserved.

---

**Built for the Porsche enthusiast community**  
Providing transparency and confidence in the high-value sports car market.