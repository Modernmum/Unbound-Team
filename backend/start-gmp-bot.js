#!/usr/bin/env node
// Start GMP Maintenance Bot
// Run this to start continuous monitoring of GMP

require('dotenv').config();
const gmpBot = require('./services/gmp-maintenance-bot');

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║          🤖 GMP MAINTENANCE BOT - STARTING UP 🤖              ║
║                                                                ║
║  Autonomous monitoring and maintenance for Growth Manager Pro  ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  console.log('Configuration:');
  console.log(`  GMP URL: ${process.env.GMP_URL || 'https://growthmanagerpro.com'}`);
  console.log(`  Check Interval: Every 5 minutes`);
  console.log(`  Auto-Fix: Enabled`);
  console.log(`  Bot Network: Connected\n`);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    await gmpBot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    await gmpBot.stop();
    process.exit(0);
  });

  // Start the bot
  try {
    await gmpBot.start();
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Run
main();
