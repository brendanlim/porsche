import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeColors() {
  console.log('Analyzing 718 Cayman GT4 colors...\n');

  // Get all distinct colors for GT4 models
  const { data, error } = await supabase
    .from('listings')
    .select('exterior_color, model, generation')
    .ilike('trim', '%gt4%')
    .not('exterior_color', 'is', null);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  // Count occurrences of each color
  const colorCounts = new Map<string, number>();
  data?.forEach(listing => {
    const color = listing.exterior_color;
    colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
  });

  // Sort by count
  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log('Color variations found:');
  console.log('========================');
  sortedColors.forEach(([color, count]) => {
    console.log(`"${color}": ${count} listings`);
  });

  // Group similar colors
  console.log('\n\nPotential duplicates to normalize:');
  console.log('===================================');

  const whiteVariations = sortedColors.filter(([color]) =>
    color.toLowerCase().includes('white') ||
    color.toLowerCase() === 'white'
  );

  if (whiteVariations.length > 0) {
    console.log('\nWhite variations:');
    whiteVariations.forEach(([color, count]) => {
      console.log(`  "${color}": ${count}`);
    });
  }

  const blackVariations = sortedColors.filter(([color]) =>
    color.toLowerCase().includes('black') ||
    color.toLowerCase() === 'black'
  );

  if (blackVariations.length > 0) {
    console.log('\nBlack variations:');
    blackVariations.forEach(([color, count]) => {
      console.log(`  "${color}": ${count}`);
    });
  }

  const silverVariations = sortedColors.filter(([color]) =>
    color.toLowerCase().includes('silver') ||
    color.toLowerCase().includes('gt silver')
  );

  if (silverVariations.length > 0) {
    console.log('\nSilver variations:');
    silverVariations.forEach(([color, count]) => {
      console.log(`  "${color}": ${count}`);
    });
  }

  const redVariations = sortedColors.filter(([color]) =>
    color.toLowerCase().includes('red') ||
    color.toLowerCase().includes('guards')
  );

  if (redVariations.length > 0) {
    console.log('\nRed variations:');
    redVariations.forEach(([color, count]) => {
      console.log(`  "${color}": ${count}`);
    });
  }

  const blueVariations = sortedColors.filter(([color]) =>
    color.toLowerCase().includes('blue')
  );

  if (blueVariations.length > 0) {
    console.log('\nBlue variations:');
    blueVariations.forEach(([color, count]) => {
      console.log(`  "${color}": ${count}`);
    });
  }

  const grayVariations = sortedColors.filter(([color]) =>
    color.toLowerCase().includes('gray') ||
    color.toLowerCase().includes('grey')
  );

  if (grayVariations.length > 0) {
    console.log('\nGray/Grey variations:');
    grayVariations.forEach(([color, count]) => {
      console.log(`  "${color}": ${count}`);
    });
  }

  console.log(`\nTotal unique color strings: ${sortedColors.length}`);
  console.log(`Total GT4 listings with colors: ${data?.length}`);
}

analyzeColors().catch(console.error);