// API Endpoint: Get bot network status
// GET /api/bot-network-status

require('dotenv').config();
const agentNetwork = require('../services/agent-network');

module.exports = async (req, res) => {
  try {
    // Authenticate
    const auth = req.headers['x-bot-auth'] || req.query.apiKey;

    if (!auth || (auth !== process.env.BOT_NETWORK_KEY && auth !== process.env.MASTER_BOT_KEY)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get network statistics
    const stats = await agentNetwork.getNetworkStats();

    // Get all active bots
    const activeBots = await agentNetwork.getActiveBots();

    // Run health check on all bots
    const healthStatus = await agentNetwork.healthCheck();

    res.json({
      success: true,
      network: {
        stats,
        activeBots: activeBots.map(bot => ({
          id: bot.id,
          name: bot.name,
          type: bot.type,
          capabilities: bot.capabilities,
          status: bot.status,
          lastSeen: bot.lastSeen
        })),
        health: healthStatus
      }
    });

  } catch (error) {
    console.error('Error getting network status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
