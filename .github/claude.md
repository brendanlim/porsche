# Claude for GitHub Instructions

## Project Context
PorscheStats is a market analytics website that tracks Porsche sports car sales data from multiple sources (Bring a Trailer, Classic.com, Cars.com, etc.). The codebase uses Next.js 15, TypeScript, Supabase, and Tailwind CSS.

## Review Guidelines

When reviewing PRs, please focus on:

### Data Accuracy
- Ensure Porsche model generations are correct (e.g., GT4 only exists in 718/982 generation, never 987)
- Verify price calculations include buyer fees where applicable (BaT has 5% fee capped at $7,500)
- Check that only sports cars are included (no SUVs like Cayenne/Macan, no sedans like Panamera/Taycan)

### Code Quality
- TypeScript strict mode compliance
- React best practices and proper hook usage
- Efficient Supabase queries
- Proper error handling

### Scraping & Data Collection
- Scrapers must save to database, not just return data
- VINs are critical - preserve them when cars are relisted
- Options should be normalized and stored relationally
- HTML should be stored for later parsing

### Performance
- Minimize database queries
- Use proper indexing strategies
- Cache expensive calculations
- Optimize bundle size

### Security
- Never expose API keys or secrets
- Validate all user inputs
- Sanitize data from scraped sources
- Use proper authentication for protected routes

## Commands You Should Know

- `npm run dev` - Start development server on port 3003
- `npm run build` - Build for production
- `npx tsx scripts/scrape-and-save.ts` - Run scrapers
- `npx supabase migration` - Database migrations

## Key Files
- `/lib/scrapers/` - Web scraping implementations
- `/app/api/` - API routes
- `/app/models/` - Model pages and analytics
- `/scripts/` - Utility and maintenance scripts
- `/supabase/migrations/` - Database schema changes

## Important Notes
- Always check `/notes/` folder for conversation history
- Update CLAUDE.md with lessons learned
- Test scrapers thoroughly before deployment
- Verify analytics calculations with real data