import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test generation detection
const getGenerationFromYear = (model: string, year: number): string => {
  const normalizedModel = model.toLowerCase();

  if (normalizedModel === 'cayman' || normalizedModel === 'boxster' ||
      normalizedModel === '718-cayman' || normalizedModel === '718-boxster' ||
      normalizedModel.includes('718')) {

    // 982 generation (718) - 2017+
    if (year >= 2017) return '982';

    // 981 generation - 2013-2016
    if (year >= 2013 && year <= 2016) return '981';

    // 987 generation - Cayman 2006-2012, Boxster 2005-2012
    if (year >= 2005 && year <= 2012) return '987';

    // 986 generation - Boxster only 1997-2004
    if (year >= 1997 && year <= 2004 && (normalizedModel === 'boxster' || normalizedModel === '718-boxster')) return '986';
  }

  return '';
};

async function debug() {
  // Get some cayman listings
  const { data: listings, error } = await supabase
    .from('listings')
    .select('model, year, trim, vin')
    .or('model.eq.cayman,model.eq.718-cayman')
    .not('year', 'is', null)
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== Cayman Listings and Their Generations ===\n');

  const generations: Record<string, number> = {};

  listings?.forEach(listing => {
    const gen = getGenerationFromYear(listing.model, listing.year);
    console.log(`Model: ${listing.model}, Year: ${listing.year}, Trim: ${listing.trim || 'base'} -> Generation: ${gen || 'NONE'}`);

    if (gen) {
      generations[gen] = (generations[gen] || 0) + 1;
    }
  });

  console.log('\n=== Generation Counts ===');
  Object.entries(generations).forEach(([gen, count]) => {
    console.log(`${gen}: ${count} listings`);
  });
}

debug();