import 'dotenv/config';
import { supabaseAdmin } from '../../lib/supabase/admin';

async function createBucket() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    console.log('Existing buckets:', buckets?.map(b => b.name) || []);
    
    if (!buckets?.find(b => b.name === 'raw-html')) {
      const { data, error } = await supabaseAdmin.storage.createBucket('raw-html', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['text/html', 'text/plain', 'application/octet-stream']
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('✅ Created bucket: raw-html');
      }
    } else {
      console.log('✅ Bucket raw-html already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createBucket();