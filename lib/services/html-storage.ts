import { supabaseAdmin } from '@/lib/supabase/admin';
import { createHash } from 'crypto';

export class HTMLStorageService {
  private bucketName = 'raw-html';
  
  constructor() {
    // Ensure bucket exists (call this during initialization)
    this.ensureBucket();
  }

  /**
   * Ensure the storage bucket exists
   */
  private async ensureBucket() {
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      
      if (!buckets?.find(b => b.name === this.bucketName)) {
        await supabaseAdmin.storage.createBucket(this.bucketName, {
          public: false,
          fileSizeLimit: 10485760, // 10MB max per file
          allowedMimeTypes: ['text/html', 'text/plain', 'application/octet-stream']
        });
        console.log(`Created storage bucket: ${this.bucketName}`);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
    }
  }

  /**
   * Generate a storage path for HTML content
   * Golden rule: Storage is cheap, scraping is not
   * Structure: source/yyyymmdd/model/trim/type/filename.html
   */
  private generateStoragePath(params: {
    source: string;
    url: string;
    type: 'listing' | 'search' | 'detail';
    model?: string;
    trim?: string;
    generation?: string;
    timestamp?: Date;
  }): string {
    const { source, url, type, model, trim, generation, timestamp = new Date() } = params;
    
    // Format date as yyyymmdd
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Create filename from URL (sanitize for filesystem)
    const urlHash = this.calculateHash(url).substring(0, 12);
    const urlSlug = url
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9-]/g, '_')
      .substring(0, 50);
    
    const filename = `${urlSlug}_${urlHash}.html`;
    
    // Build path segments - NEW STRUCTURE: source/date/model/trim/type
    const pathSegments = [source];
    pathSegments.push(dateStr);
    
    // Add model/trim if available (for better organization)
    if (model) {
      const modelSlug = model.toLowerCase().replace(/[^a-z0-9]/g, '-');
      pathSegments.push(modelSlug);
      
      if (trim) {
        const trimSlug = trim.toLowerCase().replace(/[^a-z0-9]/g, '-');
        // Include generation in trim slug if provided (e.g., "gt3-991" instead of just "gt3")
        const fullTrimSlug = generation ? `${trimSlug}-${generation.toLowerCase()}` : trimSlug;
        pathSegments.push(fullTrimSlug);
      }
    } else {
      pathSegments.push('unknown');
    }
    
    pathSegments.push(type);
    pathSegments.push(filename);
    
    // Structure: source/yyyymmdd/model/trim/type/filename.html
    return pathSegments.join('/');
  }

  /**
   * Calculate SHA256 hash of content
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Store any scraped HTML (search results, detail pages, etc)
   * Golden rule: Store everything, storage is cheap
   */
  async storeScrapedHTML(params: {
    source: string;
    url: string;
    html: string;
    type: 'search' | 'detail' | 'listing';
    model?: string;
    trim?: string;
    listingId?: string;
    metadata?: Record<string, any>;
  }): Promise<{ path: string; size: number; hash: string } | null> {
    try {
      const { source, url, html, type, model, trim, listingId, metadata = {} } = params;
      const timestamp = new Date();
      
      // Generate storage path based on type and model/trim
      const storagePath = this.generateStoragePath({
        source,
        url,
        type,
        model,
        trim,
        generation: metadata?.generation,
        timestamp
      });
      
      // Calculate content hash
      const contentHash = this.calculateHash(html);
      
      // Always store, even if duplicate (we want historical record)
      // Silent operation - don't log every storage operation
      
      // Convert HTML string to Blob
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const fileSize = htmlBlob.size;
      
      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(storagePath, htmlBlob, {
          contentType: 'text/html',
          upsert: true,
          cacheControl: '3600' // Cache for 1 hour
        });
      
      if (error) {
        console.error('Error uploading HTML to storage:', error);
        return null;
      }
      
      // Record in database
      const cacheRecord = {
        listing_id: listingId || null,
        source,
        url,
        storage_path: storagePath,
        file_size: fileSize,
        content_hash: contentHash,
        scraped_at: timestamp.toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days for raw HTML
        metadata
      };
      
      await supabaseAdmin
        .from('raw_html_cache')
        .insert(cacheRecord);
      
      // If this is for a specific listing, update the listing record
      if (listingId) {
        await supabaseAdmin
          .from('listings')
          .update({
            raw_html_path: storagePath,
            raw_html_stored_at: timestamp.toISOString(),
            raw_html_size: fileSize
          })
          .eq('id', listingId);
      }
      
      // Silent success - return the result without logging
      return {
        path: storagePath,
        size: fileSize,
        hash: contentHash
      };
    } catch (error) {
      console.error('Error storing HTML:', error);
      return null;
    }
  }

  /**
   * Retrieve raw HTML content
   */
  async retrieveHTML(listingId: string): Promise<string | null> {
    try {
      // Get storage path from database
      const { data: cache } = await supabaseAdmin
        .from('raw_html_cache')
        .select('storage_path')
        .eq('listing_id', listingId)
        .single();
      
      if (!cache) {
        console.log(`No cached HTML found for listing ${listingId}`);
        return null;
      }
      
      // Download from storage
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .download(cache.storage_path);
      
      if (error) {
        console.error('Error downloading HTML from storage:', error);
        return null;
      }
      
      // Convert blob to text
      const html = await data.text();
      return html;
    } catch (error) {
      console.error('Error retrieving HTML:', error);
      return null;
    }
  }

  /**
   * Store HTML for a batch of listings
   */
  async storeBatch(htmlData: Array<{
    listingId: string;
    source: string;
    url: string;
    html: string;
    scrapedAt?: Date;
  }>): Promise<number> {
    let storedCount = 0;
    let totalBytes = 0;
    
    for (const item of htmlData) {
      const result = await this.storeScrapedHTML({
        ...item,
        type: 'detail' as const // Default to 'detail' type for batch storage
      });
      if (result) {
        storedCount++;
        totalBytes += result.size;
      }
    }
    
    // Update ingestion run stats if available
    const ingestionRunId = (global as any).currentIngestionRunId;
    if (ingestionRunId) {
      await supabaseAdmin
        .from('ingestion_runs')
        .update({
          total_html_stored: storedCount,
          total_storage_bytes: totalBytes
        })
        .eq('id', ingestionRunId);
    }
    
    console.log(`Stored ${storedCount} HTML files (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);
    return storedCount;
  }

  /**
   * Clean up expired HTML cache
   */
  async cleanupExpired(): Promise<number> {
    try {
      // Get expired entries
      const { data: expired } = await supabaseAdmin
        .from('raw_html_cache')
        .select('storage_path')
        .lt('expires_at', new Date().toISOString());
      
      if (!expired || expired.length === 0) {
        return 0;
      }
      
      // Delete from storage
      for (const item of expired) {
        await supabaseAdmin.storage
          .from(this.bucketName)
          .remove([item.storage_path]);
      }
      
      // Delete from database
      const { data } = await supabaseAdmin
        .from('raw_html_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();
      
      const deletedCount = data?.length || 0;
      console.log(`Cleaned up ${deletedCount} expired HTML cache entries`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired HTML:', error);
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSizeMB: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const { data } = await supabaseAdmin
        .from('raw_html_cache')
        .select('file_size, created_at');
      
      if (!data || data.length === 0) {
        return {
          totalFiles: 0,
          totalSizeMB: 0,
          oldestEntry: null,
          newestEntry: null
        };
      }
      
      const totalBytes = data.reduce((sum, item) => sum + item.file_size, 0);
      const dates = data.map(item => new Date(item.created_at));
      
      return {
        totalFiles: data.length,
        totalSizeMB: totalBytes / 1024 / 1024,
        oldestEntry: new Date(Math.min(...dates.map(d => d.getTime()))),
        newestEntry: new Date(Math.max(...dates.map(d => d.getTime())))
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSizeMB: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }
}