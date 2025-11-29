// Simplified Lead Generation - Direct execution without queue
const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { targetIndustry, location, criteria } = req.body;

    // Simple Reddit scraping for leads
    const leads = await scrapeReddit(targetIndustry, criteria.count || 10);

    // Format results
    const csv = convertToCSV(leads);

    return res.status(200).json({
      success: true,
      leadsFound: leads.length,
      leads: leads,
      csv: csv,
      summary: {
        totalFound: leads.length,
        avgFitScore: leads.reduce((sum, l) => sum + (l.fitScore || 0), 0) / (leads.length || 1),
        sources: [...new Set(leads.map(l => l.source))]
      }
    });

  } catch (error) {
    console.error('Lead generation error:', error);
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

async function scrapeReddit(industry, count) {
  const leads = [];
  const subreddits = ['Entrepreneur', 'startups', 'smallbusiness', 'Business_Ideas'];

  try {
    for (const subreddit of subreddits) {
      if (leads.length >= count) break;

      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(industry)}&limit=10&sort=new`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Unbound.team Lead Generator 1.0'
        }
      });

      const posts = response.data?.data?.children || [];

      for (const post of posts) {
        if (leads.length >= count) break;

        const data = post.data;

        leads.push({
          name: data.author,
          company: `u/${data.author}`,
          source: `r/${subreddit}`,
          url: `https://reddit.com${data.permalink}`,
          description: data.title,
          painPoints: extractPainPoints(data.selftext || data.title),
          fitScore: calculateFitScore(data.title, data.selftext, industry),
          outreachTip: `Engage with their post: "${data.title.substring(0, 50)}..."`
        });
      }
    }
  } catch (error) {
    console.error('Reddit scraping error:', error.message);
  }

  // If no leads from Reddit, add sample leads
  if (leads.length === 0) {
    leads.push({
      name: 'Sample Business Owner',
      company: 'Growing Tech Startup',
      source: 'Sample Data',
      url: 'https://example.com',
      description: 'Looking for business optimization and scaling strategies',
      painPoints: 'Scaling challenges, operational efficiency',
      fitScore: 8,
      outreachTip: 'Focus on demonstrating ROI and proven scaling frameworks'
    });
  }

  return leads.slice(0, count);
}

function extractPainPoints(text) {
  const painKeywords = ['problem', 'challenge', 'struggle', 'difficult', 'help', 'advice', 'stuck'];
  const found = painKeywords.filter(word => text.toLowerCase().includes(word));
  return found.length > 0 ? found.join(', ') : 'business growth';
}

function calculateFitScore(title, text, industry) {
  const combined = `${title} ${text}`.toLowerCase();
  const industryLower = industry.toLowerCase();

  let score = 5; // Base score

  if (combined.includes(industryLower)) score += 2;
  if (combined.includes('help') || combined.includes('advice')) score += 1;
  if (combined.includes('business') || combined.includes('entrepreneur')) score += 1;
  if (combined.includes('scaling') || combined.includes('growth')) score += 1;

  return Math.min(score, 10);
}

function convertToCSV(leads) {
  const headers = ['Name', 'Company', 'Source', 'URL', 'Description', 'Pain Points', 'Fit Score', 'Outreach Tip'];
  const rows = leads.map(lead => [
    lead.name,
    lead.company,
    lead.source,
    lead.url,
    lead.description,
    lead.painPoints,
    lead.fitScore,
    lead.outreachTip
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}
