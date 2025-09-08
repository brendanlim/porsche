import 'dotenv/config';
import { supabaseAdmin } from '../lib/supabase/admin';

async function clearOldListings() {
  try {
    // Today at 5pm PT (assuming PT timezone)
    const cutoffTime = new Date('2025-09-06T17:00:00-07:00');
    console.log('Deleting listings created before:', cutoffTime.toISOString());
    
    // Delete from listings table (will cascade to related tables due to foreign keys)
    const { data, error } = await supabaseAdmin
      .from('listings')
      .delete()
      .lt('created_at', cutoffTime.toISOString())
      .select();
    
    if (error) {
      console.error('Error deleting listings:', error);
    } else {
      console.log(`✅ Deleted ${data?.length || 0} listings created before 5pm today`);
    }
    
    // Also clean up any orphaned price_history records
    const { data: priceData, error: priceError } = await supabaseAdmin
      .from('price_history')
      .delete()
      .lt('created_at', cutoffTime.toISOString())
      .select();
      
    if (!priceError) {
      console.log(`✅ Deleted ${priceData?.length || 0} price history records`);
    }
    
    // Clean up ingestion runs from before 5pm
    const { data: ingestionData, error: ingestionError } = await supabaseAdmin
      .from('ingestion_runs')
      .delete()
      .lt('created_at', cutoffTime.toISOString())
      .select();
      
    if (!ingestionError) {
      console.log(`✅ Deleted ${ingestionData?.length || 0} ingestion runs`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearOldListings();