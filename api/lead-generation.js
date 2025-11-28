// Vercel Serverless Function for Lead Generation
const leadScraper = require('../backend/services/lead-scraper');

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

    // Execute lead generation (simplified for serverless)
    const leads = await leadScraper.findLeads({
      targetIndustry,
      location,
      criteria
    });

    const csv = leadScraper.exportToCSV(leads);

    res.status(200).json({
      success: true,
      leadsFound: leads.length,
      leads: leads.slice(0, 10), // Return first 10
      csv: csv,
      summary: {
        totalFound: leads.length,
        avgFitScore: leads.reduce((sum, l) => sum + (l.fitScore || 0), 0) / leads.length,
        sources: [...new Set(leads.map(l => l.source))]
      }
    });

  } catch (error) {
    console.error('Lead generation error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
