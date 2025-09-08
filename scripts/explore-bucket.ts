import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { supabaseAdmin } from '../lib/supabase/admin';

async function explorePath(pathStr: string, indent: string = '') {
  const { data, error } = await supabaseAdmin.storage
    .from('raw-html')
    .list(pathStr, { limit: 100 });
  
  if (error) {
    console.error(`${indent}Error listing ${pathStr}:`, error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log(`${indent}(empty)`);
    return;
  }
  
  for (const item of data) {
    const isFile = !!item.id;
    const icon = isFile ? '📄' : '📁';
    console.log(`${indent}${icon} ${item.name}`);
    
    // If it's a folder and we're not too deep, explore it
    if (!isFile && indent.length < 12) {
      const newPath = pathStr ? `${pathStr}/${item.name}` : item.name;
      await explorePath(newPath, indent + '  ');
    }
  }
}

async function main() {
  console.log('Exploring raw-html bucket structure:\n');
  console.log('📁 / (root)');
  await explorePath('', '  ');
}

main().catch(console.error);