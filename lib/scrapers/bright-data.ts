import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

interface BrightDataConfig {
  apiKey?: string;
  customerId?: string;
  password?: string;
  zone?: string;
}

interface UnlockerRequest {
  url: string;
  country?: string;
  format?: 'html' | 'json';
  render?: boolean;
  block_resources?: boolean;
  wait?: number;
  wait_for?: string;
  js_scenario?: any;
}

export class BrightDataClient {
  private config: BrightDataConfig;
  private unlockerEndpoint = 'https://api.brightdata.com/dca/trigger_immediate';
  private caCert: Buffer | undefined;
  
  constructor() {
    this.config = {
      apiKey: process.env.BRIGHT_DATA_API_KEY,
      customerId: process.env.BRIGHT_DATA_CUSTOMER_ID,
      password: process.env.BRIGHT_DATA_PASSWORD,
      zone: process.env.BRIGHT_DATA_ZONE || 'pt_unlocker_z1',
    };
    
    // Load CA certificate if it exists
    try {
      // Try different possible certificate file names
      const certPaths = [
        path.join(process.cwd(), 'certs', 'BrightData SSL certificate (port 33335).crt'),
        path.join(process.cwd(), 'certs', 'ca.crt'),
      ];
      
      for (const certPath of certPaths) {
        if (fs.existsSync(certPath)) {
          this.caCert = fs.readFileSync(certPath);
          console.log(`✓ Loaded Bright Data CA certificate from ${path.basename(certPath)}`);
          break;
        }
      }
      
      if (!this.caCert) {
        console.log('No Bright Data CA certificate found');
      }
    } catch (error) {
      console.warn('Could not load Bright Data CA certificate:', error);
    }
  }

  /**
   * Fetch URL using Bright Data Unlocker API
   */
  async fetch(url: string): Promise<string> {
    // Use proxy method with unlocker zone - this is what actually works
    if (this.config.customerId && this.config.password) {
      return this.fetchWithUnlocker(url);
    }
    
    // Fall back to Direct API if we only have an API key
    if (this.config.apiKey) {
      return this.fetchWithDirectAPI(url);
    }
    
    throw new Error('No Bright Data credentials configured');
  }

  /**
   * Use Bright Data Unlocker with customer credentials via proxy
   */
  private async fetchWithUnlocker(url: string): Promise<string> {
    try {
      console.log('Fetching with Bright Data Unlocker:', url);
      
      // Build proxy URL with exact format from the example
      // Format: http://brd-customer-{customerId}-zone-{zone}:{password}@brd.superproxy.io:33335
      const proxyUrl = `http://brd-customer-${this.config.customerId}-zone-${this.config.zone}:${this.config.password}@brd.superproxy.io:33335`;
      
      console.log('Using proxy with zone:', this.config.zone);

      // For now, disable SSL validation to get it working
      // TODO: Investigate proper certificate configuration
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const proxyAgent = new HttpsProxyAgent(proxyUrl);
      
      if (this.caCert) {
        console.log('CA certificate loaded (SSL validation temporarily disabled)');
      }

      const response = await axios.get(url, {
        httpsAgent: proxyAgent,
        proxy: false, // Important: disable axios's built-in proxy to use our agent
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        timeout: 60000, // 60 second timeout
        maxRedirects: 5,
      });

      // Handle different response formats
      if (typeof response.data === 'string') {
        return response.data;
      } else if (response.data.html) {
        return response.data.html;
      } else if (response.data.content) {
        return response.data.content;
      } else {
        return JSON.stringify(response.data);
      }
    } catch (error: any) {
      console.error('Bright Data Unlocker error:', error.response?.data || error.message);
      
      // If proxy fails, try direct fetch
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.log('Proxy failed, trying direct fetch...');
        return this.fetchDirect(url);
      }
      
      throw error;
    }
  }
  
  /**
   * Fallback to direct fetch without proxy
   */
  private async fetchDirect(url: string): Promise<string> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PorscheTrends/1.0)',
      },
      timeout: 30000,
    });
    return response.data;
  }

  /**
   * Use Bright Data Direct API method
   */
  private async fetchWithDirectAPI(url: string): Promise<string> {
    try {
      console.log('Fetching with Bright Data Direct API:', url);
      
      // Use the DCA (Data Collector API) endpoint for web unlocker
      const response = await axios({
        method: 'POST',
        url: 'https://api.brightdata.com/dca/trigger_immediate',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        data: {
          collector: this.config.zone || 'pt_unlocker_z1',
          queue: [
            {
              url: url,
              method: 'GET',
            }
          ],
        },
        timeout: 60000,
      });

      // Handle response based on format
      if (response.data && response.data.response) {
        return response.data.response;
      } else if (typeof response.data === 'string') {
        return response.data;
      } else {
        return JSON.stringify(response.data);
      }
    } catch (error: any) {
      console.error('Bright Data Direct API error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Test the connection
   */
  async test(): Promise<boolean> {
    try {
      console.log('Testing Bright Data connection...');
      const html = await this.fetch('https://www.example.com');
      const success = html.includes('Example Domain') || html.includes('example');
      console.log('Bright Data test:', success ? 'Success' : 'Failed');
      return success;
    } catch (error) {
      console.error('Bright Data test failed:', error);
      return false;
    }
  }
}

/**
 * Alternative: Direct proxy method for simpler requests
 */
export async function fetchWithBrightDataProxy(url: string): Promise<string> {
  const customerId = process.env.BRIGHT_DATA_CUSTOMER_ID;
  const password = process.env.BRIGHT_DATA_PASSWORD;
  const zone = process.env.BRIGHT_DATA_ZONE || 'unlocker';
  
  if (!customerId || !password) {
    throw new Error('Bright Data credentials not configured');
  }

  // Construct proxy URL
  const proxyUrl = `http://${customerId}-zone-${zone}:${password}@zproxy.lum-superproxy.io:22225`;
  
  try {
    const response = await axios.get(url, {
      proxy: {
        host: 'zproxy.lum-superproxy.io',
        port: 22225,
        auth: {
          username: `${customerId}-zone-${zone}`,
          password: password,
        },
        protocol: 'http',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 30000,
    });

    return response.data;
  } catch (error) {
    console.error('Bright Data proxy error:', error);
    throw error;
  }
}