import { BaseScraper, ScrapedListing } from './base';
import { BrightDataPuppeteer } from './bright-data-puppeteer';
import { BaTScraper } from './bat';
import * as cheerio from 'cheerio';
import { HTMLStorageService } from '../services/html-storage';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
  // 911 Base/Carrera Models
  { name: '911', slug: '911', trim: 'Carrera', generation: '996', searchUrl: 'https://bringatrailer.com/porsche/996-911/' },
  { name: '911', slug: '911', trim: 'Carrera', generation: '997', searchUrl: 'https://bringatrailer.com/porsche/997-911/' },
  { name: '911', slug: '911', trim: 'Carrera', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-911/' },
  { name: '911', slug: '911', trim: 'Carrera', generation: '992', searchUrl: 'https://bringatrailer.com/porsche/992-911/' },
  { name: '911', slug: '911', trim: 'Carrera S', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-carrera-s/' },
  { name: '911', slug: '911', trim: 'Carrera 4S', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-carrera-4s/' },
  { name: '911', slug: '911', trim: 'Carrera GTS', generation: '991', searchUrl: 'https://bringatrailer.com/porsche/991-carrera-gts/' },
  
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
  
  // 718/Cayman/Boxster Models
  { name: '718 Cayman', slug: '718-cayman', trim: 'GT4', searchUrl: 'https://bringatrailer.com/porsche/cayman-gt4/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GT4 RS', searchUrl: 'https://bringatrailer.com/porsche/cayman-gt4/' },  // GT4 RS included in GT4 page
  { name: '718 Cayman', slug: '718-cayman', trim: 'GTS', searchUrl: 'https://bringatrailer.com/porsche/718-cayman-gts/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'GTS 4.0', searchUrl: 'https://bringatrailer.com/porsche/718-cayman-gts-4-0/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'S', searchUrl: 'https://bringatrailer.com/porsche/718-cayman-s/' },
  { name: '718 Cayman', slug: '718-cayman', trim: 'Base', searchUrl: 'https://bringatrailer.com/porsche/718-cayman/' },
  { name: 'Cayman', slug: 'cayman', trim: 'Base', searchUrl: 'https://bringatrailer.com/porsche/981-cayman/' },
  { name: 'Cayman', slug: 'cayman', trim: 'S', searchUrl: 'https://bringatrailer.com/porsche/981-cayman-s/' },
  { name: 'Cayman', slug: 'cayman', trim: 'GTS', searchUrl: 'https://bringatrailer.com/porsche/981-cayman-gts/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'Spyder', searchUrl: 'https://bringatrailer.com/porsche/718-spyder/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'GTS', searchUrl: 'https://bringatrailer.com/porsche/718-boxster-gts/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'S', searchUrl: 'https://bringatrailer.com/porsche/718-boxster-s/' },
  { name: '718 Boxster', slug: '718-boxster', trim: 'Base', searchUrl: 'https://bringatrailer.com/porsche/718-boxster/' },
  { name: 'Boxster', slug: 'boxster', trim: 'Base', searchUrl: 'https://bringatrailer.com/porsche/981-boxster/' },
  { name: 'Boxster', slug: 'boxster', trim: 'S', searchUrl: 'https://bringatrailer.com/porsche/981-boxster-s/' },
  { name: 'Boxster', slug: 'boxster', trim: 'GTS', searchUrl: 'https://bringatrailer.com/porsche/981-boxster-gts/' },
  { name: 'Boxster', slug: 'boxster', trim: 'Spyder', searchUrl: 'https://bringatrailer.com/porsche/981-spyder/' },
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

export class BaTScraperPuppeteer extends BaseScraper {
  private puppeteerScraper: BrightDataPuppeteer;
  private htmlStorage: HTMLStorageService;
  
  constructor() {
    super('bat');
    this.puppeteerScraper = new BrightDataPuppeteer();
    this.htmlStorage = new HTMLStorageService();
  }

  // Add required abstract method
  async scrapeDetail(url: string): Promise<ScrapedListing> {
    // For now, just return a minimal result
    // This scraper is mainly used for listing pages with puppeteer
    return {
      title: '',
      price: 0,
      source_url: url
    };
  }
  
  async scrapeListings(options: {
    model?: string;
    trim?: string;
    maxPages?: number;
    onlySold?: boolean;
  } = {}): Promise<ScrapedListing[]> {
    const { model, trim, maxPages = 5, onlySold = true } = options;
    const allListings: ScrapedListing[] = [];
    
    // Filter models based on provided parameters
    let modelsToScrape = BAT_MODELS;
    
    if (model || trim) {
      modelsToScrape = BAT_MODELS.filter(m => {
        // Check model match if provided
        if (model) {
          const modelMatch = m.slug.toLowerCase() === model.toLowerCase() || 
                           m.name.toLowerCase().replace(' ', '-') === model.toLowerCase();
          if (!modelMatch) return false;
        }
        
        // Check trim match if provided
        if (trim) {
          const trimMatch = m.trim.toLowerCase().replace(' ', '-') === trim.toLowerCase();
          if (!trimMatch) return false;
        }
        
        return true;
      });
    }
    
    console.log('='.repeat(50));
    console.log('BRING A TRAILER SCRAPER - PUPPETEER VERSION');
    console.log('='.repeat(50));
    console.log(`Models to scrape: ${modelsToScrape.length} (filtered from ${BAT_MODELS.length})`);
    if (model) console.log(`Model filter: ${model}`);
    if (trim) console.log(`Trim filter: ${trim}`);
    console.log(`Using Bright Data Scraping Browser to handle dynamic content`);
    console.log('='.repeat(50) + '\n');
    
    // Fetch existing URLs from database to detect duplicates
    console.log('📊 Fetching existing BaT URLs from database...');
    const { data: existingListings } = await supabaseAdmin
      .from('listings')
      .select('url')
      .eq('source', 'bring-a-trailer');
    
    const existingUrls = new Set(existingListings?.map(l => l.url) || []);
    console.log(`Found ${existingUrls.size} existing BaT listings in database`);
    
    // Process each model/trim combination
    for (const modelConfig of modelsToScrape) {
      console.log(`\n📊 Processing ${modelConfig.name} ${modelConfig.trim || ''} (${modelConfig.generation || 'all generations'})`);
      console.log(`URL: ${modelConfig.searchUrl}`);
      
      try {
        // Use Puppeteer to get the page with all listings loaded, passing existing URLs for duplicate detection
        // Pass maxPages to control how many "Show More" clicks we do
        const result = await this.puppeteerScraper.scrapeBaTResults(modelConfig.searchUrl, existingUrls, maxPages);
        
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
        
        // Also try to extract from the DOM (in case Puppeteer loaded more)
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
        console.error(`❌ Error processing ${modelConfig.name}: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`SCRAPING COMPLETE - Found ${allListings.length} total listings`);
    console.log('='.repeat(50));
    
    // Now fetch individual listing pages
    if (allListings.length > 0) {
      console.log('\n📥 Fetching individual listing pages...\n');
      
      // Limit detail fetching based on maxPages to avoid timeouts
      // With maxPages=2, fetch up to 100 detail pages (50 per page)
      const maxDetailsToFetch = (options.maxPages || 5) * 50;
      const detailsToFetch = allListings.slice(0, maxDetailsToFetch);
      
      console.log(`  Will fetch ${detailsToFetch.length} of ${allListings.length} detail pages`);
      console.log(`  (Limited by maxPages=${options.maxPages} * 50 to avoid timeouts)`);
      
      for (let i = 0; i < detailsToFetch.length; i++) {
        const listing = detailsToFetch[i];
        try {
          console.log(`[${i + 1}/${detailsToFetch.length}] Fetching detail for ${listing.model || 'Unknown'} ${listing.trim || ''}: ${listing.url}`);
          
          // Fetch the listing page with Puppeteer
          const listingData = await this.puppeteerScraper.scrapeListingPage(listing.url);
          
          if (listingData.html) {
            // Store the detail page HTML - ensure we have model/trim from modelConfig
            const storageResult = await this.htmlStorage.storeScrapedHTML({
              source: 'bring-a-trailer',
              url: listing.url,
              html: listingData.html,
              type: 'detail',
              model: listing.model || modelConfig.name,
              trim: listing.trim || modelConfig.trim,
            });
            if (storageResult) {
              console.log(`  ✓ Stored HTML for listing ${listing.model || modelConfig.name} ${listing.trim || modelConfig.trim || ''}: ${storageResult.path} (${listingData.html.length} bytes)`);
            }
            
            // Parse the detail page for full data
            const parsed = await this.parseListing(listingData.html, listing.url);
            if (parsed) {
              // Merge the parsed data with the listing, but preserve the price we already have
              const existingPrice = listing.price;
              Object.assign(listing, parsed);
              
              // If we didn't find a price in the detail page, use the one from search results
              if ((!parsed.price || parsed.price === 0) && existingPrice > 0) {
                listing.price = existingPrice;
              }
              
              // Save to database
              await this.saveListing(listing);
            }
          }
          
          // Rate limit
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error: any) {
          console.error(`  ❌ Error fetching detail: ${error.message}`);
        }
      }
    }
    
    return allListings;
  }
  
  async parseListing(html: string, url: string): Promise<ScrapedListing | null> {
    // Use the comprehensive BaTScraper parsing logic for sold_date, mileage, etc.
    const batScraper = new BaTScraper();
    
    // Create a temporary method to parse HTML directly without fetching
    // This reuses all the extraction methods from BaTScraper
    const parseWithBaTScraper = async (): Promise<ScrapedListing | null> => {
      const $ = cheerio.load(html);
      const pageText = $('body').text();
      
      // Extract listing ID from URL
      const sourceId = url.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '') || '';
      
      // Get title
      const title = $('h1.listing-title').first().text().trim() || 
                   $('h1').first().text().trim() || 
                   $('.auction-title').text().trim();
      
      if (!title) return null;
      
      // Extract year from title
      const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
      
      // Check if sold
      const isSold = (batScraper as any).checkIfSold($, pageText);
      if (!isSold) return null;
      
      // Extract all the details using BaTScraper's methods
      const price = (batScraper as any).extractSoldPrice($, pageText);
      if (!price || price < 15000) return null;
      
      const soldDate = (batScraper as any).extractSoldDate($, pageText);
      const mileage = (batScraper as any).extractMileage($);
      const vin = (batScraper as any).extractVIN($);
      const location = (batScraper as any).extractLocation($);
      const exteriorColor = (batScraper as any).extractExteriorColor($);
      const interiorColor = (batScraper as any).extractInteriorColor($);
      const transmission = (batScraper as any).extractTransmission($, title);
      const options_text = (batScraper as any).extractOptions($);
      
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
    };
    
    const parsed = await parseWithBaTScraper();
    if (parsed) return parsed;
    
    // Fallback to basic parsing if BaTScraper methods fail
    const $ = cheerio.load(html);
    
    // Extract basic info
    const title = $('h1').first().text().trim();
    if (!title) return null;
    
    // Extract price
    let price = 0;
    let status: 'sold' | 'active' = 'active';
    
    // Try multiple selectors for price
    const priceSelectors = [
      '.listing-available-info',  // BaT's main price display
      '.sold-for',
      '.final-price',
      '.winning-bid'
    ];
    
    let priceText = '';
    for (const selector of priceSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        priceText = element.text();
        break;
      }
    }
    
    // Get body text for searching (used for price and mileage)
    const bodyText = $('body').text();
    
    // If no specific element, search the body text
    if (!priceText) {
      const soldMatch = bodyText.match(/Sold for (?:USD\s*)?\$([0-9,]+)/i);
      if (soldMatch) {
        priceText = soldMatch[0];
      }
    }
    
    // Extract price from text
    const priceMatch = priceText.match(/\$([0-9,]+)/);
    if (priceMatch) {
      price = parseInt(priceMatch[1].replace(/,/g, ''));
      status = 'sold';
    }
    
    // Extract other details
    const yearMatch = title.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : undefined;
    
    const mileageMatch = bodyText.match(/([0-9,]+)\s+miles/i);
    const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : undefined;
    
    // Extract model and trim from URL
    let model = 'Unknown';
    let trim = undefined;
    
    const urlParts = url.split('/');
    const modelSlug = urlParts[urlParts.length - 2] || '';
    
    if (modelSlug.includes('911') || modelSlug.includes('991') || modelSlug.includes('992')) {
      model = '911';
      if (modelSlug.includes('gt3')) {
        trim = modelSlug.includes('rs') ? 'GT3 RS' : 'GT3';
      } else if (modelSlug.includes('turbo')) {
        trim = modelSlug.includes('-s') ? 'Turbo S' : 'Turbo';
      }
    } else if (modelSlug.includes('cayman') || modelSlug.includes('718')) {
      model = modelSlug.includes('718') ? '718 Cayman' : 'Cayman';
      if (modelSlug.includes('gt4')) {
        trim = modelSlug.includes('rs') ? 'GT4 RS' : 'GT4';
      }
    } else if (modelSlug.includes('boxster')) {
      model = modelSlug.includes('718') ? '718 Boxster' : 'Boxster';
      if (modelSlug.includes('spyder')) {
        trim = 'Spyder';
      }
    }
    
    return {
      source_url: url,
      url,
      title,
      price,
      status,
      model,
      trim,
      year,
      mileage,
    };
  }
}