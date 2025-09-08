import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class BrightDataBrowser {
  private customerId: string;
  private password: string;
  private zone: string;
  
  constructor() {
    this.customerId = process.env.BRIGHT_DATA_CUSTOMER_ID || '';
    this.password = process.env.BRIGHT_DATA_PASSWORD || '';
    // Use scraping browser zone if available, otherwise fallback to unlocker
    this.zone = process.env.BRIGHT_DATA_BROWSER_ZONE || 'scraping_browser' || process.env.BRIGHT_DATA_ZONE || 'pt_unlocker_z1';
    
    if (!this.customerId || !this.password) {
      throw new Error('Bright Data credentials not configured');
    }
  }
  
  /**
   * Fetch a page with JavaScript rendering using Bright Data's Scraping Browser
   * This will execute JavaScript and wait for dynamic content to load
   */
  async fetchWithJS(url: string, waitForSelector?: string): Promise<string> {
    console.log(`Fetching with Bright Data Browser: ${url}`);
    
    // Build the proxy URL for scraping browser
    // The scraping browser uses a different endpoint that can execute JS
    const proxyUrl = `http://brd-customer-${this.customerId}-zone-${this.zone}:${this.password}@brd.superproxy.io:9222`;
    
    try {
      // For scraping browser, we need to pass special headers to control browser behavior
      const headers: any = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      };
      
      // Add browser instructions via headers
      if (waitForSelector) {
        // Tell Bright Data to wait for specific selector
        headers['X-BRD-Wait-For'] = waitForSelector;
      } else {
        // Wait for network idle (all requests finished)
        headers['X-BRD-Wait'] = 'networkidle';
      }
      
      // Set render mode to get fully rendered HTML
      headers['X-BRD-Render'] = 'html';
      
      // Disable SSL validation for now (temporary)
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      
      const proxyAgent = new HttpsProxyAgent(proxyUrl);
      
      const response = await axios.get(url, {
        httpsAgent: proxyAgent,
        proxy: false,
        headers,
        timeout: 120000, // 2 minute timeout for JS rendering
        maxRedirects: 5,
      });
      
      console.log('✓ Page rendered with JavaScript');
      
      if (typeof response.data === 'string') {
        return response.data;
      } else {
        return JSON.stringify(response.data);
      }
      
    } catch (error: any) {
      console.error('Bright Data Browser error:', error.message);
      
      // If browser API fails, try with regular unlocker
      if (error.response?.status === 403 || error.code === 'ECONNREFUSED') {
        console.log('Falling back to regular proxy...');
        return this.fetchWithRegularProxy(url);
      }
      
      throw error;
    }
  }
  
  /**
   * Fallback to regular proxy without JS rendering
   */
  private async fetchWithRegularProxy(url: string): Promise<string> {
    const proxyUrl = `http://brd-customer-${this.customerId}-zone-pt_unlocker_z1:${this.password}@brd.superproxy.io:33335`;
    
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const proxyAgent = new HttpsProxyAgent(proxyUrl);
    
    const response = await axios.get(url, {
      httpsAgent: proxyAgent,
      proxy: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 60000,
    });
    
    return response.data;
  }
  
  /**
   * Fetch BaT auction results page with JS rendering
   * Waits for the results to load
   */
  async fetchBaTResults(searchUrl: string): Promise<string> {
    console.log('Fetching BaT results with JS rendering...');
    
    // Wait for the auction results container to be populated
    // BaT loads results into .auctions-completed-container
    return this.fetchWithJS(searchUrl, '.auctions-completed-container .listing-card');
  }
}