import { BaTScraper } from '../../../lib/scrapers/bat';
import * as cheerio from 'cheerio';

describe('BaT Mileage Extraction', () => {
  let scraper: BaTScraper;

  beforeEach(() => {
    scraper = new BaTScraper();
  });

  describe('extractMileage', () => {
    it('should prioritize title mileage over body text', () => {
      const html = `
        <html>
          <body>
            <h1 class="listing-title">8k-Mile 2004 Porsche 911 GT3</h1>
            <div class="listing-description">
              This GT3 was delivered new to Porsche Greenwich in Connecticut
              prior to being purchased by the current owner in 2018 and now has 8k miles.
            </div>
            <div class="comments">
              Someone mentioned they saw a similar one with 175k miles selling for less.
              Another person said they've driven their GT3 186k miles.
            </div>
          </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const mileage = (scraper as any).extractMileage($);

      expect(mileage).toBe(8000); // Should get 8k from title, not 175k or 186k from comments
    });

    it('should handle various mileage formats in title', () => {
      const testCases = [
        { title: '8k-Mile 2004 Porsche 911 GT3', expected: 8000 },
        { title: '11k-Mile 2005 Porsche 911 GT3', expected: 11000 },
        { title: '25K Mile 2006 Porsche 911 Turbo', expected: 25000 },
        { title: '1,234-Mile 2022 Porsche 911 GT3', expected: 1234 },
        { title: '45,678-Mile 2010 Porsche Cayman', expected: 45678 },
      ];

      for (const { title, expected } of testCases) {
        const html = `<html><body><h1 class="listing-title">${title}</h1></body></html>`;
        const $ = cheerio.load(html);
        const mileage = (scraper as any).extractMileage($);
        expect(mileage).toBe(expected);
      }
    });

    it('should handle mileage in description when not in title', () => {
      const html = `
        <html>
          <body>
            <h1 class="listing-title">2004 Porsche 911 GT3</h1>
            <div class="listing-description">
              This GT3 was delivered new to Porsche Greenwich in Connecticut
              prior to being purchased by the current owner in 2018 and now has 8k miles.
            </div>
          </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const mileage = (scraper as any).extractMileage($);

      expect(mileage).toBe(8000);
    });

    it('should handle structured mileage data', () => {
      const html = `
        <html>
          <body>
            <h1 class="listing-title">2004 Porsche 911 GT3</h1>
            <dl class="essentials">
              <dt>Mileage</dt>
              <dd>8,456</dd>
            </dl>
          </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const mileage = (scraper as any).extractMileage($);

      expect(mileage).toBe(8456);
    });

    it('should ignore unrealistic mileage values', () => {
      const html = `
        <html>
          <body>
            <h1 class="listing-title">0-Mile 2004 Porsche 911 GT3</h1>
          </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const mileage = (scraper as any).extractMileage($);

      expect(mileage).toBeUndefined(); // 0 miles is below minimum threshold of 100
    });

    it('should not confuse other numbers with mileage', () => {
      const html = `
        <html>
          <body>
            <h1 class="listing-title">2004 Porsche 911 GT3</h1>
            <div class="listing-description">
              This GT3 produces 380 horsepower and now has 8k miles.
              The price is $175k. Lot #97,425.
            </div>
          </body>
        </html>
      `;

      const $ = cheerio.load(html);
      const mileage = (scraper as any).extractMileage($);

      expect(mileage).toBe(8000); // Should get 8k miles, not 175k or 380 or 97425
    });
  });
});