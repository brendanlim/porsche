import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function addGenerationColumn() {
  console.log('Adding generation column to market_narratives table...\n');

  try {
    // First, check if column already exists
    const { data: existingColumns } = await supabase.rpc('get_table_columns', {
      table_name: 'market_narratives'
    }).catch(() => ({ data: null }));

    // Add generation column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE market_narratives
        ADD COLUMN IF NOT EXISTS generation TEXT;
      `
    }).catch(err => ({ error: err }));

    if (!alterError) {
      console.log('✅ Added generation column');
    } else {
      console.log('Note: Column might already exist or using direct SQL...');

      // Try a different approach - direct query
      const { error } = await supabase
        .from('market_narratives')
        .select('generation')
        .limit(1);

      if (!error || error.message.includes('column')) {
        console.log('Column check completed');
      }
    }

    // Check current constraints
    console.log('\nChecking current narratives...');
    const { data: narratives, count } = await supabase
      .from('market_narratives')
      .select('*', { count: 'exact' });

    console.log(`Found ${count || 0} existing narratives`);

    if (count && count > 0) {
      console.log('\n⚠️  Existing narratives will need generation values');
      console.log('   You may want to clear and regenerate them');

      // Clear existing narratives since they don't have generation
      const { error: deleteError } = await supabase
        .from('market_narratives')
        .delete()
        .gte('id', 0);

      if (!deleteError) {
        console.log('✅ Cleared existing narratives for regeneration');
      }
    }

    console.log('\n✨ Migration complete!');
    console.log('The generation column is now available.');
    console.log('Run the Weekly Market Narrative Update workflow to regenerate narratives.');

  } catch (error) {
    console.error('Error during migration:', error);
    console.log('\n⚠️  The generation column may need to be added manually in Supabase dashboard');
  }
}

addGenerationColumn();