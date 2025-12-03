// GMP Maintenance Bot - Autonomous Site Monitor & Fixer
// Monitors Growth Manager Pro, detects issues, and fixes them automatically

require('dotenv').config();
const agentNetwork = require('./agent-network');

class GMPMaintenanceBot {
  constructor() {
    this.botId = 'gmp-maintenance-bot';
    this.name = 'GMP Maintenance Bot';

    // Configuration
    this.gmpUrl = process.env.GMP_URL || 'https://growthmanagerpro.com';
    this.gmpApiUrl = process.env.GMP_API_URL || 'https://growthmanagerpro.com/api';
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes

    // Issue tracking
    this.detectedIssues = [];
    this.fixedIssues = [];
    this.failedFixes = [];

    // Status
    this.isRunning = false;
    this.lastCheck = null;
    this.checksPerformed = 0;
  }

  // =========================================================================
  // BOT LIFECYCLE
  // =========================================================================

  /**
   * Start the maintenance bot
   */
  async start() {
    console.log(`\n🤖 ${this.name} Starting...`);

    // Register with agent network
    await this.registerWithNetwork();

    // Start monitoring
    this.isRunning = true;
    await this.monitorLoop();
  }

  /**
   * Stop the maintenance bot
   */
  async stop() {
    console.log(`\n🛑 ${this.name} Stopping...`);
    this.isRunning = false;
  }

  /**
   * Register with bot network
   */
  async registerWithNetwork() {
    try {
      await agentNetwork.registerBot({
        id: this.botId,
        name: this.name,
        type: 'maintenance-bot',
        capabilities: [
          'site-monitoring',
          'error-detection',
          'auto-fix',
          'testing',
          'health-checks',
          'database-maintenance'
        ],
        apiEndpoint: process.env.GMP_BOT_ENDPOINT || 'http://localhost:3000/api',
        apiKey: process.env.BOT_NETWORK_KEY
      });

      console.log('✅ Registered with agent network');
    } catch (error) {
      console.error('Failed to register with network:', error);
    }
  }

  // =========================================================================
  // MONITORING LOOP
  // =========================================================================

