#!/usr/bin/env node
// Test Suite for GMP Maintenance Bot

require('dotenv').config();
const gmpBot = require('../services/gmp-maintenance-bot');

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 GMP MAINTENANCE BOT TEST SUITE');
  console.log('='.repeat(70));

  try {
    // Test 1: Bot Registration
    console.log('\n📝 Test 1: Bot Registration');
    await gmpBot.registerWithNetwork();
    console.log('✅ Bot registered successfully');

    // Test 2: Health Checks
    console.log('\n📝 Test 2: Running Health Checks');
    const results = await gmpBot.runAllChecks();
    console.log('✅ Health checks completed');
    console.log('Results:', JSON.stringify(results, null, 2));

    // Test 3: Issue Detection
    console.log('\n📝 Test 3: Issue Detection');
    const issues = gmpBot.detectIssues(results);
    console.log(`✅ Detected ${issues.length} issue(s)`);

    // Test 4: Auto-Fix (if issues found)
    if (issues.length > 0) {
      console.log('\n📝 Test 4: Auto-Fix Attempts');
      await gmpBot.fixIssues(issues);
      console.log('✅ Auto-fix attempts completed');
    }

    // Test 5: Status Report
    console.log('\n📝 Test 5: Status Reporting');
    await gmpBot.reportStatus(results, issues);
    console.log('✅ Status report generated');

    // Test 6: Bot Stats
    console.log('\n📝 Test 6: Bot Statistics');
    const stats = gmpBot.getStats();
    console.log('Bot Stats:', JSON.stringify(stats, null, 2));
    console.log('✅ Stats retrieved');

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(70) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
