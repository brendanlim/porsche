import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function checkBucket() {
  console.log('Checking raw-html bucket contents...\n');
  
  const { data, error } = await supabaseAdmin.storage
    .from('raw-html')
    .list('', { limit: 20 });

  if (error) {
    console.error('Error accessing bucket:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('Bucket is empty or does not exist');
    return;
  }

  console.log(`Found ${data.length} items in root:\n`);
  
  for (const item of data) {
    const isFile = item.id && item.metadata;
    console.log(`  ${isFile ? '📄' : '📁'} ${item.name}`);
    
    // If it's a folder, check what's inside
    if (!isFile && item.name) {
      const { data: subItems } = await supabaseAdmin.storage
        .from('raw-html')
        .list(item.name, { limit: 5 });
      
      if (subItems && subItems.length > 0) {
        console.log(`     └─ Contains ${subItems.length} items`);
        for (const subItem of subItems.slice(0, 3)) {
          const isSubFile = subItem.id && subItem.metadata;
          console.log(`        ${isSubFile ? '📄' : '📁'} ${subItem.name}`);
        }
        if (subItems.length > 3) {
          console.log(`        ... and ${subItems.length - 3} more`);
        }
      }
    }
  }
}

checkBucket().catch(console.error);