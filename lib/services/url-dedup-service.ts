import { supabaseAdmin } from '@/lib/supabase/admin';

export class URLDeduplicationService {
  /**
   * COST OPTIMIZATION: Check which URLs we already have in database
   * before making expensive API calls to Bright Data
   */
  static async getExistingUrls(source: string, urls?: string[]): Promise<Set<string>> {
    try {
      let query = supabaseAdmin
        .from('listings')
        .select('source_url')
        .eq('source', source)
        .not('source_url', 'is', null);

      // If specific URLs provided, only check those
      if (urls && urls.length > 0) {
        // Split into batches of 100 to avoid query limits
        const batchSize = 100;
        const existingUrls = new Set<string>();

        for (let i = 0; i < urls.length; i += batchSize) {
          const batch = urls.slice(i, i + batchSize);
          const { data } = await query.in('source_url', batch);

          if (data) {
            data.forEach(item => {
              if (item.source_url) {
                existingUrls.add(item.source_url);
              }
            });
          }
        }

        return existingUrls;
      } else {
        // Get all URLs for this source
        const { data } = await query;
        return new Set(data?.map(item => item.source_url).filter(Boolean) || []);
      }
    } catch (error) {
      console.error('Error checking existing URLs:', error);
      return new Set();
    }
  }

  /**
   * Get existing HTML cache URLs to avoid re-downloading
   */
  static async getExistingCachedUrls(source: string): Promise<Set<string>> {
    try {
      const { data } = await supabaseAdmin
        .from('raw_html_cache')
        .select('url')
        .eq('source', source)
        .not('url', 'is', null);

      return new Set(data?.map(item => item.url).filter(Boolean) || []);
    } catch (error) {
      console.error('Error checking cached URLs:', error);
      return new Set();
    }
  }

  /**
   * Smart deduplication: Filter out URLs we already have complete data for
   */
  static async filterNewUrls(source: string, urls: string[]): Promise<{
    newUrls: string[],
    existingUrls: string[],
    stats: {
      total: number,
      new: number,
      existing: number,
      duplicateRate: number,
      estimatedSavings: string
    }
  }> {
    console.log(`🔍 Checking for existing ${source} URLs in database...`);

    const existingSet = await this.getExistingUrls(source, urls);

    const newUrls = urls.filter(url => !existingSet.has(url));
    const existingUrls = urls.filter(url => existingSet.has(url));

    const duplicateRate = (existingUrls.length / urls.length) * 100;

    // Estimate cost savings (average 1MB per page at $8/GB)
    const avgPageSizeMB = 1;
    const savedMB = existingUrls.length * avgPageSizeMB;
    const savedGB = savedMB / 1024;
    const savedCost = savedGB * 8;

    const stats = {
      total: urls.length,
      new: newUrls.length,
      existing: existingUrls.length,
      duplicateRate: parseFloat(duplicateRate.toFixed(1)),
      estimatedSavings: `$${savedCost.toFixed(2)}`
    };

    console.log(`📊 URL Deduplication Results:`);
    console.log(`   Total URLs: ${stats.total}`);
    console.log(`   New URLs: ${stats.new} (${(100 - duplicateRate).toFixed(1)}%)`);
    console.log(`   Existing URLs: ${stats.existing} (${duplicateRate.toFixed(1)}%)`);
    console.log(`   Estimated savings: ${stats.estimatedSavings} (${savedMB.toFixed(1)}MB avoided)`);

    return {
      newUrls,
      existingUrls,
      stats
    };
  }

  /**
   * Check if we should stop pagination due to high duplicate rate
   */
  static shouldStopPagination(recentDuplicateRate: number, threshold: number = 80): boolean {
    return recentDuplicateRate >= threshold;
  }

  /**
   * Get URL deduplication statistics for monitoring
   */
  static async getDeduplicationStats(source: string, days: number = 7): Promise<{
    totalFetches: number,
    uniqueUrls: number,
    duplicateRate: number,
    estimatedWastedCost: string
  }> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data } = await supabaseAdmin
        .from('raw_html_cache')
        .select('url, file_size')
        .eq('source', source)
        .gte('scraped_at', cutoffDate.toISOString());

      if (!data || data.length === 0) {
        return {
          totalFetches: 0,
          uniqueUrls: 0,
          duplicateRate: 0,
          estimatedWastedCost: '$0.00'
        };
      }

      const totalFetches = data.length;
      const uniqueUrls = new Set(data.map(item => item.url)).size;
      const duplicateFetches = totalFetches - uniqueUrls;
      const duplicateRate = (duplicateFetches / totalFetches) * 100;

      // Calculate wasted cost
      const wastedBytes = data
        .reduce((acc, item, index) => {
          // Count duplicates after the first occurrence
          const firstOccurrence = data.findIndex(d => d.url === item.url);
          return firstOccurrence === index ? acc : acc + item.file_size;
        }, 0);

      const wastedGB = wastedBytes / 1024 / 1024 / 1024;
      const wastedCost = wastedGB * 8;

      return {
        totalFetches,
        uniqueUrls,
        duplicateRate: parseFloat(duplicateRate.toFixed(1)),
        estimatedWastedCost: `$${wastedCost.toFixed(2)}`
      };
    } catch (error) {
      console.error('Error getting deduplication stats:', error);
      return {
        totalFetches: 0,
        uniqueUrls: 0,
        duplicateRate: 0,
        estimatedWastedCost: '$0.00'
      };
    }
  }
}