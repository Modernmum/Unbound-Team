#!/usr/bin/env node

/**
 * Unbound-Team Production Capacity Test
 * Tests all endpoints and services for full production readiness
 */

const https = require('https');
const http = require('http');

const API_BASE = 'https://web-production-486cb.up.railway.app';

// Color output for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function request(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const protocol = urlObj.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  log('\n🚀 UNBOUND-TEAM PRODUCTION CAPACITY TEST\n', 'cyan');
  log('═'.repeat(60), 'cyan');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  // Test 1: Health Check
  log('\n📊 TEST 1: Backend Health Check', 'blue');
  try {
    const res = await request(`${API_BASE}/health`);
    if (res.status === 200 && res.data.status === 'healthy') {
      log('✅ Backend is healthy', 'green');
      log(`   Services: ${res.data.servicesLoaded}`, 'green');
      log(`   Platform: ${res.data.platform}`, 'green');
      log(`   Version: ${res.data.version}`, 'green');

      // Check env vars
      const envVars = res.data.envVarsSet;
      const allSet = Object.values(envVars).every(v => v === true);
      if (allSet) {
        log('✅ All environment variables configured', 'green');
      } else {
        log('⚠️  Some environment variables missing:', 'yellow');
        Object.entries(envVars).forEach(([key, val]) => {
          if (!val) log(`   - ${key}`, 'yellow');
        });
        results.warnings++;
      }
      results.passed++;
    } else {
      log('❌ Backend health check failed', 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Health Check', status: res.status === 200 ? 'pass' : 'fail' });
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Health Check', status: 'fail' });
  }

  // Test 2: Get Opportunities
  log('\n🎯 TEST 2: Opportunities API', 'blue');
  try {
    const res = await request(`${API_BASE}/api/opportunities?limit=10`);
    if (res.status === 200 && res.data.success) {
      const count = res.data.opportunities.length;
      log(`✅ Opportunities API working: ${count} opportunities found`, 'green');
      if (count > 0) {
        const opp = res.data.opportunities[0];
        log(`   Latest: ${opp.title || opp.opportunity_text || 'N/A'}`, 'cyan');
        log(`   Score: ${opp.fit_score || opp.score || 'N/A'}`, 'cyan');
      } else {
        log('⚠️  No opportunities in database (run discovery to populate)', 'yellow');
        results.warnings++;
      }
      results.passed++;
    } else {
      log('❌ Opportunities API failed', 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Opportunities API', status: res.status === 200 ? 'pass' : 'fail' });
  } catch (error) {
    log(`❌ Opportunities API error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Opportunities API', status: 'fail' });
  }

  // Test 3: Email Stats
  log('\n📧 TEST 3: Email Stats API', 'blue');
  try {
    const res = await request(`${API_BASE}/api/emails/stats`);
    if (res.status === 200 && res.data.success) {
      const stats = res.data.stats;
      log('✅ Email Stats API working', 'green');
      log(`   Total Sent: ${stats.totalSent}`, 'cyan');
      log(`   Sent Today: ${stats.sentToday}`, 'cyan');
      log(`   Open Rate: ${stats.openRate}%`, 'cyan');
      log(`   Reply Rate: ${stats.replyRate}%`, 'cyan');
      log(`   Conversions: ${stats.conversions}`, 'cyan');
      results.passed++;
    } else {
      log('❌ Email Stats API failed', 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Email Stats API', status: res.status === 200 ? 'pass' : 'fail' });
  } catch (error) {
    log(`❌ Email Stats API error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Email Stats API', status: 'fail' });
  }

  // Test 4: Get Emails
  log('\n📬 TEST 4: Emails API', 'blue');
  try {
    const res = await request(`${API_BASE}/api/emails`);
    if (res.status === 200 && res.data.success) {
      const count = res.data.emails.length;
      log(`✅ Emails API working: ${count} emails found`, 'green');
      if (count > 0) {
        const email = res.data.emails[0];
        log(`   Latest: ${email.subject || 'N/A'}`, 'cyan');
        log(`   Status: ${email.status || 'N/A'}`, 'cyan');
      }
      results.passed++;
    } else {
      log('❌ Emails API failed', 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Emails API', status: res.status === 200 ? 'pass' : 'fail' });
  } catch (error) {
    log(`❌ Emails API error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Emails API', status: 'fail' });
  }

  // Test 5: Agent Status - Gap Finder
  log('\n🤖 TEST 5: Agent Status - Gap Finder', 'blue');
  try {
    const res = await request(`${API_BASE}/api/agents/gap-finder/status`);
    if (res.status === 200 && res.data.success) {
      log('✅ Gap Finder agent API working', 'green');
      log(`   Status: ${res.data.status}`, 'cyan');
      log(`   Last Run: ${res.data.lastRun || 'Never'}`, 'cyan');
      log(`   Opportunities Found: ${res.data.opportunitiesFound || 0}`, 'cyan');
      results.passed++;
    } else {
      log('❌ Gap Finder agent status failed', 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Gap Finder Status', status: res.status === 200 ? 'pass' : 'fail' });
  } catch (error) {
    log(`❌ Gap Finder status error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Gap Finder Status', status: 'fail' });
  }

  // Test 6: Agent Status - Auto Outreach
  log('\n📨 TEST 6: Agent Status - Auto Outreach', 'blue');
  try {
    const res = await request(`${API_BASE}/api/agents/auto-outreach/status`);
    if (res.status === 200 && res.data.success) {
      log('✅ Auto Outreach agent API working', 'green');
      log(`   Status: ${res.data.status}`, 'cyan');
      log(`   Last Run: ${res.data.lastRun || 'Never'}`, 'cyan');
      log(`   Emails Sent: ${res.data.emailsSent || 0}`, 'cyan');
      results.passed++;
    } else {
      log('❌ Auto Outreach agent status failed', 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Auto Outreach Status', status: res.status === 200 ? 'pass' : 'fail' });
  } catch (error) {
    log(`❌ Auto Outreach status error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Auto Outreach Status', status: 'fail' });
  }

  // Test 7: Agent Status - Auto Delivery
  log('\n🚚 TEST 7: Agent Status - Auto Delivery', 'blue');
  try {
    const res = await request(`${API_BASE}/api/agents/auto-delivery/status`);
    if (res.status === 200 && res.data.success) {
      log('✅ Auto Delivery agent API working', 'green');
      log(`   Status: ${res.data.status}`, 'cyan');
      log(`   Last Run: ${res.data.lastRun || 'Never'}`, 'cyan');
      log(`   Deliveries Completed: ${res.data.deliveriesCompleted || 0}`, 'cyan');
      results.passed++;
    } else {
      log('❌ Auto Delivery agent status failed', 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Auto Delivery Status', status: res.status === 200 ? 'pass' : 'fail' });
  } catch (error) {
    log(`❌ Auto Delivery status error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Auto Delivery Status', status: 'fail' });
  }

  // Test 8: RSS Discovery (Production Test - Will create real data)
  log('\n📡 TEST 8: RSS Discovery System', 'blue');
  log('⚠️  This will scan live RSS feeds and create real opportunities', 'yellow');
  try {
    const res = await request(`${API_BASE}/api/scan-rss`, 'POST');
    if (res.status === 200 && res.data.success) {
      log('✅ RSS Discovery working', 'green');
      log(`   Opportunities Discovered: ${res.data.opportunities}`, 'cyan');
      if (res.data.results && res.data.results.length > 0) {
        log(`   Sample: ${res.data.results[0].title || res.data.results[0].opportunity_text}`, 'cyan');
      }
      results.passed++;
    } else {
      log('❌ RSS Discovery failed', 'red');
      log(`   Error: ${res.data.error || 'Unknown'}`, 'red');
      results.failed++;
    }
    results.tests.push({ name: 'RSS Discovery', status: res.status === 200 ? 'pass' : 'fail' });
  } catch (error) {
    log(`❌ RSS Discovery error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'RSS Discovery', status: 'fail' });
  }

  // Final Summary
  log('\n' + '═'.repeat(60), 'cyan');
  log('\n📊 PRODUCTION CAPACITY TEST RESULTS\n', 'cyan');

  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  log(`Total Tests: ${total}`, 'blue');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`⚠️  Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');
  log(`\nPass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red');

  if (passRate >= 80) {
    log('\n🎉 PRODUCTION READY - All critical systems operational!', 'green');
  } else if (passRate >= 60) {
    log('\n⚠️  PARTIAL CAPACITY - Some systems need attention', 'yellow');
  } else {
    log('\n❌ NOT PRODUCTION READY - Critical failures detected', 'red');
  }

  log('\n' + '═'.repeat(60), 'cyan');

  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});
