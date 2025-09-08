import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as cheerio from 'cheerio';

async function testBaTLogin() {
  const username = process.env.BAT_USERNAME;
  const password = process.env.BAT_PASSWORD;
  const customerId = process.env.BRIGHT_DATA_CUSTOMER_ID;
  const brightPassword = process.env.BRIGHT_DATA_PASSWORD;
  const zone = process.env.BRIGHT_DATA_ZONE || 'pt_unlocker_z1';

  if (!username || !password) {
    console.error('❌ BAT_USERNAME and BAT_PASSWORD must be set in .env.local');
    process.exit(1);
  }

  console.log('🔐 Testing BaT login...');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password.substring(0, 3)}...`);
  
  try {
    // First, get the login page to extract CSRF token
    console.log('\n1️⃣ Fetching login page for CSRF token...');
    
    const proxyUrl = `http://brd-customer-${customerId}-zone-${zone}:${brightPassword}@brd.superproxy.io:33335`;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const proxyAgent = new HttpsProxyAgent(proxyUrl);
    
    // Create axios instance with cookie jar support
    const axiosInstance = axios.create({
      httpsAgent: proxyAgent,
      proxy: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      withCredentials: true,
      maxRedirects: 5,
    });

    // Get login page
    const loginPageResponse = await axiosInstance.get('https://bringatrailer.com/account/login/');
    const $ = cheerio.load(loginPageResponse.data);
    
    // Look for CSRF token or nonce
    let csrfToken = '';
    
    // Try to find CSRF token in various places
    csrfToken = $('input[name="csrf_token"]').val() as string ||
                 $('input[name="_csrf"]').val() as string ||
                 $('meta[name="csrf-token"]').attr('content') ||
                 '';
    
    // Also look for WordPress nonce
    const nonceMatch = loginPageResponse.data.match(/ajax_nonce["']?\s*:\s*["']([^"']+)["']/);
    const nonce = nonceMatch ? nonceMatch[1] : '';
    
    console.log(`CSRF Token: ${csrfToken ? 'Found' : 'Not found'}`);
    console.log(`Nonce: ${nonce ? 'Found' : 'Not found'}`);
    
    // Extract cookies from response
    const cookies = loginPageResponse.headers['set-cookie'] || [];
    const cookieString = cookies.map((c: string) => c.split(';')[0]).join('; ');
    console.log(`Cookies received: ${cookies.length} cookies`);
    
    // 2. Submit login form
    console.log('\n2️⃣ Submitting login credentials...');
    
    const loginData = new URLSearchParams();
    loginData.append('log', username);
    loginData.append('pwd', password);
    loginData.append('rememberme', 'forever');
    loginData.append('redirect_to', 'https://bringatrailer.com/');
    
    if (csrfToken) {
      loginData.append('csrf_token', csrfToken);
    }
    
    if (nonce) {
      loginData.append('_wpnonce', nonce);
    }
    
    const loginResponse = await axiosInstance.post(
      'https://bringatrailer.com/wp-login.php',
      loginData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookieString,
          'Referer': 'https://bringatrailer.com/account/login/',
          'Origin': 'https://bringatrailer.com',
        },
        validateStatus: (status) => status < 500, // Allow redirects
      }
    );
    
    console.log(`Login response status: ${loginResponse.status}`);
    console.log(`Location header: ${loginResponse.headers.location || 'none'}`);
    
    // Check if we got auth cookies
    const authCookies = loginResponse.headers['set-cookie'] || [];
    const hasAuthCookie = authCookies.some((c: string) => 
      c.includes('wordpress_logged_in') || 
      c.includes('wordpress_sec') ||
      c.includes('bat_')
    );
    
    console.log(`Auth cookies received: ${hasAuthCookie ? 'Yes' : 'No'}`);
    
    // Extract final cookie string
    const allCookies = [...cookies, ...authCookies];
    const finalCookieString = allCookies.map((c: string) => c.split(';')[0]).join('; ');
    
    // 3. Test authenticated access
    console.log('\n3️⃣ Testing authenticated access to a listing...');
    
    const testUrl = 'https://bringatrailer.com/listing/2022-porsche-911-gt3-31/';
    console.log(`Testing URL: ${testUrl}`);
    
    const testResponse = await axiosInstance.get(testUrl, {
      headers: {
        'Cookie': finalCookieString,
        'Referer': 'https://bringatrailer.com/',
      },
      validateStatus: (status) => true, // Accept all status codes
    });
    
    console.log(`Test response status: ${testResponse.status}`);
    
    // Check if we can see listing details
    const $test = cheerio.load(testResponse.data);
    const title = $test('h1.post-title').text().trim();
    const hasLoginForm = $test('form#loginform').length > 0;
    const hasBidInfo = $test('.bid-value').length > 0;
    
    console.log(`Page title: ${title || 'Not found'}`);
    console.log(`Has login form: ${hasLoginForm ? 'Yes (not logged in)' : 'No (logged in)'}`);
    console.log(`Has bid info: ${hasBidInfo ? 'Yes' : 'No'}`);
    
    if (!hasLoginForm && title) {
      console.log('\n✅ Login successful! We can access listing details.');
      console.log('\n🍪 Working cookie string for future requests:');
      console.log(finalCookieString);
      
      // Save working cookies to file for reuse
      const fs = await import('fs');
      await fs.promises.writeFile(
        path.join(process.cwd(), '.bat-cookies.json'),
        JSON.stringify({
          cookies: finalCookieString,
          timestamp: new Date().toISOString(),
          username: username
        }, null, 2)
      );
      console.log('\n💾 Cookies saved to .bat-cookies.json');
    } else {
      console.log('\n❌ Login appears to have failed - still seeing login form');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error during login test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
  }
}

testBaTLogin().catch(console.error);