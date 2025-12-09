const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');

class RSSMonitor {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    this.parser = new Parser();

    this.feeds = [
      'https://www.indiehackers.com/feed',
      'https://news.ycombinator.com/rss',
      'https://www.entrepreneur.com/latest.rss',
      'https://techcrunch.com/feed/'
    ];
  }

  async scanAllFeeds() {
    console.log('🔍 Scanning RSS feeds for opportunities...');
    const opportunities = [];

    try {
      for (const feedUrl of this.feeds) {
        try {
          console.log(`📡 Fetching ${feedUrl}...`);
          const feed = await this.parser.parseURL(feedUrl);

          // Analyze recent items (last 10)
          const recentItems = feed.items.slice(0, 10);

          for (const item of recentItems) {
            const opportunity = this.analyzeItem(item, feed.title);
            if (opportunity) {
              // Save to database
              const { data, error } = await this.supabase
                .from('scored_opportunities')
                .insert({
                  company_name: opportunity.source,
                  company_domain: this.extractDomain(item.link),
                  overall_score: opportunity.fit_score * 10,
                  signal_strength_score: 80,
                  route_to_outreach: opportunity.fit_score >= 7,
                  priority_tier: opportunity.fit_score >= 8 ? 'tier_1' : 'tier_2'
                })
                .select();

              if (!error && data) {
                opportunities.push(data[0]);
              }
            }
          }
        } catch (error) {
          console.error(`Error parsing feed ${feedUrl}:`, error.message);
        }
      }

      console.log(`✅ Found ${opportunities.length} opportunities from RSS feeds`);
      return opportunities;
    } catch (error) {
      console.error('❌ RSS scan error:', error);
      return [];
    }
  }

  analyzeItem(item, sourceName) {
    const title = (item.title || '').toLowerCase();
    const content = (item.contentSnippet || item.content || '').toLowerCase();
    const text = title + ' ' + content;

    // Look for pain points and business needs
    const painKeywords = [
      'struggling', 'difficult', 'problem', 'issue', 'challenge',
      'need help', 'looking for', 'how to', 'cant figure',
      'frustrat', 'painful', 'slow', 'broken', 'fail'
    ];

    const businessKeywords = [
      'startup', 'business', 'saas', 'company', 'revenue',
      'customer', 'marketing', 'sales', 'growth', 'scale'
    ];

    let painScore = 0;
    let businessScore = 0;

    painKeywords.forEach(keyword => {
      if (text.includes(keyword)) painScore++;
    });

    businessKeywords.forEach(keyword => {
      if (text.includes(keyword)) businessScore++;
    });

    // Only return if there's both pain and business context
    if (painScore > 0 && businessScore > 0) {
      const fitScore = Math.min(10, painScore + businessScore);

      return {
        title: item.title,
        source: sourceName,
        url: item.link,
        pain_point: this.extractPainPoint(text),
        business_area: this.detectBusinessArea(text),
        urgency: painScore >= 2 ? 'high' : 'medium',
        fit_score: fitScore
      };
    }

    return null;
  }

  extractPainPoint(text) {
    if (text.includes('struggling')) return 'Facing operational challenges';
    if (text.includes('need help')) return 'Seeking assistance';
    if (text.includes('looking for')) return 'Actively searching for solutions';
    if (text.includes('how to')) return 'Knowledge gap';
    return 'General business challenge';
  }

  detectBusinessArea(text) {
    if (text.includes('marketing') || text.includes('customer acquisition')) return 'marketing';
    if (text.includes('sales') || text.includes('revenue')) return 'sales';
    if (text.includes('product') || text.includes('development')) return 'product';
    if (text.includes('operations') || text.includes('workflow')) return 'operations';
    if (text.includes('growth') || text.includes('scale')) return 'growth';
    return 'general';
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown.com';
    }
  }

  async getRecentOpportunities(limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('scored_opportunities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching RSS opportunities:', error);
      return [];
    }
  }
}

module.exports = RSSMonitor;
