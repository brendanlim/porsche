import { supabaseAdmin } from '../lib/supabase/admin';

async function checkListDates() {
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('list_date, sold_date, source_url, model, trim')
    .not('sold_date', 'is', null)
    .limit(20);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  const withListDate = data?.filter(l => l.list_date !== null) || [];
  const withoutListDate = data?.filter(l => l.list_date === null) || [];
  
  console.log(`Total listings checked: ${data?.length || 0}`);
  console.log(`With list_date: ${withListDate.length}`);
  console.log(`Without list_date: ${withoutListDate.length}`);
  
  if (withListDate.length > 0) {
    console.log('\nSample with list_date:');
    console.log(withListDate[0]);
  }
  
  if (withoutListDate.length > 0) {
    console.log('\nSample without list_date:');
    console.log(withoutListDate[0]);
  }
}

checkListDates();