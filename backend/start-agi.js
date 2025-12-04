#!/usr/bin/env node

// ============================================
// EMPIRE AGI - START SCRIPT
// ============================================
// Starts the Empire AGI Brain to run both businesses autonomously

require('dotenv').config();
const empireAGI = require('./services/empire-agi-brain');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              🧠 EMPIRE AGI SYSTEM - STARTING                  ║
║                                                               ║
║     One AGI → Two Businesses → Complete Automation           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

📊 Monitoring:
   • Maggie Forbes Strategies (Goal: $250K/month)
   • Growth Manager Pro (Goal: $60K/month MRR)

🎯 Capabilities:
   ✓ Autonomous lead generation
   ✓ Content creation & marketing
   ✓ Market research & analysis
   ✓ Strategy optimization
   ✓ Cross-business learning
   ✓ 24/7 execution & monitoring

⏰ Cycle: Every 1 hour
📡 Notifications: Discord (if configured)

${'='.repeat(65)}
`);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Empire AGI...');
  await empireAGI.stop();
  console.log('✅ Empire AGI stopped gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down Empire AGI...');
  await empireAGI.stop();
  console.log('✅ Empire AGI stopped gracefully');
  process.exit(0);
});

// Start the AGI
empireAGI.run().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
