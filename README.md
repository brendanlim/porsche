# PorscheTrends - Market Intelligence Platform

A comprehensive Next.js application for tracking Porsche sports car market values, price trends, and vehicle history across multiple marketplaces.

![PorscheTrends](https://img.shields.io/badge/Next.js-15.5-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Supabase](https://img.shields.io/badge/Supabase-Ready-green)

## 🚀 Features

### Core Functionality
- **Multi-Source Data Collection**: Scrapes from BaT, Classic.com, Cars.com, Edmunds, Cars & Bids, Autotrader, CarGurus
- **Market Analysis**: Interactive price vs. mileage charts for all Porsche sports cars
- **VIN History Tracking**: Complete price history for any vehicle by VIN
- **Browse Listings**: Filter and search through comprehensive listing data
- **HTML Storage**: Archives all scraped HTML for data integrity and reprocessing
- **AI-Powered Normalization**: Google Gemini API for intelligent model/trim extraction
- **User Authentication**: Complete auth system with Supabase
- **Subscription Management**: Premium features with paywall

### Technical Highlights
- Built with Next.js 15 and TypeScript
- Supabase for database and authentication
- Recharts for data visualization
- Tailwind CSS for styling
- Bright Data proxy for reliable scraping
- HTML archival system with reparse capabilities
- Vercel-ready deployment configuration

## 📋 Prerequisites

Before you begin, you'll need:

1. **Node.js** (v18 or higher)
2. **Supabase Account** - [Sign up here](https://supabase.com)
3. **Google AI Studio API Key** - [Get it here](https://makersuite.google.com/app/apikey)
4. **Bright Data Account** - For web scraping proxy
5. **Stripe Account** (optional for payments) - [Sign up here](https://stripe.com)
6. **Vercel Account** (for deployment) - [Sign up here](https://vercel.com)

## 🛠️ Installation

### 1. Clone and Install

```bash
# Clone the repository
git clone [your-repo-url]
cd porschetrends

# Install dependencies
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the schema creation script:
   ```sql
   -- Copy and run the contents of:
   -- /supabase/migrations/001_initial_schema.sql
   ```
4. Run the seed data:
   ```sql
   -- Copy and run the contents of:
   -- /supabase/seed.sql
   ```
5. Get your API keys from Project Settings > API

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
│   │   ├── scrape/      # Scraping endpoints
│   │   ├── market-data/ # Market data API
│   │   └── vin/         # VIN lookup API
│   ├── browse/          # Browse listings page
│   ├── vin/             # VIN history page
│   ├── login/           # Authentication pages
│   └── page.tsx         # Homepage
├── components/          # React components
│   ├── MarketChart.tsx  # Interactive price chart
│   ├── Header.tsx       # Navigation header
│   └── Footer.tsx       # Site footer
├── lib/                 # Core libraries
│   ├── scrapers/        # Web scraping logic
│   ├── services/        # Business logic
│   ├── supabase/        # Database clients
│   ├── auth/            # Authentication hooks
│   └── types/           # TypeScript definitions
└── supabase/           # Database migrations
```

## 🔧 API Endpoints

### Scraping
```
POST /api/scrape
Authorization: Bearer [SCRAPER_API_KEY]
Body: {
  source: "bat",
  model?: "911",
  maxPages?: 3,
  normalize?: true
}
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
- **Manufacturers, Models, Trims**: Hierarchical vehicle taxonomy
- **Listings**: Core listing data with VIN tracking
- **Price History**: Temporal price tracking
- **Users & Profiles**: Authentication and subscription management
- **Ingestion Runs**: Scraping job tracking

## 🤖 Data Collection & Scripts

### Available Scripts

#### 1. Comprehensive Scraping (All Sources)
```bash
# Scrape from all configured sources
NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/scrape-all.ts
```

#### 2. Reparse Stored HTML
```bash
# Reparse all stored HTML files
npx tsx scripts/reparse-html.ts

# Reparse specific source from today
npx tsx scripts/reparse-html.ts --source bat --date 20250906

# Reparse specific model/trim
npx tsx scripts/reparse-html.ts --source bat --model 718-cayman --trim gt4

# Dry run preview (no database changes)
npx tsx scripts/reparse-html.ts --source classic --dry-run --limit 10

# Show help
npx tsx scripts/reparse-html.ts --help
```

#### 3. Test Scripts
```bash
# Test BaT price extraction
NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/test-price-extraction.ts

# Test BaT sold detection
NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx scripts/test-bat-sold.ts

# Check database schema
npx tsx scripts/check-schema.ts

# Clean up database (remove NULL model/trim)
npx tsx scripts/cleanup-database.ts
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

### Golden Rules
1. **Storage is cheap, scraping is not** - Always store raw HTML
2. **Sports cars only** - NO SUVs (Cayenne, Macan) or sedans (Panamera, Taycan)
3. **Real data only** - No synthetic or fake data
4. **Normalize with AI** - Use Gemini for consistent model/trim extraction

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

## 📊 Key Features Status

✅ **Completed**
- Next.js application setup
- Database schema and migrations
- BaT scraper with AI normalization
- Market chart visualization
- VIN history tracking
- Browse with filters
- User authentication
- Responsive design

🚧 **In Progress**
- Stripe payment integration
- Additional scrapers (Cars.com, CarGurus)
- Email notifications
- Advanced analytics

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

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org)
- [Google AI Studio](https://makersuite.google.com)

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

---

Built with ❤️ for the Porsche enthusiast community