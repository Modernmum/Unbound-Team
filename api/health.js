// Health check endpoint for Vercel deployment

module.exports = (req, res) => {
  res.status(200).json({
    name: 'Unbound.team API',
    status: 'running',
    version: '1.0.0',
    mission: 'Your Autonomous AI Team - Unbound from Big Tech',
    timestamp: new Date().toISOString(),
    platform: 'Vercel Serverless'
  });
};
