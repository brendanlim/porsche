PorscheStats.com: The Complete MVP Launch Plan
Version: 1.0
Date: September 5, 2025
Author: Gemini

Part 1: Product Requirements Document (PRD)
1.1 Vision
To become the indispensable, data-driven resource for the Porsche enthusiast market, providing the clarity and confidence of Classic.com with a singular focus on Porsche.

1.2 Target Users
Prospective Buyers: Seeking fair market value, negotiation leverage, and deal discovery.

Prospective Sellers: Aiming to maximize asset value and optimize their listing strategy.

Collectors & Investors: Requiring portfolio tracking, market intelligence, and appreciation forecasting.

1.3 The Core Problem & Solution
The high-value used Porsche market is opaque, emotional, and fragmented. Buyers fear overpaying, sellers struggle with pricing, and investors lack specialized analytical tools. PorscheStats will solve this by ingesting, cleaning, and visualizing comprehensive market data to provide actionable, unbiased insights.

1.4 Minimum Viable Product (MVP) Feature Set
The initial launch will focus exclusively on delivering the core "Don't Overpay" value proposition.

IN SCOPE for MVP:

Automated Data Pipeline: Scrapes, archives, and normalizes data from Bring a Trailer (BaT).

Interactive Market Chart: A filterable Price vs. Mileage scatter plot for 911 and 718 models based on BaT sold data.

User Authentication: Simple email/password sign-up and login.

Subscription Paywall: A blurred/obfuscated chart for non-subscribed users, which becomes clear upon payment.

VIN History Page (Stub): A basic page that displays the known sold price and date for a given VIN from BaT.

OUT OF SCOPE for MVP:

Data from Cars.com, Edmunds, etc. (to be added post-launch).

Advanced Analytics (Option Value, Cost-per-Mile).

Portfolio Tracking & Management Tools.

SMS Alerts and saved searches.

1.5 Success Metrics
Primary Metric: Number of active paying subscribers. Goal: 15 paying subscribers ($100/mo revenue) within 30 days of launch.

Secondary Metrics: Free-to-paid conversion rate, daily active users, user session duration.

Part 2: The Technical Plan & Architecture
2.1 The Tech Stack
This stack is chosen for its tight integration, developer velocity, and low operational overhead.

Framework: Next.js (React)

Platform: Vercel

Database & Storage: Supabase (PostgreSQL, Storage)

Data Acquisition: Bright Data (Scraping Browser)

Data Normalization: Google Gemini API (Flash Model)

Payments: Stripe

2.2 Data Model & Schema (SQL)
This is the schema to be executed in the Supabase SQL Editor.

-- Main table for all listings
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    source_url TEXT,
    model TEXT,
    generation TEXT,
    year INT,
    mileage INT,
    sold_price INT,
    sold_at TIMESTAMPTZ,
    raw_options_text TEXT,
    html_archive_path TEXT, -- Path to the raw HTML in Supabase Storage
    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ -- Timestamp for when LLM normalization is complete
);

