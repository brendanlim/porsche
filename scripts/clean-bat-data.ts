import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanBaTData() {
  console.log('Deleting all BaT (Bring a Trailer) data...');
  
  try {
    // Delete from scraped_listings where source = 'bat'
    const { data: deletedListings, error: listingsError } = await supabase
      .from('scraped_listings')
      .delete()
      .eq('source', 'bat')
      .select();
    
    if (listingsError) {
      console.error('Error deleting BaT listings:', listingsError);
    } else {
      console.log(`Deleted ${deletedListings?.length || 0} BaT listings from scraped_listings`);
    }

    // Delete from scraped_html where source = 'bat'
    const { data: deletedHtml, error: htmlError } = await supabase
      .from('scraped_html')
      .delete()
      .eq('source', 'bat')
      .select();
    
    if (htmlError) {
      console.error('Error deleting BaT HTML:', htmlError);
    } else {
      console.log(`Deleted ${deletedHtml?.length || 0} BaT HTML records from scraped_html`);
    }

    // Delete from ingestion_runs where source = 'bat'
    const { data: deletedRuns, error: runsError } = await supabase
      .from('ingestion_runs')
      .delete()
      .eq('source', 'bat')
      .select();
    
    if (runsError) {
      console.error('Error deleting BaT ingestion runs:', runsError);
    } else {
      console.log(`Deleted ${deletedRuns?.length || 0} BaT ingestion runs`);
    }

    console.log('Successfully cleaned all BaT data from database');
  } catch (error) {
    console.error('Failed to clean BaT data:', error);
    process.exit(1);
  }
}

cleanBaTData();