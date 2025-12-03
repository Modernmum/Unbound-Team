// API Endpoint: GMP Bot receives commands and reports status
// POST /api/gmp-bot-webhook

require('dotenv').config();
const gmpBot = require('../services/gmp-maintenance-bot');
const gmpAutoFixer = require('../services/gmp-auto-fixer');
const agentNetwork = require('../services/agent-network');

module.exports = async (req, res) => {
  try {
    // Authenticate
    const auth = req.headers['x-bot-auth'];

    if (!auth || auth !== process.env.BOT_NETWORK_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const { command, params } = req.body;

    console.log(`\n📨 GMP Bot Command: ${command}`);

    let result;

    switch (command) {
      case 'status':
        result = gmpBot.getStats();
        break;

      case 'check-health':
        result = await gmpBot.runAllChecks();
        break;

      case 'fix-issues':
        result = await gmpAutoFixer.runAllFixes();
        break;

      case 'request-help':
        result = await gmpBot.requestHelpFromUnbound(params);
        break;

      case 'report':
        result = await gmpBot.reportStatus(
          params.results,
          params.issues
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown command: ${command}`
        });
    }

    res.json({
      success: true,
      command,
      result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error processing GMP bot command:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
