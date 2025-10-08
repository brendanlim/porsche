import { BaseScraper, ScrapedListing } from './base';
import { ScrapingBeePuppeteer } from './sb-puppeteer';
import * as cheerio from 'cheerio';
import { HTMLStorageService } from '../services/html-storage';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getModelSlug, isCleanModelName, type CleanModelName } from '../utils/model-slug-mapper';

interface BaTModel {
  name: string;
  slug: string;
  trim?: string;
  generation?: string;
  searchUrl: string;
}

const BAT_MODELS: BaTModel[] = [
  // 911 GT3 Models (includes GT3 RS on same pages)
  { name: '911', slug: '911', trim: 'GT3', generation: '996', searchUrl: 'https://bringatrailer.com/porsche/996-gt3/' },
  { name: '911', slug: '911', trim: 'GT3', generation: '997', searchUrl: 'https://bringatrailer.com/porsche/997-gt3/' },
  { name: '911', slug: '911', trim: 'GT3', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-gt3/' },
  { name: '911', slug: '911', trim: 'GT3', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-gt3/' },
  { name: '911', slug: '911', trim: 'GT3 RS', generation: '996', searchUrl: 'https://bringatrailer.com/porsche/996-gt3/' },
  { name: '911', slug: '911', trim: 'GT3 RS', generation: '997', searchUrl: 'https://bringatrailer.com/porsche/997-gt3/' },
  { name: '911', slug: '911', trim: 'GT3 RS', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-gt3/' },
  { name: '911', slug: '911', trim: 'GT3 RS', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-gt3/' },
  // 911 Base/Carrera Models - All variants use the generation URL
  // 964 Carrera variants (just /964/)
  { name: '911', slug: '911', trim: 'Carrera', generation: '964', searchUrl: 'https://bringatrailer.com/porsche/964/' },
  { name: '911', slug: '911', trim: 'Carrera 2', generation: '964', searchUrl: 'https://bringatrailer.com/porsche/964/' },
  { name: '911', slug: '911', trim: 'Carrera 4', generation: '964', searchUrl: 'https://bringatrailer.com/porsche/964/' },
  { name: '911', slug: '911', trim: 'Carrera RS', generation: '964', searchUrl: 'https://bringatrailer.com/porsche/964/' },

  // 993 Carrera variants (just /993/)
  { name: '911', slug: '911', trim: 'Carrera', generation: '993', searchUrl: 'https://bringatrailer.com/porsche/993/' },
  { name: '911', slug: '911', trim: 'Carrera S', generation: '993', searchUrl: 'https://bringatrailer.com/porsche/993/' },
  { name: '911', slug: '911', trim: 'Carrera 4', generation: '993', searchUrl: 'https://bringatrailer.com/porsche/993/' },
  { name: '911', slug: '911', trim: 'Carrera 4S', generation: '993', searchUrl: 'https://bringatrailer.com/porsche/993/' },
  { name: '911', slug: '911', trim: 'Carrera RS', generation: '993', searchUrl: 'https://bringatrailer.com/porsche/993/' },

  // 996 Carrera variants
  { name: '911', slug: '911', trim: 'Carrera', generation: '996', searchUrl: 'https://bringatrailer.com/porsche/996-911/' },
  { name: '911', slug: '911', trim: 'Carrera S', generation: '996', searchUrl: 'https://bringatrailer.com/porsche/996-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4', generation: '996', searchUrl: 'https://bringatrailer.com/porsche/996-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4S', generation: '996', searchUrl: 'https://bringatrailer.com/porsche/996-911/' },

  // 997 Carrera variants
  { name: '911', slug: '911', trim: 'Carrera', generation: '997', searchUrl: 'https://bringatrailer.com/porsche/997-911/' },
  { name: '911', slug: '911', trim: 'Carrera S', generation: '997', searchUrl: 'https://bringatrailer.com/porsche/997-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4', generation: '997', searchUrl: 'https://bringatrailer.com/porsche/997-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4S', generation: '997', searchUrl: 'https://bringatrailer.com/porsche/997-911/' },
  { name: '911', slug: '911', trim: 'Carrera GTS', generation: '997', searchUrl: 'https://bringatrailer.com/porsche/997-911/' },

  // 991 Carrera variants
  { name: '911', slug: '911', trim: 'Carrera', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-911/' },
  { name: '911', slug: '911', trim: 'Carrera S', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4S', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-911/' },
  { name: '911', slug: '911', trim: 'Carrera GTS', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4 GTS', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-911/' },

  // 992 Carrera variants
  { name: '911', slug: '911', trim: 'Carrera', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-911/' },
  { name: '911', slug: '911', trim: 'Carrera S', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4S', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-911/' },
  { name: '911', slug: '911', trim: 'Carrera GTS', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-911/' },
  { name: '911', slug: '911', trim: 'Carrera 4 GTS', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-911/' },

  // 911 Turbo Models (all generations)
  { name: '911', slug: '911', trim: 'Turbo', generation: '930', searchUrl: 'https://bringatrailer.com/porsche/930-turbo/' },
  { name: '911', slug: '911', trim: 'Turbo', generation: '964', searchUrl: 'https://bringatrailer.com/porsche/964-turbo/' },
  { name: '911', slug: '911', trim: 'Turbo', generation: '993', searchUrl: 'https://bringatrailer.com/porsche/993-turbo/' },
  { name: '911', slug: '911', trim: 'Turbo', generation: '996', searchUrl: 'https://bringatrailer.com/porsche/996-turbo/' },
  { name: '911', slug: '911', trim: 'Turbo', generation: '997', searchUrl: 'https://bringatrailer.com/porsche/997-turbo/' },
  { name: '911', slug: '911', trim: 'Turbo', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-turbo/' },
  { name: '911', slug: '911', trim: 'Turbo', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-turbo/' },
  { name: '911', slug: '911', trim: 'Turbo S', generation: '993', searchUrl: 'https://bringatrailer.com/porsche/993-turbo/' }, // Turbo S shares page with Turbo
  { name: '911', slug: '911', trim: 'Turbo S', generation: '996', searchUrl: 'https://bringatrailer.com/porsche/996-turbo/' }, // Turbo S shares page with Turbo
  { name: '911', slug: '911', trim: 'Turbo S', generation: '997', searchUrl: 'https://bringatrailer.com/porsche/997-turbo/' }, // Turbo S shares page with Turbo
  { name: '911', slug: '911', trim: 'Turbo S', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-turbo-s/' },
  { name: '911', slug: '911', trim: 'Turbo S', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-turbo-s/' },

  // 911 Targa Models
  { name: '911', slug: '911', trim: 'Targa', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-targa/' },
  { name: '911', slug: '911', trim: 'Targa', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-targa/' },

  // 718/Cayman/Boxster Models - FIXED URLs per generation
  // Cayman GT4 (special - includes all GT4/GT4 RS/GT4 Clubsport)
  { name: '718 Cayman', slug: '718-cayman', trim: 'GT4', searchUrl: 'https://bringatrailer.com/porsche/cayman-gt4/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GT4 RS', searchUrl: 'https://bringatrailer.com/porsche/cayman-gt4/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GT4 Clubsport', searchUrl: 'https://bringatrailer.com/porsche/cayman-gt4/' },

  // 982 Cayman (718 generation 2016+)
  { name: '718 Cayman', slug: '718-cayman', trim: 'Base', generation: '982', searchUrl: 'https://bringatrailer.com/porsche/982-718-cayman/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'S', generation: '982', searchUrl: 'https://bringatrailer.com/porsche/982-718-cayman/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GTS', generation: '982', searchUrl: 'https://bringatrailer.com/porsche/982-718-cayman/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GTS 4.0', generation: '982', searchUrl: 'https://bringatrailer.com/porsche/982-718-cayman/' },

  // 981 Cayman (2013-2016)
  { name: 'Cayman', slug: 'cayman', trim: 'Base', generation: '981', searchUrl: 'https://bringatrailer.com/porsche/981-cayman/' },
  { name: 'Cayman', slug: 'cayman', trim: 'S', generation: '981', searchUrl: 'https://bringatrailer.com/porsche/981-cayman/' },
  { name: 'Cayman', slug: 'cayman', trim: 'GTS', generation: '981', searchUrl: 'https://bringatrailer.com/porsche/981-cayman/' },

  // 987 Cayman (2006-2012)
  { name: 'Cayman', slug: 'cayman', trim: 'Base', generation: '987', searchUrl: 'https://bringatrailer.com/porsche/987-cayman/' },
  { name: 'Cayman', slug: 'cayman', trim: 'S', generation: '987', searchUrl: 'https://bringatrailer.com/porsche/987-cayman/' },
  { name: 'Cayman', slug: 'cayman', trim: 'R', generation: '987', searchUrl: 'https://bringatrailer.com/porsche/987-cayman/' },

  // 982 Boxster (718 generation 2016+)
  { name: '718 Boxster', slug: '718-boxster', trim: 'Base', generation: '982', searchUrl: 'https://bringatrailer.com/porsche/982-718-boxster/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'S', generation: '982', searchUrl: 'https://bringatrailer.com/porsche/982-718-boxster/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'GTS', generation: '982', searchUrl: 'https://bringatrailer.com/porsche/982-718-boxster/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'Spyder', generation: '982', searchUrl: 'https://bringatrailer.com/porsche/982-718-boxster/' },

  // 981 Boxster (2013-2016)
  { name: 'Boxster', slug: 'boxster', trim: 'Base', generation: '981', searchUrl: 'https://bringatrailer.com/porsche/981-boxster/' },
  { name: 'Boxster', slug: 'boxster', trim: 'S', generation: '981', searchUrl: 'https://bringatrailer.com/porsche/981-boxster/' },
  { name: 'Boxster', slug: 'boxster', trim: 'GTS', generation: '981', searchUrl: 'https://bringatrailer.com/porsche/981-boxster/' },
  { name: 'Boxster', slug: 'boxster', trim: 'Spyder', generation: '981', searchUrl: 'https://bringatrailer.com/porsche/981-boxster/' },

  // 987 Boxster (2005-2012)
  { name: 'Boxster', slug: 'boxster', trim: 'Base', generation: '987', searchUrl: 'https://bringatrailer.com/porsche/987-boxster/' },
  { name: 'Boxster', slug: 'boxster', trim: 'S', generation: '987', searchUrl: 'https://bringatrailer.com/porsche/987-boxster/' },
  { name: 'Boxster', slug: 'boxster', trim: 'Spyder', generation: '987', searchUrl: 'https://bringatrailer.com/porsche/987-boxster/' },

  // 986 Boxster (1997-2004)
  { name: 'Boxster', slug: 'boxster', trim: 'Base', generation: '986', searchUrl: 'https://bringatrailer.com/porsche/986-boxster/' },
  { name: 'Boxster', slug: 'boxster', trim: 'S', generation: '986', searchUrl: 'https://bringatrailer.com/porsche/986-boxster/' },
];

/**
 * Calculate BaT buyer fee: 5% of price, capped at $7,500
 */
function calculateBaTFeeAmount(price: number): number {
  const feePercent = 0.05;
  const maxFee = 7500;
  const calculatedFee = price * feePercent;
  return Math.min(calculatedFee, maxFee);
}

/**
 * Apply BaT buyer fee to get the true sale price
 */
function applyBaTFee(price: number): number {
  return price + calculateBaTFeeAmount(price);
}

export class BaTScraperSB extends BaseScraper {
  private scrapingBeeScraper: ScrapingBeePuppeteer;
  private htmlStorage: HTMLStorageService;

  constructor() {
    super('bat');
    this.scrapingBeeScraper = new ScrapingBeePuppeteer();
    this.htmlStorage = new HTMLStorageService();
    console.log('🚀 BaT scraper initialized (ScrapingBee version)');
  }

  // Direct detail page scraper for testing
  async scrapeDetail(url: string): Promise<ScrapedListing> {
    console.log(`🐝 Connecting to ScrapingBee for: ${url}`);

    try {
      const result = await this.scrapingBeeScraper.scrapeListingPage(url);
      const html = result.html;

      // Store HTML
      await this.htmlStorage.storeScrapedHTML({
        source: 'bat',
        url,
        html,
        type: 'detail',
        metadata: {
          scraper: 'BaTScraperSB',
          timestamp: new Date().toISOString(),
          htmlLength: html.length,
          directFetch: true
        }
      });

      console.log(`✅ Fetched and stored HTML (${html.length} chars)`);

      // Parse the listing
      const listing = await this.parseListing(html, url);

      if (!listing) {
        console.log('⚠️ Parsing returned null');
        return {
          title: 'Parse Failed',
          price: 0,
          source_url: url
        };
      }

      return listing;

    } catch (error) {
      console.error(`❌ Failed to scrape detail page: ${error}`);
      return {
        title: 'Error',
        price: 0,
        source_url: url
      };
    }
  }

  async scrapeListings(options: {
    model?: string;
    trim?: string;
    maxPages?: number;
    onlySold?: boolean;
    indexOnly?: boolean;
  } = {}): Promise<ScrapedListing[]> {
    const { model, trim, maxPages = 1, indexOnly = false } = options;  // Default to 1 page to save costs
    let allListings: ScrapedListing[] = [];

    // Filter models based on provided parameters
    let modelsToScrape = BAT_MODELS;

    if (model || trim) {
      modelsToScrape = BAT_MODELS.filter(m => {
        // Check model match if provided
        if (model) {
          const modelLower = model.toLowerCase();

          // Handle special filters: 911-gt, 911-996, 911-997, 911-991, 911-992
          if (modelLower.startsWith('911-')) {
            const suffix = modelLower.split('-')[1];

            // 911-gt: Filter for GT models (GT2, GT3, GT4)
            if (suffix === 'gt') {
              const isGT = m.name === '911' && m.trim && (
                m.trim.includes('GT2') ||
                m.trim.includes('GT3') ||
                m.trim.includes('GT4')
              );
              if (!isGT) return false;
            }
            // 911-[generation]: Filter by specific generation
            else if (['996', '997', '991', '992', '993', '964'].includes(suffix)) {
              const generationMatch = m.name === '911' && m.generation === suffix;
              if (!generationMatch) return false;
            }
          } else {
            // Standard model matching
            let targetSlug = modelLower;
            if (isCleanModelName(model)) {
              targetSlug = getModelSlug(model as CleanModelName, 'bat');
              // Remove 'porsche-' prefix for comparison
              targetSlug = targetSlug.replace('porsche-', '');
            }

            const modelMatch = m.slug.toLowerCase() === targetSlug ||
                             m.name.toLowerCase().replace(' ', '-') === targetSlug;
            if (!modelMatch) return false;
          }
        }

        // Check trim match if provided
        if (trim) {
          if (!m.trim) return false; // Skip models without a trim field
          const trimMatch = m.trim.toLowerCase().replace(' ', '-') === trim.toLowerCase().replace(' ', '-');
          if (!trimMatch) return false;
        }

        return true;
      });
    }

    console.log('\n' + '█'.repeat(70));
    console.log(' '.repeat(15) + 'BRING A TRAILER SCRAPER - SCRAPINGBEE VERSION');
    console.log('█'.repeat(70));
    console.log(`\n📋 Configuration:`);
    console.log(`   • Models to scrape: ${modelsToScrape.length}/${BAT_MODELS.length}`);
    if (model) console.log(`   • Model filter: ${model}`);
    if (trim) console.log(`   • Trim filter: ${trim}`);
    console.log(`   • Max pages per model: ${maxPages}`);
    console.log(`   • Using ScrapingBee API`);
    console.log('─'.repeat(70));

    // Fetch existing URLs from database to detect duplicates
    console.log('📊 Checking for existing BaT listings in database...');
    const { data: existingListings } = await supabaseAdmin
      .from('listings')
      .select('source_url')
      .eq('source', 'bring-a-trailer');

    const existingUrls = new Set(existingListings?.map(l => l.source_url) || []);
    console.log(`Found ${existingUrls.size} existing BaT listings to check for duplicates`);

    // Process each model/trim combination
    for (let configIdx = 0; configIdx < modelsToScrape.length; configIdx++) {
      const modelConfig = modelsToScrape[configIdx];

      // Add separator between models
      console.log('\n' + '═'.repeat(70));
      console.log(`📊 [${configIdx + 1}/${modelsToScrape.length}] ${modelConfig.name} ${modelConfig.trim || ''} (${modelConfig.generation || 'all'})`);
      console.log('─'.repeat(70));
      console.log(`🔗 ${modelConfig.searchUrl}`);

      try {

        // Use ScrapingBee to get the page with all listings loaded, passing existing URLs for duplicate detection
        // Pass maxPages to control how many "Show More" clicks we do
        const result = await this.scrapingBeeScraper.scrapeBaTResults(modelConfig.searchUrl, existingUrls, maxPages);

        if (!result || !result.html) {
          console.log('❌ No HTML returned from scraper');
          continue;
        }

        // Store the search page HTML with generation to prevent overwrites
        const storageResult = await this.htmlStorage.storeScrapedHTML({
          source: 'bring-a-trailer',
          url: modelConfig.searchUrl,
          html: result.html,
          type: 'search',
          model: modelConfig.name || 'unknown',
          trim: modelConfig.trim || 'unknown',
          metadata: { generation: modelConfig.generation }
        });
        if (storageResult) {
          console.log(`✓ Stored search page: ${storageResult.path}`);
        }

        // Parse the HTML to extract listings
        const $ = cheerio.load(result.html);

        // First try to extract from embedded JSON
        const scriptTags = $('script').toArray();
        let embedListings = 0;

        for (const script of scriptTags) {
          const scriptContent = $(script).html() || '';

          if (scriptContent.includes('auctionsCompletedInitialData')) {
            const jsonMatch = scriptContent.match(/auctionsCompletedInitialData\s*:\s*(\[[\s\S]*?\])\s*[,}]/);

            if (jsonMatch) {
              try {
                const auctionData = JSON.parse(jsonMatch[1]);
                console.log(`  Found ${auctionData.length} completed auctions in embedded JSON`);

                for (const auction of auctionData) {
                  if (!auction.url || !auction.title) continue;

                  // Filter by trim if specified (e.g., GT4 RS vs GT4)
                  if (trim && modelConfig.trim) {
                    const titleLower = auction.title.toLowerCase();
                    const trimLower = modelConfig.trim.toLowerCase();

                    // Special handling for GT4 RS vs GT4
                    if (trimLower === 'gt4 rs') {
                      if (!titleLower.includes('gt4 rs') && !titleLower.includes('gt4rs')) continue;
                    } else if (trimLower === 'gt4') {
                      // Skip GT4 RS when looking for regular GT4
                      if (titleLower.includes('gt4 rs') || titleLower.includes('gt4rs')) continue;
                    }
                  }

                  const listingUrl = auction.url.startsWith('http')
                    ? auction.url
                    : `https://bringatrailer.com${auction.url}`;

                  // Extract price
                  let hammmerPrice = 0;
                  if (auction.current_bid) {
                    hammmerPrice = parseInt(auction.current_bid.toString().replace(/[^0-9]/g, ''));
                  }

                  // Skip if price too low (not a real car)
                  if (hammmerPrice < 15000) continue;

                  // Apply BaT buyer fee (5% capped at $7,500)
                  const buyerFee = calculateBaTFeeAmount(hammmerPrice);
                  const finalPrice = applyBaTFee(hammmerPrice);

                  const listing: ScrapedListing = {
                    source_url: listingUrl,
                    url: listingUrl,
                    title: auction.title,
                    price: finalPrice,  // Use price with buyer fee included
                    status: 'sold',
                    model: modelConfig.name,
                    trim: modelConfig.trim,
                    // Store fee metadata
                    buyer_fee_amount: buyerFee,
                    buyer_fee_applied: true,
                    price_before_fee: hammmerPrice,
                  };

                  allListings.push(listing);
                  embedListings++;
                }
              } catch (e) {
                console.error('  Error parsing embedded JSON:', e);
              }
            }
          }
        }

        if (embedListings > 0) {
          console.log(`  ✓ Extracted ${embedListings} listings from embedded JSON`);
        }

        // Also try to extract from the DOM (in case ScrapingBee loaded more)
        if (result.listings && result.listings.length > 0) {
          console.log(`  Found ${result.listings.length} listings from DOM`);

          for (const domListing of result.listings) {
            // Check if we already have this listing from JSON
            if (!allListings.find(l => l.url === domListing.url)) {
              // Filter by trim if specified (e.g., GT4 RS vs GT4)
              if (trim && modelConfig.trim) {
                const titleLower = (domListing.title || '').toLowerCase();
                const trimLower = modelConfig.trim.toLowerCase();

                // Special handling for GT4 RS vs GT4
                if (trimLower === 'gt4 rs') {
                  if (!titleLower.includes('gt4 rs') && !titleLower.includes('gt4rs')) continue;
                } else if (trimLower === 'gt4') {
                  // Skip GT4 RS when looking for regular GT4
                  if (titleLower.includes('gt4 rs') || titleLower.includes('gt4rs')) continue;
                }
              }

              // Apply BaT buyer fee to DOM-parsed listings too
              const hammerPrice = domListing.price || 0;
              const buyerFee = calculateBaTFeeAmount(hammerPrice);
              const finalPrice = applyBaTFee(hammerPrice);

              const listing: ScrapedListing = {
                source_url: domListing.url,
                url: domListing.url,
                title: domListing.title || 'Unknown',
                price: finalPrice,  // Use price with buyer fee included
                status: 'sold',
                model: modelConfig.name || domListing.model,
                trim: modelConfig.trim || domListing.trim,
                // Store fee metadata
                buyer_fee_amount: buyerFee,
                buyer_fee_applied: true,
                price_before_fee: hammerPrice,
              };

              if (listing.price >= 15000) {
                allListings.push(listing);
              }
            }
          }
        }

        // Rate limit between models
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error: any) {
        console.error(`\n❌ Error processing ${modelConfig.name}: ${error.message}`);
        console.log('─'.repeat(70));
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ SEARCH COMPLETE - Found ${allListings.length} total listings`);
    console.log('═'.repeat(70));

    // Skip detail fetching if indexOnly is true
    if (indexOnly) {
      console.log('\n📋 Index-only mode: Skipping detail page fetching');
      return allListings;
    }

    // Now fetch individual listing pages
    if (allListings.length > 0) {
      console.log('\n' + '▓'.repeat(70));
      console.log('📥 FETCHING INDIVIDUAL LISTING DETAILS');
      console.log('▓'.repeat(70));
      console.log(`\n📊 Total listings to process: ${allListings.length}`);

      // Check database for existing sold listings to skip
      console.log('\n🔍 Checking for existing listings in database...');
      const urlsToCheck = allListings.map(l => l.source_url).filter(Boolean);
      const existingSoldListings = new Set<string>();

      try {
        // Query in batches of 100 URLs
        const batchSize = 100;
        for (let i = 0; i < urlsToCheck.length; i += batchSize) {
          const batch = urlsToCheck.slice(i, i + batchSize);
          const { data: existingListings } = await supabaseAdmin
            .from('listings')
            .select('source_url, sold_date, vin')
            .in('source_url', batch)
            .not('sold_date', 'is', null); // Only consider sold listings

          if (existingListings) {
            existingListings.forEach(listing => {
              if (listing.source_url && listing.vin) {
                // If we have VIN and sold_date, we can skip this listing
                existingSoldListings.add(listing.source_url);
              }
            });
          }
        }

        const skipCount = existingSoldListings.size;
        console.log(`✅ Found ${skipCount} listings already in database with VIN and sold_date`);
        console.log(`📊 Will fetch details for ${allListings.length - skipCount} new/updated listings`);

        // Filter out listings we already have complete data for
        const listingsToFetch = allListings.filter(l => !existingSoldListings.has(l.source_url));

        // Update allListings to only include ones we need to fetch
        if (listingsToFetch.length < allListings.length) {
          console.log(`\n⚡ Optimization: Skipping ${allListings.length - listingsToFetch.length} already-processed sold listings`);
          allListings = listingsToFetch;
        }
      } catch (error) {
        console.error('⚠️  Error checking existing listings, will fetch all:', error);
        // Continue with all listings if database check fails
      }

      console.log(`\n📊 Listings to fetch details: ${allListings.length}`);

      // Process in batches to avoid memory issues
      const batchSize = 50;
      const totalBatches = Math.ceil(allListings.length / batchSize);
      let totalFetched = 0;
      let totalErrors = 0;

      for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const startIdx = batchNum * batchSize;
        const endIdx = Math.min(startIdx + batchSize, allListings.length);
        const batch = allListings.slice(startIdx, endIdx);

        console.log('\n' + '·'.repeat(60));
        console.log(`📦 Batch ${batchNum + 1}/${totalBatches} (items ${startIdx + 1}-${endIdx})`);
        console.log('·'.repeat(60));

        for (let i = 0; i < batch.length; i++) {
          const listing = batch[i];
          const globalIdx = startIdx + i + 1;

          // Skip if we've had too many consecutive errors
          if (totalErrors >= 10) {
            console.error('\n  ⚠️ Too many consecutive errors (10+), stopping detail fetching');
            console.error('  This may be due to rate limiting or network issues');
            console.error(`  PARTIAL RESULTS: Returning ${totalFetched} successfully processed listings`);
            console.error('  HTML has been cached for failed listings - they can be reprocessed later');
            break;
          }

          try {
            const carInfo = `${listing.model || 'Unknown'} ${listing.trim || ''}`.trim();
            console.log(`\n  [${globalIdx}/${allListings.length}] ${carInfo}`);
            let listingData = null;
            let retries = 2;

            while (retries > 0 && !listingData) {
              try {
                // Create a timeout promise - increased from 30s to 45s for better stability
                const timeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Fetch timeout after 45s')), 45000)
                );

                // Race between fetch and timeout
                listingData = await Promise.race([
                  this.scrapingBeeScraper.scrapeListingPage(listing.url),
                  timeoutPromise
                ]);

                totalErrors = 0; // Reset error counter on success
              } catch (timeoutError: any) {
                retries--;
                if (retries > 0) {
                  console.log(`    ⚠️ Timeout/error, retrying... (${retries} attempts left)`);
                  await new Promise(resolve => setTimeout(resolve, 3000));
                } else {
                  throw timeoutError;
                }
              }
            }

            if (listingData && listingData.html) {
              // Store the detail page HTML
              const storageResult = await this.htmlStorage.storeScrapedHTML({
                source: 'bring-a-trailer',
                url: listing.url,
                html: listingData.html,
                type: 'detail',
                model: listing.model || 'unknown',
                trim: listing.trim || '',
              });

              if (storageResult) {
                const sizeKB = Math.round(listingData.html.length / 1024);
                console.log(`    ✓ Stored HTML (${sizeKB}KB)`);
              }

              // Parse the detail page for full data
              const parsed = await this.parseListing(listingData.html, listing.url);
              if (parsed) {
                // Merge the parsed data with the listing
                const existingPrice = listing.price;
                Object.assign(listing, parsed);

                // Preserve price if not found in detail
                if ((!parsed.price || parsed.price === 0) && existingPrice > 0) {
                  listing.price = existingPrice;
                }

                // Log key extracted data
                const details = [];
                if (parsed.vin) details.push(`VIN: ${parsed.vin}`);
                if (parsed.mileage) details.push(`${parsed.mileage.toLocaleString()} mi`);
                if (parsed.sold_date) details.push(`Sold: ${new Date(parsed.sold_date).toLocaleDateString()}`);
                if (details.length > 0) {
                  console.log(`    📊 ${details.join(' | ')}`);
                }

                totalFetched++;
              }
            }

            // Rate limit between requests
            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (error: any) {
            totalErrors++;
            const errorMsg = error.message === 'The operation was canceled.'
              ? 'Operation canceled (likely timeout or memory issue)'
              : error.message;
            console.error(`    ❌ Error: ${errorMsg}`);

            // If operation was canceled, it might be a memory issue
            if (error.message === 'The operation was canceled.') {
              console.log('    💡 Tip: This often happens with memory/timeout issues');
              console.log('    Waiting 5s before continuing...');
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        }

        // Break if we've had too many errors - increased threshold for resilience
        if (totalErrors >= 10) {
          console.error(`\n⚠️ Stopping batch processing due to excessive errors (${totalErrors})`);
          console.error('Returning partial results to prevent total failure');
          break;
        }
      }

      console.log('\n' + '═'.repeat(70));
      console.log(`📊 DETAIL FETCH COMPLETE: ${totalFetched}/${allListings.length} successfully processed`);

      // Important diagnostic information
      if (totalFetched < allListings.length) {
        const failed = allListings.length - totalFetched;
        console.log(`⚠️  ${failed} listings failed detail fetch - HTML is cached for retry`);
        console.log(`⚠️  This may explain HTML cached but no listings saved scenarios`);
      }

      if (totalErrors > 0) {
        console.log(`⚠️  Total errors encountered: ${totalErrors}`);
      }

      console.log('═'.repeat(70));
    }

    return allListings;
  }

  async parseListing(html: string, url: string): Promise<ScrapedListing | null> {
    const $ = cheerio.load(html);
    const pageText = $('body').text();

    // Get title
    const title = $('h1.listing-title').first().text().trim() ||
                 $('h1').first().text().trim() ||
                 $('.auction-title').text().trim();

    if (!title) return null;

    // Extract year from title
    const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

    // Check if sold - inline the checkIfSold logic
    const lowerText = pageText.toLowerCase();
    const isSold = lowerText.includes('sold for') && (lowerText.includes('$') || lowerText.includes('usd'));
    if (!isSold) return null;

    // Extract sold price - inline the extractSoldPrice logic
    let price = 0;
    const listingInfo = $('.listing-available-info').text();
    if (listingInfo) {
      const match = listingInfo.match(/\$?([\d,]+)/);
      if (match) {
        price = parseInt(match[1].replace(/,/g, ''));
      }
    }
    if (!price) {
      const patterns = [
        /sold for[:\s]*(?:USD\s*)?\$?([\d,]+)/i,
        /winning bid[:\s]*\$?([\d,]+)/i,
        /final price[:\s]*\$?([\d,]+)/i
      ];
      for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match) {
          price = parseInt(match[1].replace(/,/g, ''));
          break;
        }
      }
    }
    if (!price || price < 15000) return null;

    // Extract sold date
    const soldDate = this.extractSoldDate($, pageText);

    // Extract VIN
    const vin = this.extractVIN($);

    // Extract mileage
    const mileage = this.extractMileage($);

    // Extract location
    const location = this.extractLocation($);

    // Extract colors
    const exteriorColor = this.extractExteriorColor($);
    const interiorColor = this.extractInteriorColor($);

    // Extract transmission
    const transmission = this.extractTransmission($, title);

    // Extract options
    const options_text = this.extractOptions($);

    return {
      source_url: url,
      url,
      title,
      price,
      mileage,
      year,
      status: 'sold',
      sold_date: soldDate,
      vin,
      exterior_color: exteriorColor,
      interior_color: interiorColor,
      transmission,
      options_text,
      location: location ? `${location.city || ''}, ${location.state || ''}`.trim() : undefined
    } as ScrapedListing;
  }

  // Extraction helper methods (ported from original BaTScraper)
  private extractSoldDate($: cheerio.CheerioAPI, pageText: string): Date | undefined {
    const minValidDate = new Date(2010, 0, 1);
    const maxValidDate = new Date(2030, 0, 1);

    const parseDate = (dateStr: string): Date | null => {
      let date = new Date(dateStr);

      const twoDigitYearMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
      if (twoDigitYearMatch) {
        const month = parseInt(twoDigitYearMatch[1]) - 1;
        const day = parseInt(twoDigitYearMatch[2]);
        let year = parseInt(twoDigitYearMatch[3]);

        if (year < 30) {
          year += 2000;
        } else {
          year += 1900;
        }

        date = new Date(year, month, day);
      }

      if (isNaN(date.getTime()) || date < minValidDate || date > maxValidDate) {
        return null;
      }

      return date;
    };

    // Try specific date container first
    const dateText = $('.date-ended').text() || $('.sold-date').text();
    if (dateText) {
      const date = parseDate(dateText);
      if (date) return date;
    }

    // Look for date patterns in text
    const datePatterns = [
      /sold[^$]*?on\s+([\w\s,]+)/i,
      /ended[^$]*?on\s+([\w\s,]+)/i
    ];

    for (const pattern of datePatterns) {
      const match = pageText.match(pattern);
      if (match) {
        const date = parseDate(match[1]);
        if (date) return date;
      }
    }

    return undefined;
  }

  private extractVIN($: cheerio.CheerioAPI): string | undefined {
    let vin: string | undefined;

    $('ul li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('Chassis:')) {
        const match = text.match(/WP[01][A-Z0-9]{14}/);
        if (match) {
          vin = match[0];
          return false;
        }
      }
    });

    if (vin) return vin;

    const bodyText = $('body').text();
    const vinMatch = bodyText.match(/WP[01][A-Z0-9]{14}/);
    return vinMatch ? vinMatch[0] : undefined;
  }

  private extractMileage($: cheerio.CheerioAPI): number | undefined {
    const mileageLocations = [
      $('.essentials-item:contains("Mileage")').text(),
      $('dt:contains("Mileage")').next('dd').text(),
      $('[class*="mileage"]').text()
    ];

    for (const location of mileageLocations) {
      const match = location.match(/[\d,]+/);
      if (match) {
        const mileage = parseInt(match[0].replace(/,/g, ''));
        if (!isNaN(mileage) && mileage > 0 && mileage < 500000) {
          return mileage;
        }
      }
    }

    const title = $('h1.listing-title').text().trim() || $('h1').first().text().trim();
    const titleMatch = title.match(/(\d{1,3},?\d{0,3})\s*(?:miles?|mi\b)/i);
    if (titleMatch) {
      const mileage = parseInt(titleMatch[1].replace(/,/g, ''));
      if (!isNaN(mileage) && mileage > 0 && mileage < 500000) {
        return mileage;
      }
    }

    return undefined;
  }

  private extractLocation($: cheerio.CheerioAPI): { city?: string; state?: string; zip?: string } | undefined {
    let location: { city?: string; state?: string; zip?: string } | undefined;

    $('ul li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('Location:')) {
        const match = text.match(/Location:\s*([^,]+),\s*([A-Za-z\s]+?)\s*(\d{5})?$/);
        if (match) {
          location = {
            city: match[1].trim(),
            state: match[2].trim(),
            zip: match[3] || undefined
          };
          return false;
        }
      }
    });

    return location;
  }

  private extractExteriorColor($: cheerio.CheerioAPI): string | undefined {
    const colorText = $('.essentials-item:contains("Exterior Color")').text() ||
                     $('dt:contains("Exterior")').next('dd').text() ||
                     $('.essentials-item:contains("Color")').text();

    if (colorText) {
      const color = colorText.replace(/.*:/, '').trim();
      if (color) return color;
    }

    let paintColor: string | undefined;
    $('ul li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('Paint-To-Sample') || text.includes('Paint')) {
        const match = text.match(/Paint-To-Sample\s+([\w\s]+?)(?:\s+Paint)?$/i) ||
                     text.match(/([\w\s]+?)\s+(?:Metallic\s+)?Paint$/i);
        if (match) {
          paintColor = match[1].trim();
          return false;
        }
      }
    });

    return paintColor;
  }

  private extractInteriorColor($: cheerio.CheerioAPI): string | undefined {
    const colorText = $('.essentials-item:contains("Interior Color")').text() ||
                     $('dt:contains("Interior")').next('dd').text();

    if (colorText) {
      const color = colorText.replace(/.*:/, '').trim();
      if (color) return color;
    }

    let interiorColor: string | undefined;
    $('ul li').each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes('Upholstery') || text.includes('Leather') || text.includes('Race-Tex')) {
        const match = text.match(/^([\w\s]+?)\s+(?:Leather|Race-Tex|Upholstery)/i);
        if (match) {
          interiorColor = match[1].trim();
          return false;
        }
      }
    });

    return interiorColor;
  }

  private extractTransmission($: cheerio.CheerioAPI, title: string): string | undefined {
    const transText = $('.essentials-item:contains("Transmission")').text() ||
                     $('dt:contains("Transmission")').next('dd').text();

    if (transText) {
      const trans = transText.replace(/.*:/, '').trim();
      if (trans) return trans;
    }

    const titleLower = title.toLowerCase();
    if (titleLower.includes('6-speed') || titleLower.includes('six-speed')) return '6-Speed Manual';
    if (titleLower.includes('7-speed') || titleLower.includes('seven-speed')) {
      return titleLower.includes('pdk') ? '7-Speed PDK' : '7-Speed Manual';
    }
    if (titleLower.includes('5-speed') || titleLower.includes('five-speed')) return '5-Speed Manual';
    if (titleLower.includes('pdk')) return 'PDK';
    if (titleLower.includes('tiptronic')) return 'Tiptronic';

    return undefined;
  }

  private extractOptions($: cheerio.CheerioAPI): string {
    const options: string[] = [];

    let essentialsList: cheerio.Cheerio<any> | null = null;

    $('ul').each((i, ul) => {
      const items = $(ul).find('li');
      const hasVIN = items.toArray().some(li => $(li).text().includes('Chassis:'));
      if (hasVIN) {
        essentialsList = $(ul);
        return false;
      }
    });

    if (essentialsList) {
      essentialsList.find('li').each((i, el) => {
        const text = $(el).text().trim();

        // Skip non-option items
        if (text.match(/^(Chassis:|Location:|Mileage:|Year:|Make:|Model:|Title Status:|Seller:)/)) {
          return;
        }

        if (text.length > 3 && text.length < 200) {
          options.push(text);
        }
      });
    }

    return options.join('; ');
  }
}