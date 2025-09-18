# PorscheStats Product Requirements Document

## Executive Summary

**PorscheStats** is a comprehensive market intelligence platform for Porsche enthusiasts, collectors, and investors. By aggregating and analyzing sales data from multiple marketplaces, we provide actionable insights that help users make informed decisions about buying, selling, and collecting Porsche vehicles.

**Version:** 2.0  
**Date:** September 17, 2025  
**Status:** In Production

---

## Table of Contents

1. [Vision & Mission](#vision--mission)
2. [Problem Statement](#problem-statement)
3. [Target Users](#target-users)
4. [Core Value Propositions](#core-value-propositions)
5. [Product Features](#product-features)
6. [Monetization Strategy](#monetization-strategy)
7. [Technical Architecture](#technical-architecture)
8. [Data Pipeline](#data-pipeline)
9. [Success Metrics](#success-metrics)
10. [Roadmap](#roadmap)
11. [Lessons Learned](#lessons-learned)

---

## Vision & Mission

### Vision
To become the indispensable data-driven resource for the Porsche enthusiast market, providing transparency, confidence, and analytical depth that rivals Bloomberg Terminal for the sports car market.

### Mission
Democratize access to Porsche market data by transforming fragmented, opaque pricing information into clear, actionable intelligence that empowers buyers to avoid overpaying, sellers to maximize value, and collectors to make strategic portfolio decisions.

---

## Problem Statement

The high-value used Porsche market suffers from:

1. **Information Asymmetry**: Dealers and experienced traders have significant advantages over individual buyers
2. **Price Opacity**: True transaction costs are hidden (e.g., buyer fees, dealer markups)
3. **Fragmented Data**: Information scattered across multiple platforms with no unified view
4. **Emotional Decision-Making**: Buyers often overpay due to FOMO and lack of data
5. **Complex Valuation Factors**: Options, colors, and specifications dramatically affect value but are poorly understood
6. **No Historical Context**: Difficult to track appreciation/depreciation trends over time

---

## Target Users

### Primary Segments

#### 1. Prospective Buyers (40% of users)
- **Need**: Fair market value assessment, negotiation leverage
- **Pain Point**: Fear of overpaying, unclear on true value drivers
- **Use Case**: Researching before purchase, comparing similar listings
- **Willingness to Pay**: High ($50-200/month during active search)

#### 2. Current Owners (30% of users)
- **Need**: Portfolio valuation, sell timing optimization
- **Pain Point**: Uncertain when to sell, how to price
- **Use Case**: Tracking value trends, monitoring market conditions
- **Willingness to Pay**: Moderate ($25-100/month)

#### 3. Collectors & Investors (20% of users)
- **Need**: Market intelligence, appreciation forecasting
- **Pain Point**: Lack of professional-grade analytics tools
- **Use Case**: Portfolio management, investment analysis
- **Willingness to Pay**: Very High ($200-500/month)

#### 4. Dealers & Brokers (10% of users)
- **Need**: Pricing intelligence, inventory optimization
- **Pain Point**: Manual price research, missed arbitrage opportunities
- **Use Case**: Daily pricing checks, market trend analysis
- **Willingness to Pay**: Very High ($500-2000/month for enterprise)

---

## Core Value Propositions

### 1. "Don't Overpay" (Primary)
- Real-time fair market value based on actual sales data
- Price predictions accurate within 5% for standard configurations
- Clear visualization of price vs. mileage, age, and options

### 2. "Track Your Investment"
- Portfolio valuation tracking
- Appreciation/depreciation alerts
- Performance benchmarking against market indices

### 3. "Find Hidden Gems"
- Undervalued listing alerts
- Arbitrage opportunity identification
- Rare specification tracking

### 4. "Maximize Your Sale"
- Optimal listing price recommendations
- Best time to sell predictions
- Option value calculators

---

## Product Features

### Current Features (Live)

#### Data & Analytics
- **Multi-Source Data Aggregation**: BaT, Cars.com, Edmunds, Classic.com
- **Real-Time Market Analytics**: Price trends, volume analysis, seasonal patterns
- **Interactive Visualizations**: Price vs. mileage scatter plots, trend lines, heat maps
- **Options Analysis**: Value impact of specific options and packages
- **Color Premium Analysis**: Price differences by exterior/interior color combinations
- **Generation Comparison**: Side-by-side analysis across model generations
- **Seasonal Price Impact**: Median price variations by season
- **Days on Market Analysis**: How options affect selling speed

#### User Experience
- **Model/Trim Pages**: Dedicated analytics for each Porsche model and trim
- **Time Range Filters**: 7d, 30d, 90d, 1y, 2y, 3y, All-time views
- **Generation Filters**: Isolate analysis to specific model generations
- **Responsive Design**: Full mobile and desktop optimization

### Planned Features (Q4 2025)

#### Enhanced Analytics
- **VIN Decoder & History**: Full vehicle history and specification lookup
- **Predictive Pricing**: ML-based price predictions for future dates
- **Market Alerts**: Custom notifications for price changes, new listings
- **Comparative Analysis**: Side-by-side model/trim comparisons
- **Export Tools**: PDF reports, Excel exports for data analysis

#### Premium Features
- **API Access**: Programmatic access to market data
- **Custom Dashboards**: Build personalized analytics views
- **Portfolio Management**: Track multiple vehicles, total value, performance
- **Dealer Tools**: Bulk VIN lookups, inventory analytics

---

## Monetization Strategy

### Tiered Subscription Model

#### 1. Free Tier (Acquisition)
- Limited to 30-day data view
- Blurred/watermarked charts
- 3 searches per day
- Basic market trends only
- **Goal**: Convert to paid within 7 days

#### 2. Enthusiast Tier ($49/month)
- Full historical data access
- Unlimited searches
- Email alerts (5 active)
- CSV exports
- **Target**: Active buyers/sellers

#### 3. Professional Tier ($199/month)
- Everything in Enthusiast
- API access (1000 calls/month)
- Custom alerts (unlimited)
- Priority support
- Advanced analytics
- **Target**: Serious collectors, investors

#### 4. Enterprise Tier ($999+/month)
- Everything in Professional
- Unlimited API calls
- White-label options
- Dedicated account manager
- Custom integrations
- **Target**: Dealers, brokers, investment firms

### Additional Revenue Streams

1. **Affiliate Commissions**: 
   - Insurance partners (Hagerty)
   - Financing partners
   - Inspection services
   - Transport companies

2. **Data Licensing**:
   - Sell anonymized market data to OEMs
   - Insurance company partnerships
   - Financial institutions

3. **Premium Services**:
   - Personalized buying consultations
   - Pre-purchase inspections
   - Valuation certificates

---

## Technical Architecture

### Tech Stack

#### Frontend
- **Framework**: Next.js 15 with TypeScript
- **UI Library**: React with Tailwind CSS
- **Charts**: Recharts for data visualization
- **State Management**: React Context + Hooks

#### Backend
- **Platform**: Vercel Edge Functions
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage for HTML archives
- **Authentication**: Supabase Auth

#### Data Pipeline
- **Scraping**: Bright Data Scraping Browser
- **Normalization**: Google Gemini Flash for options parsing
- **Queue**: Vercel Cron Jobs for scheduling
- **Monitoring**: Sentry for error tracking

### Database Schema

```sql
-- Core listings table
CREATE TABLE listings (
    id UUID PRIMARY KEY,
    vin TEXT UNIQUE,
    source TEXT NOT NULL,
    source_url TEXT,
    make TEXT DEFAULT 'Porsche',
    model TEXT,
    trim TEXT,
    generation TEXT,
    year INTEGER,
    mileage INTEGER,
    price INTEGER,
    sold_price INTEGER,
    list_date DATE,
    sold_date DATE,
    exterior_color TEXT,
    interior_color TEXT,
    transmission TEXT,
    engine TEXT,
    dealer_name TEXT,
    location_city TEXT,
    location_state TEXT,
    options_text TEXT,
    buyer_fee_amount INTEGER,
    buyer_fee_applied BOOLEAN,
    price_before_fee INTEGER,
    scraped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Options normalization
CREATE TABLE options (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    category TEXT
);

CREATE TABLE listing_options (
    listing_id UUID REFERENCES listings(id),
    option_id INTEGER REFERENCES options(id),
    PRIMARY KEY (listing_id, option_id)
);

-- User management
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    subscription_tier TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search/alert management
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    criteria JSONB,
    alert_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Data Pipeline

### Data Acquisition Strategy

#### 1. Automated Scraping Infrastructure
**GitHub Actions Cron Jobs** (Current Implementation)
- Scheduled scraping runs automatically every 6 hours
- 2,000 free minutes/month on GitHub's infrastructure
- Reliable execution with built-in monitoring
- Automatic failure notifications via GitHub Issues
- All credentials stored securely in GitHub Secrets

**Scraping Schedule:**
- **Bring a Trailer**: Every 6 hours (includes 5% buyer fee calculation)
- **Cars.com**: Every 12 hours for active listings
- **Autotrader**: Daily at 2 AM EST for price changes
- **Classic.com**: Weekly on Sundays for historical data
- **Dealers**: Real-time webhooks where available

**Future Migration Path:**
- When we exceed GitHub Actions limits (~100 daily runs)
- Migrate to Vercel Cron for serverless execution
- Estimated at 10,000+ monthly active users

#### 2. Data Processing Pipeline

```
Raw HTML → Storage → Parsing → Normalization → Database → Analytics
    ↓         ↓          ↓           ↓             ↓          ↓
Archives  Backup   Extract    Gemini AI     PostgreSQL   Dashboards
          Storage  Structure  Standardize   Structured    Real-time
```

#### 3. Critical Data Requirements
- **VIN**: Required for de-duplication and history tracking
- **Actual Sale Price**: Including all fees (buyer premiums, dealer fees)
- **Mileage**: Essential for depreciation calculations
- **Options**: Parsed and normalized for value analysis
- **Dates**: Both listing date and sold date for time-on-market analysis

### Data Quality Assurance

1. **Validation Rules**:
   - Price minimums (e.g., GT4 RS > $220,000)
   - Mileage reasonability checks
   - VIN format validation
   - Generation-year compatibility

2. **De-duplication**:
   - VIN-based primary matching
   - Fuzzy matching for re-listed vehicles
   - Source URL tracking for updates

3. **Normalization**:
   - AI-powered options extraction
   - Color standardization
   - Model/trim mapping
   - Generation assignment

---

## Success Metrics

### Key Performance Indicators (KPIs)

#### Business Metrics
- **Monthly Recurring Revenue (MRR)**: Target $10K by Month 3
- **Paid Subscribers**: 200 by Month 3, 1000 by Month 12
- **Free-to-Paid Conversion**: >15% within 30 days
- **Churn Rate**: <5% monthly for paid tiers
- **Customer Lifetime Value**: >$1,000

#### Product Metrics
- **Data Coverage**: 95% of Porsche sports car transactions
- **Price Accuracy**: Within 5% of actual sale price
- **Data Freshness**: <24 hours for new listings
- **Site Uptime**: 99.9% availability
- **Page Load Speed**: <2 seconds for analytics pages

#### User Engagement
- **Daily Active Users**: 30% of subscriber base
- **Session Duration**: >5 minutes average
- **Features Used Per Session**: >3
- **Searches Per User**: >10 per month
- **Repeat Visit Rate**: >60% weekly

---

## Roadmap

### Phase 1: Foundation (Completed ✅)
- Basic data pipeline from BaT
- Core analytics dashboard
- Model/trim pages
- Price vs. mileage visualizations

### Phase 2: Enhanced Analytics (Current 🚧)
- Seasonal price analysis ✅
- Options value calculator ✅
- Days on market tracking ✅
- Color premium analysis ✅
- Generation comparisons ✅
- Buyer fee adjustments ✅

### Phase 3: Monetization (Q4 2025)
- Stripe payment integration
- Subscription tiers
- User authentication
- Premium feature gates
- Email alerts system

### Phase 4: Scale (Q1 2026)
- Additional data sources
- Machine learning price predictions
- Mobile app (React Native)
- API marketplace
- International expansion (European market)

### Phase 5: Platform (Q2 2026)
- Dealer partnerships
- Insurance integrations
- Financing marketplace
- Community features
- Virtual inspections

---

## Lessons Learned

### Critical Insights from Development

#### 1. Data Pipeline Must Actually Save Data
- **Issue**: Scrapers were fetching but not saving to database
- **Impact**: Lost thousands of scraped records
- **Solution**: Always verify end-to-end data flow with database counts

#### 2. True Transaction Costs Matter
- **Issue**: BaT shows hammer price without 5% buyer fee
- **Impact**: Prices were 5% lower than reality (up to $7,500 per car)
- **Solution**: Automatically apply marketplace fees to all prices

#### 3. Sports Cars Only
- **Issue**: SUVs and sedans dilute the core value proposition
- **Impact**: Reduced relevance for target audience
- **Solution**: Strictly filter to 911, 718, Boxster, Cayman models only

#### 4. Storage is Cheap, Scraping is Expensive
- **Issue**: Re-scraping costs time and risks detection
- **Impact**: Bright Data costs, rate limiting, IP blocks
- **Solution**: Archive everything - HTML, images, search results

#### 5. Options Dramatically Affect Value
- **Issue**: Raw options text is inconsistent across sources
- **Impact**: Can't properly value impact of specific options
- **Solution**: AI normalization with Gemini for consistent categorization

#### 6. Median > Average for Pricing
- **Issue**: Outliers skew average prices significantly
- **Impact**: Misleading market valuations
- **Solution**: Use median prices for seasonal and market analysis

---

## Competitive Analysis

### Direct Competitors

#### Classic.com
- **Strengths**: Comprehensive data, professional tools
- **Weaknesses**: Not Porsche-specific, expensive
- **Our Advantage**: Porsche expertise, options analysis

#### Bring a Trailer
- **Strengths**: Largest audience, trusted platform
- **Weaknesses**: No analytics, no cross-platform data
- **Our Advantage**: Aggregated view, predictive analytics

#### Excellence Magazine Price Guide
- **Strengths**: Porsche authority, expert opinions
- **Weaknesses**: Manual, outdated, subjective
- **Our Advantage**: Real-time data, objective metrics

### Competitive Advantages

1. **Porsche-Specific Expertise**: Deep understanding of options, packages, and value drivers
2. **Multi-Source Aggregation**: Only platform combining all major marketplaces
3. **True Cost Transparency**: Including all fees and adjustments
4. **Real-Time Analytics**: Live data vs. quarterly guides
5. **Predictive Capabilities**: ML-based price forecasting

---

## Risk Mitigation

### Technical Risks
- **Scraping Blocks**: Multiple data sources, proxy rotation, respectful crawling
- **Data Quality**: AI normalization, validation rules, manual QA
- **Scalability**: Edge functions, CDN caching, database optimization

### Business Risks
- **Competition**: First-mover advantage, community building, exclusive data
- **Legal**: Terms compliance, fair use, no PII storage
- **Market Downturn**: Diversify to classics, expand to other marquees

### Operational Risks
- **Data Source Changes**: Modular scrapers, quick adaptation
- **Cost Overruns**: Careful monitoring, usage limits, caching
- **Team Scaling**: Documentation, automated testing, clear processes

---

## Conclusion

PorscheStats is positioned to become the definitive market intelligence platform for the Porsche enthusiast community. By solving real pain points around price transparency and market analysis, we can build a sustainable business that serves a passionate, high-value customer base.

Our phased approach allows us to validate product-market fit with minimal investment while building toward a comprehensive platform that could expand beyond Porsche to other luxury automotive markets.

The key to success is maintaining data quality, building trust with the community, and continuously improving our analytics based on user feedback.

---

## Appendices

- [Technical Documentation](./technical-spec.md)
- [API Documentation](./api-docs.md)
- [Data Dictionary](./data-dictionary.md)
- [Brand Guidelines](./brand-guidelines.md)
- [Legal Compliance](./legal-compliance.md)

---

*Last Updated: September 17, 2025*  
*Next Review: October 1, 2025*  
*Owner: Product Team*