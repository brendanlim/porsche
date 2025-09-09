import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class CurlFetcher {
  private lastRequestTime: { [domain: string]: number } = {};
  
  // Rate limiting settings (similar to Python project)
  private rateLimits: { [domain: string]: number } = {
    'cars.com': 3.0,
    'classic.com': 2.0,
    'edmunds.com': 3.0,
    'autotrader.com': 3.0,
    'carsandbids.com': 2.0,
    'default': 2.0
  };
  
  // Random delay range (will be added to base rate)
  private randomDelayMin = 0.5;
  private randomDelayMax = 2.5;

  private getDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'default';
    }
  }

  private async rateLimit(domain: string): Promise<void> {
    const baseDelay = this.rateLimits[domain] || this.rateLimits['default'];
    const randomDelay = Math.random() * (this.randomDelayMax - this.randomDelayMin) + this.randomDelayMin;
    const totalDelay = (baseDelay + randomDelay) * 1000; // Convert to milliseconds
    
    if (this.lastRequestTime[domain]) {
      const elapsed = Date.now() - this.lastRequestTime[domain];
      if (elapsed < totalDelay) {
        const sleepTime = totalDelay - elapsed;
        console.log(`Rate limiting: waiting ${(sleepTime / 1000).toFixed(1)}s for ${domain}`);
        await new Promise(resolve => setTimeout(resolve, sleepTime));
      }
    }
    
    this.lastRequestTime[domain] = Date.now();
  }

  async fetch(url: string, timeout: number = 30): Promise<string> {
    const domain = this.getDomain(url);
    
    // Apply rate limiting
    await this.rateLimit(domain);
    
    // Build curl command (based on Python project)
    const curlCommand = [
      'curl',
      '-s', // Silent mode
      '-L', // Follow redirects
      '-H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"',
      '-H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"',
      '-H "Accept-Language: en-US,en;q=0.5"',
      '-H "Accept-Encoding: gzip, deflate"',
      '-H "Connection: keep-alive"',
      '-H "Upgrade-Insecure-Requests: 1"',
      '--compressed', // Handle gzip/deflate
      `--max-time ${timeout}`,
      `"${url}"`
    ].join(' ');
    
    console.log(`Fetching with curl: ${url}`);
    
    try {
      const { stdout, stderr } = await execAsync(curlCommand, {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      if (stderr) {
        console.error(`Curl warning: ${stderr}`);
      }
      
      if (!stdout || stdout.length < 100) {
        throw new Error(`Empty or invalid response from ${url}`);
      }
      
      console.log(`Successfully fetched ${stdout.length} bytes from ${domain}`);
      return stdout;
    } catch (error: any) {
      console.error(`Curl error for ${url}:`, error.message);
      
      // Retry once after a delay
      if (!error.message.includes('retry')) {
        console.log('Retrying after 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          const { stdout } = await execAsync(curlCommand, {
            maxBuffer: 10 * 1024 * 1024
          });
          
          if (stdout && stdout.length > 100) {
            console.log(`Retry successful: ${stdout.length} bytes`);
            return stdout;
          }
        } catch (retryError: any) {
          console.error('Retry failed:', retryError.message);
        }
      }
      
      throw error;
    }
  }
  
  async fetchWithRetry(url: string, maxRetries: number = 3): Promise<string | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const html = await this.fetch(url);
        return html;
      } catch (error) {
        console.error(`Attempt ${attempt}/${maxRetries} failed for ${url}`);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime / 1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    return null;
  }
}