-- Master list of normalized option names
CREATE TABLE options (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Join table to link listings with their normalized options
CREATE TABLE listing_options (
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    option_id INT REFERENCES options(id) ON DELETE CASCADE,
    PRIMARY KEY (listing_id, option_id)
);

2.3 Dataflow Architecture
The journey of data from source to user is fully automated and resilient.

Trigger: A Vercel Cron Job initiates the scrape.

Fetch: A Vercel Serverless Function calls the Bright Data API to retrieve the raw HTML of a listing.

Archive: The raw HTML is immediately uploaded to a private Supabase Storage bucket for durability.

Parse & Store: The function parses essential data (VIN, price, etc.) and upserts it into the listings table in Supabase PostgreSQL, including the path to the archived HTML.

Normalize (Async): A second function is triggered, which takes the raw options text, calls the Gemini API to get a clean JSON array of options, and populates the options and listing_options tables.

Serve: The Next.js frontend calls an API route (/api/market-data) to fetch the clean, structured data from Supabase.

Visualize: The frontend, using a library like Recharts, displays the data to the end-user.

Part 3: The Scraper & Data Plan
3.1 Primary Tooling & Budget
Tool: Bright Data Scraping Browser.

Budget: Up to $100/month.

Justification: This provides access to a residential proxy network and AI-powered unblocking, which is critical for achieving the near-100% success rate required for a premium data product.

3.2 Target Sources & Priority
Priority 1 (MVP): bringatrailer.com - Easiest to scrape, provides high-quality historical sold data, which is essential for valuation.

Priority 2 (Post-MVP): cars.com, edmunds.com - More complex, requires tracking price changes for active listings.

3.3 The LLM Normalization Plan
Model: gemini-2.5-flash-preview-05-20.

Cost: Negligible (estimated <$1 for backfill, <$0.25/month ongoing).

Prompt Strategy: A detailed system prompt is crucial for consistent, structured output.

Example Gemini API Prompt:

System: You are a Porsche vehicle expert and a data normalization specialist. Your task is to extract key vehicle options from raw text and return them as a clean, structured JSON array. Normalize common abbreviations. For example, "PDK" becomes "Porsche Doppelkupplung (PDK)", "LWBS" becomes "Lightweight Bucket Seats", and "PCCB" becomes "Porsche Ceramic Composite Brakes". Only include options, not standard features or descriptive sentences. If a color is "Paint to Sample", identify the specific color if mentioned.

User: {raw_options_text from listing}

Part 4: The Vercel & Deployment Plan
4.1 Recommended Vercel Plan
Plan: Pro Plan (~$20/month).

Justification: Required for running Serverless Cron Jobs, preventing the project from sleeping due to inactivity, and providing higher resource limits for data processing functions.

4.2 Environment Variables
The following keys must be set in the Vercel Project Settings:

NEXT_PUBLIC_SUPABASE_URL: Public URL for your Supabase project.

NEXT_PUBLIC_SUPABASE_ANON_KEY: Public anon key for your Supabase project.

SUPABASE_SERVICE_ROLE_KEY: Secret service role key for admin access from serverless functions.

BRIGHT_DATA_API_KEY: Your secret API key for Bright Data.

GEMINI_API_KEY: Your secret API key for Google AI Studio.

STRIPE_SECRET_KEY: Your secret API key for Stripe.

4.3 Automation with Cron Jobs
Use a vercel.json file in the root of your project to schedule daily scrapes.

{
  "crons": [
    {
      "path": "/api/scrape-listings?source=bat",
      "schedule": "0 5 * * *"
    }
  ]
}

4.4 Deployment Workflow
Connect your GitHub repository to Vercel.

All git push commands to the main branch will automatically trigger a production deployment.

All pushes to other branches (pull requests) will generate a unique Preview Deployment URL for testing.

Part 5: Go-to-Market & Subscription Plan
5.1 Subscription Tiers & Pricing
Free / Guest User: Can view the site and the heavily blurred/obfuscated Market Chart. This acts as the primary marketing tool.

Premium: $7/month. Provides full, un-obfuscated access to all charts and data for the MVP feature set.

5.2 Payment Provider
Provider: Stripe.

Integration: Use the official Stripe React library and create a serverless function (/api/checkout) to handle session creation.

5.3 MVP Launch Strategy
Develop & Deploy MVP: Focus solely on the BaT data and the core Market Chart feature.

Initial Promotion: Post the link to the live tool on relevant, high-traffic Porsche communities (Rennlist, r/porsche). Frame it as a new tool you've built for enthusiasts and ask for feedback.

Gather Feedback & Validate: Engage with early users. Does the tool provide immediate value? Is the data accurate? Is it worth $7/month?

Iterate: Based on feedback and your first subscribers, prioritize the next feature. The most requested feature will likely be adding active listings from Cars.com, which should become your next development sprint.