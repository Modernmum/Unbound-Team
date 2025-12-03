// API Endpoint: Register a new bot in the network
// POST /api/bot-register

require('dotenv').config();
const agentNetwork = require('../services/agent-network');

module.exports = async (req, res) => {
  try {
    // Authenticate with master key
    const masterKey = req.headers['x-master-key'];

    if (!masterKey || masterKey !== process.env.MASTER_BOT_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid master key'
      });
    }

    const { name, type, capabilities, apiEndpoint, apiKey } = req.body;

    // Validate required fields
    if (!name || !type || !capabilities || !apiEndpoint || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, capabilities, apiEndpoint, apiKey'
      });
    }

    // Register the bot
    const result = await agentNetwork.registerBot({
      name,
      type,
      capabilities,
      apiEndpoint,
      apiKey
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    console.log(`✅ New bot registered: ${name}`);

    res.json({
      success: true,
      message: 'Bot registered successfully',
      botId: result.bot.id,
      bot: result.bot
    });

  } catch (error) {
    console.error('Error registering bot:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
