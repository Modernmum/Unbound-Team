// Bot Testing Service - Connects User Persona Bot to Engineering Bot
// When client requests a fix, engineering bot handles it automatically

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const botUserPersona = require('./bot-user-persona');
const gmpAutoFixer = require('./gmp-auto-fixer');
const agentNetwork = require('./agent-network');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class BotTestingService {
  constructor() {
    this.serviceName = 'Bot Testing Service';
  }

  // =========================================================================
  // RUN TESTS FOR CLIENT
  // =========================================================================

  /**
   * Run bot test for a client
   */
  async runClientTest(clientId) {
    console.log(`\n🧪 Running test for client: ${clientId}`);

    // Get client configuration
    const { data: client, error } = await supabase
      .from('testing_clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error || !client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    console.log(`  Client: ${client.client_name}`);
    console.log(`  Site: ${client.site_url}`);
    console.log(`  Personas: ${client.personas_to_test.join(', ')}`);

    // Set site URL for testing
    process.env.GMP_URL = client.site_url;

    const results = [];

    // Run test for each configured persona
    for (const persona of client.personas_to_test) {
      console.log(`\n  🎭 Testing as: ${persona}`);

      try {
        // Run user journey simulation
        const experience = await botUserPersona.simulateUserJourney(persona);

        // Save results to database
        const testResult = await this.saveTestResult(client, experience);

        // Save individual issues
        await this.saveIssues(client, testResult, experience.issues);

        // Send notifications if needed
        await this.sendNotifications(client, testResult, experience);

        results.push({
          persona,
          success: true,
          rating: experience.overallRating,
          issues: experience.issues.length
        });

      } catch (error) {
        console.error(`  ❌ Test failed for ${persona}:`, error.message);
        results.push({
          persona,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`\n✅ Tests complete for ${client.client_name}`);

    return results;
  }

  /**
   * Save test result to database
   */
  async saveTestResult(client, experience) {
    const { data, error } = await supabase
      .from('bot_test_results')
      .insert({
        client_id: client.id,
        persona_used: experience.persona.toLowerCase().replace(/\s+/g, ''),
        persona_name: experience.persona,
        persona_role: experience.role,
        overall_rating: experience.overallRating,
        would_recommend: experience.wouldRecommend,
        test_duration_minutes: experience.duration,
        steps_completed: experience.steps,
        total_steps: experience.steps.length,
        successful_steps: experience.steps.filter(s => s.success).length,
        failed_steps: experience.steps.filter(s => !s.success).length,
        issues_found: experience.issues,
        critical_issues: experience.issues.filter(i => i.severity === 'critical').length,
        high_issues: experience.issues.filter(i => i.severity === 'high').length,
        medium_issues: experience.issues.filter(i => i.severity === 'medium').length,
        low_issues: experience.issues.filter(i => i.severity === 'low').length,
        positive_experiences: experience.positives,
        suggestions: experience.suggestions,
        full_report: botUserPersona.generateReport(experience)
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save test result:', error);
      throw error;
    }

    return data;
  }

  /**
   * Save issues to database
   */
  async saveIssues(client, testResult, issues) {
    for (const issue of issues) {
      // Check if issue can be auto-fixed
      const canAutoFix = this.canEngineeringBotFix(issue);

      await supabase
        .from('bot_test_issues')
        .insert({
          client_id: client.id,
          test_result_id: testResult.id,
          severity: issue.severity,
          issue_type: this.categorizeIssue(issue),
          description: issue.description,
          step_name: issue.step,
          screenshot_url: issue.screenshot,
          can_auto_fix: canAutoFix,
          status: 'open'
        });
    }
  }

  /**
   * Check if engineering bot can fix this issue
   */
  canEngineeringBotFix(issue) {
    const autoFixableIssues = [
      'orphaned records',
      'database',
      'slow query',
      'old data',
      'stuck session',
      'failed job',
      'cache',
      'broken asset'
    ];

    return autoFixableIssues.some(fixable =>
      issue.description.toLowerCase().includes(fixable)
    );
  }

  /**
   * Categorize issue type
   */
  categorizeIssue(issue) {
    const description = issue.description.toLowerCase();

    if (description.includes('load') || description.includes('slow')) return 'performance';
    if (description.includes('button') || description.includes('click')) return 'broken-ui';
    if (description.includes('form') || description.includes('validation')) return 'form-error';
    if (description.includes('redirect') || description.includes('navigation')) return 'navigation';
    if (description.includes('database') || description.includes('query')) return 'database';
    if (description.includes('api') || description.includes('endpoint')) return 'api-error';

    return 'other';
  }

  /**
   * Send notifications to client
   */
  async sendNotifications(client, testResult, experience) {
    // Critical issues = immediate notification
    const criticalIssues = experience.issues.filter(i => i.severity === 'critical');

    if (criticalIssues.length > 0) {
      await supabase
        .from('client_notifications')
        .insert({
          client_id: client.id,
          related_test_id: testResult.id,
          notification_type: 'issue-found',
          severity: 'critical',
          title: `${criticalIssues.length} Critical Issue(s) Found`,
          message: `Bot testing found ${criticalIssues.length} critical issue(s) on your site:\n\n${criticalIssues.map(i => `• ${i.description}`).join('\n')}`,
          sent_via_email: true,
          sent_via_dashboard: true
        });

      // Send email
      await this.sendEmail(client, {
        subject: '🚨 Critical Issues Found on Your Site',
        body: `Hi ${client.client_name},\n\nOur bot just tested your site and found ${criticalIssues.length} critical issue(s) that need immediate attention:\n\n${criticalIssues.map(i => `• ${i.description}`).join('\n')}\n\nView details: ${process.env.DASHBOARD_URL}?token=${client.dashboard_token}\n\n${client.engineering_bot_access ? 'You can request automatic fixes from your dashboard.' : ''}`
      });
    }

    // Test complete notification
    await supabase
      .from('client_notifications')
      .insert({
        client_id: client.id,
        related_test_id: testResult.id,
        notification_type: 'test-complete',
        severity: 'info',
        title: 'UX Test Complete',
        message: `Test completed as "${experience.persona}". Rating: ${experience.overallRating}/10. Found ${experience.issues.length} issue(s).`,
        sent_via_dashboard: true
      });
  }

  // =========================================================================
  // CLIENT REQUESTS FIX FROM ENGINEERING BOT
  // =========================================================================

  /**
   * Client clicks "Fix This" button in their dashboard
   */
  async requestFix(clientId, issueId, priority = 'medium') {
    console.log(`\n🔧 Fix requested by client: ${clientId} for issue: ${issueId}`);

    // Get client
    const { data: client } = await supabase
      .from('testing_clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (!client.engineering_bot_access) {
      return {
        success: false,
        error: 'Engineering bot access not enabled for this client'
      };
    }

    // Get issue details
    const { data: issue } = await supabase
      .from('bot_test_issues')
      .select('*')
      .eq('id', issueId)
      .single();

    if (!issue) {
      return {
        success: false,
        error: 'Issue not found'
      };
    }

    // Create fix request
    const { data: fixRequest } = await supabase
      .from('bot_fix_requests')
      .insert({
        client_id: clientId,
        issue_id: issueId,
        request_type: issue.can_auto_fix ? 'auto-fix' : 'analysis',
        priority,
        status: 'pending'
      })
      .select()
      .single();

    // Send to engineering bot via bot network
    console.log(`  📨 Sending fix request to engineering bot...`);

    const botResponse = await agentNetwork.sendMessage({
      from: 'bot-testing-service',
      to: 'gmp-maintenance-bot',
      type: 'request',
      payload: {
        task: 'fix-issue',
        context: {
          clientName: client.client_name,
          siteUrl: client.site_url,
          issue: {
            severity: issue.severity,
            type: issue.issue_type,
            description: issue.description,
            screenshot: issue.screenshot_url
          },
          priority
        }
      }
    });

    // Update fix request with bot response
    await supabase
      .from('bot_fix_requests')
      .update({
        status: 'in-progress',
        started_at: new Date(),
        bot_analysis: botResponse.result?.analysis
      })
      .eq('id', fixRequest.id);

    // Execute fix if bot can handle it
    if (issue.can_auto_fix) {
      const fixResult = await this.executeAutoFix(client, issue, fixRequest);

      // Update issue status
      await supabase
        .from('bot_test_issues')
        .update({
          status: fixResult.success ? 'fixed' : 'in-progress',
          fix_attempted: true,
          fix_successful: fixResult.success,
          fix_details: fixResult.details,
          fixed_at: fixResult.success ? new Date() : null
        })
        .eq('id', issueId);

      // Notify client
      await supabase
        .from('client_notifications')
        .insert({
          client_id: clientId,
          related_issue_id: issueId,
          notification_type: 'issue-fixed',
          severity: 'info',
          title: fixResult.success ? '✅ Issue Fixed' : '⚠️ Fix Attempted',
          message: fixResult.success
            ? `Engineering bot successfully fixed: ${issue.description}`
            : `Engineering bot attempted fix but needs manual review: ${issue.description}`
        });

      return fixResult;
    }

    // If can't auto-fix, return analysis
    return {
      success: false,
      requiresManualFix: true,
      analysis: botResponse.result?.analysis,
      recommendation: botResponse.result?.recommendation
    };
  }

  /**
   * Execute automatic fix via engineering bot
   */
  async executeAutoFix(client, issue, fixRequest) {
    console.log(`  🤖 Smart Engineering Bot executing fix...`);

    try {
      // Use AI-powered smart fixer with codebase knowledge + learning
      const fixResult = await gmpAutoFixer.executeSmartFix(client, issue);

      // Update fix request
      await supabase
        .from('bot_fix_requests')
        .update({
          status: fixResult.success ? 'completed' : 'failed',
          fix_applied: fixResult.success,
          fix_result: fixResult.details || JSON.stringify(fixResult),
          completed_at: new Date()
        })
        .eq('id', fixRequest.id);

      return fixResult;

    } catch (error) {
      console.error(`  ❌ Fix failed:`, error.message);

      await supabase
        .from('bot_fix_requests')
        .update({
          status: 'failed',
          fix_result: error.message,
          completed_at: new Date()
        })
        .eq('id', fixRequest.id);

      return {
        success: false,
        error: error.message
      };
    }
  }

  // =========================================================================
  // SCHEDULING & AUTOMATION
  // =========================================================================

  /**
   * Run tests for all active clients
   */
  async runAllClientTests() {
    console.log('\n🤖 Running tests for all active clients...\n');

    const { data: clients } = await supabase
      .from('testing_clients')
      .select('*')
      .eq('status', 'active');

    const results = [];

    for (const client of clients) {
      // Check if test is due
      if (this.isTestDue(client)) {
        console.log(`\n📊 Testing: ${client.client_name}`);

        try {
          const result = await this.runClientTest(client.id);
          results.push({
            clientId: client.id,
            clientName: client.client_name,
            success: true,
            tests: result
          });
        } catch (error) {
          console.error(`Failed to test ${client.client_name}:`, error);
          results.push({
            clientId: client.id,
            clientName: client.client_name,
            success: false,
            error: error.message
          });
        }
      }
    }

    console.log(`\n✅ Completed tests for ${results.length} client(s)`);

    return results;
  }

  /**
   * Check if test is due based on frequency
   */
  isTestDue(client) {
    // For now, always return true (run every time)
    // TODO: Implement frequency checking based on last test date
    return true;
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  async sendEmail(client, { subject, body }) {
    console.log(`  📧 Sending email to ${client.client_email}: ${subject}`);
    // TODO: Implement actual email sending
    // For now, just log it
  }

  /**
   * Get client dashboard URL with auth token
   */
  getClientDashboardUrl(client) {
    return `${process.env.DASHBOARD_URL}?token=${client.dashboard_token}`;
  }
}

module.exports = new BotTestingService();
