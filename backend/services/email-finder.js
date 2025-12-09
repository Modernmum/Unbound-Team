/**
 * Email Finder Service
 * Open-source email discovery from websites and search engines
 *
 * Methods:
 * 1. Scrape target website directly (contact page, about, footer)
 * 2. Search Google for "@domain.com" emails
 * 3. Try common email patterns (hello@, contact@, info@, founder name@)
 */

const axios = require('axios');
const cheerio = require('cheerio');

class EmailFinder {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.timeout = 10000;
  }

  /**
   * Main method: Find emails for a company
   */
  async findEmails(companyName, domain) {
    console.log(`📧 Finding emails for ${companyName} (${domain})...`);

    const results = {
      emails: [],
      sources: {},
      primaryEmail: null,
      confidence: 'low'
    };

    try {
      // Method 1: Scrape the website directly
      const websiteEmails = await this.scrapeWebsite(domain);
      if (websiteEmails.length > 0) {
        results.emails.push(...websiteEmails);
        results.sources['website'] = websiteEmails;
        console.log(`   ✅ Found ${websiteEmails.length} emails from website`);
      }

      // Method 2: Search Google for emails (if website didn't yield results)
      if (results.emails.length === 0) {
        const googleEmails = await this.searchGoogle(domain);
        if (googleEmails.length > 0) {
          results.emails.push(...googleEmails);
          results.sources['google'] = googleEmails;
          console.log(`   ✅ Found ${googleEmails.length} emails from Google`);
        }
      }

      // Method 3: Try common email patterns
      const commonPatterns = this.generateCommonPatterns(domain, companyName);
      results.sources['patterns'] = commonPatterns;

      // Deduplicate and clean
      results.emails = [...new Set(results.emails.map(e => e.toLowerCase()))];

      // Pick the best primary email
      results.primaryEmail = this.selectBestEmail(results.emails, commonPatterns, domain);

      // Set confidence level
      if (results.primaryEmail && results.sources['website']?.includes(results.primaryEmail)) {
        results.confidence = 'high';
      } else if (results.primaryEmail && results.sources['google']?.includes(results.primaryEmail)) {
        results.confidence = 'medium';
      } else if (results.primaryEmail) {
        results.confidence = 'low';
      }

      console.log(`   📧 Primary email: ${results.primaryEmail || 'none found'} (${results.confidence} confidence)`);

    } catch (error) {
      console.error(`   ❌ Email finder error: ${error.message}`);
    }

    return results;
  }

  /**
   * Scrape website for email addresses
   */
  async scrapeWebsite(domain) {
    const emails = new Set();
    const pagesToScrape = [
      `https://${domain}`,
      `https://${domain}/contact`,
      `https://${domain}/contact-us`,
      `https://${domain}/about`,
      `https://${domain}/about-us`,
      `https://${domain}/team`,
      `https://www.${domain}`,
      `https://www.${domain}/contact`,
      `https://www.${domain}/about`
    ];

    for (const url of pagesToScrape) {
      try {
        const response = await axios.get(url, {
          headers: { 'User-Agent': this.userAgent },
          timeout: this.timeout,
          maxRedirects: 3
        });

        const foundEmails = this.extractEmailsFromHtml(response.data, domain);
        foundEmails.forEach(email => emails.add(email));

        // Stop if we found emails
        if (emails.size >= 3) break;

      } catch (error) {
        // Silently continue - page might not exist
      }
    }

    return Array.from(emails);
  }

  /**
   * Extract emails from HTML content
   */
  extractEmailsFromHtml(html, domain) {
    const emails = new Set();

    // Load HTML with cheerio
    const $ = cheerio.load(html);

    // Method 1: Find mailto: links
    $('a[href^="mailto:"]').each((i, el) => {
      const href = $(el).attr('href');
      const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (this.isValidEmail(email)) {
        emails.add(email);
      }
    });

    // Method 2: Regex search in text content
    const text = $.text() + ' ' + $.html();
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];

    matches.forEach(email => {
      email = email.toLowerCase();
      // Filter out common false positives
      if (this.isValidEmail(email) && !this.isJunkEmail(email)) {
        emails.add(email);
      }
    });

    // Method 3: Look for obfuscated emails (at) (dot)
    const obfuscatedRegex = /[a-zA-Z0-9._%+-]+\s*[\(\[]\s*at\s*[\)\]]\s*[a-zA-Z0-9.-]+\s*[\(\[]\s*dot\s*[\)\]]\s*[a-zA-Z]{2,}/gi;
    const obfuscatedMatches = text.match(obfuscatedRegex) || [];

    obfuscatedMatches.forEach(match => {
      const email = match
        .replace(/\s*[\(\[]\s*at\s*[\)\]]\s*/gi, '@')
        .replace(/\s*[\(\[]\s*dot\s*[\)\]]\s*/gi, '.')
        .toLowerCase();
      if (this.isValidEmail(email)) {
        emails.add(email);
      }
    });

    return Array.from(emails);
  }

  /**
   * Search Google for emails from domain
   */
  async searchGoogle(domain) {
    const emails = new Set();

    try {
      // Use Google search to find emails
      const searchQuery = encodeURIComponent(`"@${domain}" email`);
      const url = `https://www.google.com/search?q=${searchQuery}&num=20`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: this.timeout
      });

      // Extract emails from search results
      const foundEmails = this.extractEmailsFromHtml(response.data, domain);
      foundEmails.forEach(email => {
        // Only include emails from the target domain
        if (email.endsWith(`@${domain}`) || email.endsWith(`@www.${domain}`)) {
          emails.add(email);
        }
      });

    } catch (error) {
      console.log(`   ⚠️ Google search failed: ${error.message}`);
    }

    return Array.from(emails);
  }

  /**
   * Generate common email patterns
   */
  generateCommonPatterns(domain, companyName) {
    const patterns = [
      `hello@${domain}`,
      `contact@${domain}`,
      `info@${domain}`,
      `hi@${domain}`,
      `support@${domain}`,
      `team@${domain}`,
      `admin@${domain}`
    ];

    // Try to extract a name from company name
    const nameParts = companyName.toLowerCase().split(/\s+/);
    if (nameParts.length >= 2) {
      const firstName = nameParts[0].replace(/[^a-z]/g, '');
      if (firstName.length >= 2) {
        patterns.unshift(`${firstName}@${domain}`);
      }
    }

    return patterns;
  }

  /**
   * Select the best email from found emails
   */
  selectBestEmail(foundEmails, patterns, domain) {
    if (foundEmails.length === 0) {
      // No emails found - return best pattern guess
      return patterns[0] || null;
    }

    // Priority order for email selection
    const priority = ['hello', 'contact', 'info', 'hi', 'team', 'support'];

    // Check for priority emails first
    for (const prefix of priority) {
      const match = foundEmails.find(e => e.startsWith(`${prefix}@`));
      if (match) return match;
    }

    // Check for personal emails (not generic)
    const personalEmail = foundEmails.find(e => {
      const prefix = e.split('@')[0];
      return !['hello', 'contact', 'info', 'support', 'team', 'admin', 'noreply', 'no-reply'].includes(prefix);
    });
    if (personalEmail) return personalEmail;

    // Return first found email
    return foundEmails[0];
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Filter out junk/false positive emails
   */
  isJunkEmail(email) {
    const junkPatterns = [
      'example.com',
      'test.com',
      'email.com',
      'domain.com',
      'yourcompany.com',
      'company.com',
      'placeholder',
      'wixpress.com',
      'sentry.io',
      'googleapis.com',
      '.png',
      '.jpg',
      '.gif',
      '2x.png',
      '@2x',
      'schema.org'
    ];

    return junkPatterns.some(pattern => email.includes(pattern));
  }
}

module.exports = EmailFinder;
