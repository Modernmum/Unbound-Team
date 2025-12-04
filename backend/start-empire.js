// ============================================
// EMPIRE STARTER - Runs AGI + Queue Worker
// ============================================
// Starts the complete autonomous system:
// 1. Empire AGI Brain (makes decisions, queues jobs)
// 2. Queue Worker (processes jobs)

// Load environment variables
require('dotenv').config();

const empireAGI = require('./services/empire-agi-brain');
const queueWorker = require('./services/queue-worker');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              🧠 EMPIRE AGI COMPLETE SYSTEM                    ║
║                                                               ║
║     One AGI → Two Businesses → Complete Automation           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

🚀 Starting Components:
   1. Empire AGI Brain (decision making)
   2. Queue Worker (job processing)

📊 Monitoring:
   • Maggie Forbes Strategies (Goal: $250K/month)
   • Growth Manager Pro (Goal: $60K/month MRR)

🎯 Lead Generation:
   • Maggie Forbes: Premium Executive Finder
   • Growth Manager Pro: Standard Lead Scraper

=================================================================
`);

// Start queue worker first
console.log('⚙️  Starting Queue Worker...');
queueWorker.start();

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down Empire AGI system...');
  await empireAGI.stop();
  queueWorker.stop();
  console.log('✅ Empire AGI system stopped gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down Empire AGI system...');
  await empireAGI.stop();
  queueWorker.stop();
  console.log('✅ Empire AGI system stopped gracefully');
  process.exit(0);
});

// Start Empire AGI
console.log('🧠 Starting Empire AGI Brain...\n');
console.log('✅ Empire AGI system fully operational!\n');

empireAGI.run().catch(error => {
  console.error('❌ Fatal error:', error);
  queueWorker.stop();
  process.exit(1);
});