  /**
   * Main monitoring loop
   */
  async monitorLoop() {
    while (this.isRunning) {
      try {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`🔍 GMP Maintenance Check #${this.checksPerformed + 1}`);
        console.log(`Time: ${new Date().toLocaleString()}`);
        console.log('='.repeat(70));

        this.lastCheck = new Date();
        this.checksPerformed++;

        // Run all checks
        const results = await this.runAllChecks();

        // Detect issues
        const issues = this.detectIssues(results);

        // Try to fix issues
        if (issues.length > 0) {
          await this.fixIssues(issues);
        }

        // Report status
        await this.reportStatus(results, issues);

        // Wait before next check
        await this.sleep(this.checkInterval);

      } catch (error) {
        console.error('Error in monitoring loop:', error);
        await this.notifyError(error);
        await this.sleep(this.checkInterval);
      }
    }
  }

  // =========================================================================
  // HEALTH CHECKS
  // =========================================================================

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {
      timestamp: new Date(),
      checks: {}
    };

    console.log('\n📋 Running health checks...\n');

    // Check 1: Site availability
    results.checks.siteAvailability = await this.checkSiteAvailability();

    // Check 2: API endpoints
    results.checks.apiEndpoints = await this.checkApiEndpoints();

    // Check 3: Database connectivity
    results.checks.database = await this.checkDatabase();

    // Check 4: Page load times
    results.checks.performance = await this.checkPerformance();

    // Check 5: Frontend errors
    results.checks.frontendErrors = await this.checkFrontendErrors();

    // Check 6: Authentication
    results.checks.authentication = await this.checkAuthentication();

    // Check 7: Critical features
    results.checks.criticalFeatures = await this.checkCriticalFeatures();

    return results;
  }

  /**
   * Check if site is accessible
   */
  async checkSiteAvailability() {
    try {
      const response = await fetch(this.gmpUrl, {
        method: 'GET',
        timeout: 10000
      });

      const healthy = response.ok;

      console.log(`  ${healthy ? '✅' : '❌'} Site Availability: ${response.status}`);

      return {
        healthy,
        status: response.status,
        responseTime: response.headers.get('X-Response-Time')
      };
    } catch (error) {
      console.log(`  ❌ Site Availability: DOWN`);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check API endpoints
   */
  async checkApiEndpoints() {
    const endpoints = [
      '/api/health',
      '/api/clients',
      '/api/projects',
      '/api/tasks',
      '/api/reports'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${this.gmpApiUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.GMP_TEST_TOKEN}`
          },
          timeout: 5000
        });

        const healthy = response.ok;
        results.push({
          endpoint,
          healthy,
          status: response.status
        });

        console.log(`  ${healthy ? '✅' : '❌'} API ${endpoint}: ${response.status}`);

      } catch (error) {
        results.push({
          endpoint,
          healthy: false,
          error: error.message
        });
        console.log(`  ❌ API ${endpoint}: ERROR`);
      }
    }

    const allHealthy = results.every(r => r.healthy);
    return { healthy: allHealthy, endpoints: results };
  }

  /**
   * Check database connectivity
   */
  async checkDatabase() {
    try {
      // Try a simple database query
      const response = await fetch(`${this.gmpApiUrl}/health/db`, {
        method: 'GET',
        timeout: 5000
      });

      const healthy = response.ok;
      console.log(`  ${healthy ? '✅' : '❌'} Database: ${healthy ? 'Connected' : 'Failed'}`);

      return {
        healthy,
        status: response.status
      };
    } catch (error) {
      console.log(`  ❌ Database: ERROR`);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check performance (page load times)
   */
  async checkPerformance() {
    try {
      const startTime = Date.now();
      const response = await fetch(this.gmpUrl, {
        method: 'GET',
        timeout: 30000
      });
      const loadTime = Date.now() - startTime;

      const healthy = loadTime < 3000; // Under 3 seconds is good

      console.log(`  ${healthy ? '✅' : '⚠️'} Performance: ${loadTime}ms`);

      return {
        healthy,
        loadTime,
        threshold: 3000
      };
    } catch (error) {
      console.log(`  ❌ Performance: ERROR`);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check for frontend JavaScript errors
   */
  async checkFrontendErrors() {
    try {
      // TODO: Implement browser automation to check console errors
      // For now, check if main JS file loads
      const response = await fetch(`${this.gmpUrl}/main.js`, {
        method: 'HEAD',
        timeout: 5000
      });

      const healthy = response.ok;
      console.log(`  ${healthy ? '✅' : '❌'} Frontend Assets: ${healthy ? 'OK' : 'Missing'}`);

      return {
        healthy,
        status: response.status
      };
    } catch (error) {
      console.log(`  ❌ Frontend Assets: ERROR`);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check authentication system
   */
  async checkAuthentication() {
    try {
      // Try to login with test credentials
      const response = await fetch(`${this.gmpApiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.GMP_TEST_EMAIL,
          password: process.env.GMP_TEST_PASSWORD
        }),
        timeout: 5000
      });

      const healthy = response.ok;
      console.log(`  ${healthy ? '✅' : '❌'} Authentication: ${healthy ? 'Working' : 'Failed'}`);

      return {
        healthy,
        status: response.status
      };
    } catch (error) {
      console.log(`  ❌ Authentication: ERROR`);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check critical features
   */
  async checkCriticalFeatures() {
    const features = [
      { name: 'Client Dashboard', path: '/dashboard' },
      { name: 'Project Management', path: '/projects' },
      { name: 'Task Management', path: '/tasks' },
      { name: 'Reports', path: '/reports' }
    ];

    const results = [];

    for (const feature of features) {
      try {
        const response = await fetch(`${this.gmpUrl}${feature.path}`, {
          method: 'GET',
          timeout: 5000
        });

        const healthy = response.ok;
        results.push({
          feature: feature.name,
          healthy,
          status: response.status
        });

        console.log(`  ${healthy ? '✅' : '❌'} ${feature.name}: ${healthy ? 'OK' : 'Failed'}`);

      } catch (error) {
        results.push({
          feature: feature.name,
          healthy: false,
          error: error.message
        });
        console.log(`  ❌ ${feature.name}: ERROR`);
      }
    }

    const allHealthy = results.every(r => r.healthy);
    return { healthy: allHealthy, features: results };
  }

  // =========================================================================
  // ISSUE DETECTION
  // =========================================================================

  /**
   * Detect issues from check results
   */
  detectIssues(results) {
    const issues = [];

    // Check each result
    Object.entries(results.checks).forEach(([checkName, checkResult]) => {
      if (!checkResult.healthy) {
        issues.push({
          type: checkName,
          severity: this.getSeverity(checkName),
          details: checkResult,
          detectedAt: new Date(),
          status: 'detected'
        });
      }
    });

    if (issues.length > 0) {
      console.log(`\n⚠️  Detected ${issues.length} issue(s)`);
      issues.forEach(issue => {
        console.log(`  - ${issue.type}: ${issue.severity}`);
      });
    } else {
      console.log('\n✅ No issues detected');
    }

    this.detectedIssues.push(...issues);

    return issues;
  }

  /**
   * Determine severity of issue
   */
  getSeverity(checkType) {
    const severityMap = {
      siteAvailability: 'critical',
      database: 'critical',
      authentication: 'high',
      apiEndpoints: 'high',
      criticalFeatures: 'medium',
      performance: 'low',
      frontendErrors: 'medium'
    };

    return severityMap[checkType] || 'medium';
  }

  // =========================================================================
  // AUTO-FIX
  // =========================================================================

  /**
   * Attempt to fix detected issues
   */
  async fixIssues(issues) {
    console.log(`\n🔧 Attempting to fix ${issues.length} issue(s)...\n`);

    for (const issue of issues) {
      try {
        const fixed = await this.attemptFix(issue);

        if (fixed) {
          console.log(`  ✅ Fixed: ${issue.type}`);
          this.fixedIssues.push({
            ...issue,
            fixedAt: new Date(),
            status: 'fixed'
          });
        } else {
          console.log(`  ❌ Could not fix: ${issue.type}`);
          this.failedFixes.push({
            ...issue,
            attemptedAt: new Date(),
            status: 'failed'
          });
        }

      } catch (error) {
        console.log(`  ❌ Error fixing ${issue.type}:`, error.message);
        this.failedFixes.push({
          ...issue,
          error: error.message,
          status: 'error'
        });
      }
    }
  }

  /**
   * Attempt to fix a specific issue
   */
  async attemptFix(issue) {
    console.log(`  🔧 Fixing: ${issue.type}...`);

    switch (issue.type) {
      case 'siteAvailability':
        return await this.fixSiteAvailability(issue);

      case 'database':
        return await this.fixDatabase(issue);

      case 'apiEndpoints':
        return await this.fixApiEndpoints(issue);

      case 'performance':
        return await this.fixPerformance(issue);

      case 'authentication':
        return await this.fixAuthentication(issue);

      case 'criticalFeatures':
        return await this.fixCriticalFeatures(issue);

      default:
        console.log(`    ℹ️  No auto-fix available for ${issue.type}`);
        return false;
    }
  }

  async fixSiteAvailability(issue) {
    // Try to restart the service (if we have access)
    // For now, just notify admin
    await this.notifyAdmin({
      type: 'critical',
      issue: 'Site is down',
      action: 'Manual intervention required'
    });
    return false;
  }

  async fixDatabase(issue) {
    // Try to reconnect database
    // This would depend on your DB setup
    await this.notifyAdmin({
      type: 'critical',
      issue: 'Database connection failed',
      action: 'Check database status'
    });
    return false;
  }

  async fixApiEndpoints(issue) {
    // Check if it's a temporary issue
    await this.sleep(5000); // Wait 5 seconds
    const recheck = await this.checkApiEndpoints();
    return recheck.healthy;
  }

  async fixPerformance(issue) {
    // Clear cache if possible
    console.log('    ℹ️  Performance issue detected, monitoring...');
    return false; // Can't auto-fix, need manual optimization
  }

  async fixAuthentication(issue) {
    // Verify test credentials are correct
    console.log('    ℹ️  Authentication issue, verifying credentials...');
    return false;
  }

  async fixCriticalFeatures(issue) {
    // Check if it's a temporary routing issue
    await this.sleep(5000);
    const recheck = await this.checkCriticalFeatures();
    return recheck.healthy;
  }

  // =========================================================================
  // REPORTING
  // =========================================================================

  /**
   * Report status to admin and bot network
   */
  async reportStatus(results, issues) {
    const summary = {
      timestamp: new Date(),
      checksPerformed: this.checksPerformed,
      issuesDetected: issues.length,
      issuesFixed: this.fixedIssues.length,
      issuesPending: this.failedFixes.length,
      overallHealth: issues.length === 0 ? 'healthy' : 'issues-detected'
    };

    console.log(`\n📊 Status Report:`);
    console.log(`  Overall Health: ${summary.overallHealth}`);
    console.log(`  Issues Detected: ${summary.issuesDetected}`);
    console.log(`  Issues Fixed: ${summary.issuesFixed}`);
    console.log(`  Issues Pending: ${summary.issuesPending}`);

    // Send to bot network
    try {
      await agentNetwork.shareKnowledge(this.botId, {
        topic: 'gmp-health',
        content: summary,
        summary: `GMP Health: ${summary.overallHealth}`,
        tags: ['gmp', 'monitoring', 'health-check']
      });
    } catch (error) {
      console.error('Failed to share knowledge:', error);
    }

    // Notify if critical issues
    if (issues.some(i => i.severity === 'critical')) {
      await this.notifyAdmin({
        type: 'critical',
        issues: issues.filter(i => i.severity === 'critical')
      });
    }
  }

  /**
   * Notify admin of issues
   */
  async notifyAdmin(notification) {
    console.log(`\n🚨 ADMIN NOTIFICATION:`);
    console.log(JSON.stringify(notification, null, 2));

    // TODO: Send email/Discord/Slack notification
    // For now, just log it
  }

  /**
   * Notify about errors
   */
  async notifyError(error) {
    console.error(`\n❌ BOT ERROR:`, error);
    await this.notifyAdmin({
      type: 'bot-error',
      error: error.message,
      stack: error.stack
    });
  }

  // =========================================================================
  // BOT-TO-BOT COMMUNICATION
  // =========================================================================

  /**
   * Request help from Unbound Bot
   */
  async requestHelpFromUnbound(task) {
    try {
      const response = await agentNetwork.sendMessage({
        from: this.botId,
        to: 'unbound-autonomous-agent',
        type: 'request',
        payload: {
          task: task.description,
          context: task.context,
          urgency: task.urgency || 'medium'
        }
      });

      return response;
    } catch (error) {
      console.error('Failed to request help from Unbound:', error);
      return { success: false, error: error.message };
    }
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get bot statistics
   */
  getStats() {
    return {
      botId: this.botId,
      name: this.name,
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      checksPerformed: this.checksPerformed,
      detectedIssues: this.detectedIssues.length,
      fixedIssues: this.fixedIssues.length,
      failedFixes: this.failedFixes.length,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }
}

// Export singleton instance
const gmpBot = new GMPMaintenanceBot();

module.exports = gmpBot;
