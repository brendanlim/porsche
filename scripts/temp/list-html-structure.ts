#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listHTMLStructure() {
  console.log('📁 Exploring HTML storage structure...\n');

  // List top-level folders
  const { data: sources, error: sourcesError } = await supabase.storage
    .from('raw-html')
    .list('');

  if (sourcesError || !sources) {
    console.error('Error listing sources:', sourcesError);
    return;
  }

  console.log('Sources found:', sources.map(s => s.name));

  // Check BaT structure
  const { data: batFolders, error: batError } = await supabase.storage
    .from('raw-html')
    .list('bring-a-trailer', { limit: 10 });

  if (batError || !batFolders) {
    console.log('No bring-a-trailer folder found');
    return;
  }

  console.log('\nBring-a-Trailer folders (first 10):');
  batFolders.forEach(f => {
    console.log(`  ${f.name} (${f.metadata?.size || 'folder'})`);
  });

  // Check a recent date folder
  const dateFolders = batFolders.filter(f => f.name.match(/^\d{8}$/)).sort().reverse();
  if (dateFolders.length > 0) {
    const recentDate = dateFolders[0].name;
    console.log(`\nExploring ${recentDate}:`);

    const { data: modelFolders } = await supabase.storage
      .from('raw-html')
      .list(`bring-a-trailer/${recentDate}`, { limit: 10 });

    if (modelFolders) {
      console.log('Model folders:');
      modelFolders.forEach(f => {
        console.log(`  ${f.name}`);
      });

      // Check first model folder
      if (modelFolders.length > 0 && modelFolders[0].name !== '.emptyFolderPlaceholder') {
        const modelFolder = modelFolders[0].name;
        const { data: trimFolders } = await supabase.storage
          .from('raw-html')
          .list(`bring-a-trailer/${recentDate}/${modelFolder}`, { limit: 5 });

        if (trimFolders) {
          console.log(`\n${modelFolder} trim folders:`);
          trimFolders.forEach(f => {
            console.log(`  ${f.name}`);
          });

          // Check for HTML files
          if (trimFolders.length > 0 && trimFolders[0].name !== '.emptyFolderPlaceholder') {
            const trimFolder = trimFolders[0].name;
            const { data: typesFolders } = await supabase.storage
              .from('raw-html')
              .list(`bring-a-trailer/${recentDate}/${modelFolder}/${trimFolder}`, { limit: 5 });

            if (typesFolders) {
              console.log(`\n${trimFolder} type folders:`);
              typesFolders.forEach(f => {
                console.log(`  ${f.name}`);
              });

              // List actual HTML files
              const detailPath = `bring-a-trailer/${recentDate}/${modelFolder}/${trimFolder}/detail`;
              const { data: htmlFiles } = await supabase.storage
                .from('raw-html')
                .list(detailPath, { limit: 3 });

              if (htmlFiles && htmlFiles.length > 0) {
                console.log(`\nSample HTML files in ${detailPath}:`);
                htmlFiles.forEach(f => {
                  console.log(`  ${f.name} (${f.metadata?.size} bytes)`);
                });
              }
            }
          }
        }
      }
    }
  }
}

listHTMLStructure().catch(console.error);