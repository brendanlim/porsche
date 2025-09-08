import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function cleanupDatabase() {
  console.log('Cleaning up database...\n');
  
  // Delete listings with NULL model or trim
  const { data: toDelete, error: fetchError } = await supabaseAdmin
    .from('listings')
    .select('id, title, model, trim')
    .or('model.is.null,trim.is.null');
  
  if (fetchError) {
    console.error('Error fetching listings:', fetchError);
    return;
  }
  
  console.log(`Found ${toDelete?.length || 0} listings with NULL model/trim to delete`);
  
  if (toDelete && toDelete.length > 0) {
    // Delete in batches
    const ids = toDelete.map(row => row.id);
    const { error: deleteError } = await supabaseAdmin
      .from('listings')
      .delete()
      .in('id', ids);
    
    if (deleteError) {
      console.error('Error deleting listings:', deleteError);
    } else {
      console.log(`✓ Deleted ${ids.length} listings with NULL model/trim`);
    }
  }
  
  // Check remaining listings
  const { count } = await supabaseAdmin
    .from('listings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nRemaining listings in database: ${count || 0}`);
}

cleanupDatabase().catch(console.error);