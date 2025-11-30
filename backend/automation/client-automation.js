/**
 * Client Automation Scheduler
 * Runs automated lead generation, content creation, and research for all clients
 *
 * Flow:
 * 1. Every morning at 6am, check all clients with automation enabled
 * 2. Generate leads/content/research based on their settings
 * 3. Auto-push results to their GMP dashboard via gmp-sync service
 * 4. Client logs into GMP and sees fresh results
 * 5. They never know it's automated
 *
 * Usage:
 * - Run as cron job: node backend/automation/client-automation.js
 * - Or import and call: await runClientAutomation()
 */

const schedule = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const gmpSync = require('../services/gmp-sync');

// Initialize Supabase
const supabase = createClient(
  process.env.ENTREPRENEURHUB_SUPABASE_URL,
  process.env.ENTREPRENEURHUB_SUPABASE_SERVICE_KEY
);

class ClientAutomation {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the automation scheduler
   * Runs daily at 6am
   */
  start() {
    console.log('[Client Automation] Starting scheduler...');

    // Run daily at 6am
    schedule.schedule('0 6 * * *', async () => {
      console.log('[Client Automation] Daily automation triggered at 6am');
      await this.runDailyAutomation();
    });

    // Run weekly on Monday at 9am for content generation
    schedule.schedule('0 9 * * 1', async () => {
      console.log('[Client Automation] Weekly content automation triggered');
      await this.runWeeklyAutomation();
    });

    // Run monthly on 1st at 10am for research reports
    schedule.schedule('0 10 1 * *', async () => {
      console.log('[Client Automation] Monthly research automation triggered');
      await this.runMonthlyAutomation();
    });

    console.log('[Client Automation] ✅ Scheduler started successfully');
    console.log('  Daily (6am): Lead generation');
    console.log('  Weekly (Mon 9am): Content creation');
    console.log('  Monthly (1st 10am): Research reports');
  }

  /**
   * Run daily automation for all clients
   * Generates leads and pushes to GMP
   */
  async runDailyAutomation() {
    if (this.isRunning) {
      console.log('[Client Automation] Already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('[Client Automation] Starting daily automation...');

      // Get all clients with automation enabled
      const clients = await this.getActiveClients();
      console.log(`[Client Automation] Found ${clients.length} active clients`);

      for (const client of clients) {
        try {
          await this.runLeadGenerationForClient(client);
        } catch (error) {
          console.error(`[Client Automation] Error for client ${client.client_name}:`, error);
          // Continue with next client even if one fails
        }
      }

      console.log('[Client Automation] ✅ Daily automation complete');
    } catch (error) {
      console.error('[Client Automation] Daily automation error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run weekly automation (content generation)
   */
  async runWeeklyAutomation() {
    try {
      console.log('[Client Automation] Starting weekly automation...');

      const clients = await this.getActiveClients();

      for (const client of clients) {
        try {
          await this.runContentGenerationForClient(client);
        } catch (error) {
          console.error(`[Client Automation] Error for client ${client.client_name}:`, error);
        }
      }

      console.log('[Client Automation] ✅ Weekly automation complete');
    } catch (error) {
      console.error('[Client Automation] Weekly automation error:', error);
    }
  }

  /**
   * Run monthly automation (research reports)
   */
  async runMonthlyAutomation() {
    try {
      console.log('[Client Automation] Starting monthly automation...');

      const clients = await this.getActiveClients();

      for (const client of clients) {
        try {
          await this.runResearchForClient(client);
        } catch (error) {
          console.error(`[Client Automation] Error for client ${client.client_name}:`, error);
        }
      }

      console.log('[Client Automation] ✅ Monthly automation complete');
    } catch (error) {
      console.error('[Client Automation] Monthly automation error:', error);
    }
  }

  /**
   * Get all clients with automation enabled
   */
  async getActiveClients() {
    const { data, error } = await supabase
      .from('gmp_client_config')
      .select('*')
      .eq('automation_enabled', true);

    if (error) {
      console.error('[Client Automation] Error fetching clients:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Run lead generation for a specific client
   */
  async runLeadGenerationForClient(client) {
    console.log(`[Client Automation] Generating leads for: ${client.client_name}`);

    // Import lead generation service
    const leadGenerator = require('../services/lead-generator');

    // Determine how many leads to generate today
    const leadsPerDay = Math.ceil(client.leads_per_week / 7);

    // Generate leads based on client's target industries
    const leads = [];
    for (const industry of client.target_industries || ['general']) {
      try {
        const industryLeads = await leadGenerator.generateLeads({
          targetIndustry: industry,
          count: leadsPerDay,
          tenantId: client.unbound_tenant_id
        });

        leads.push(...industryLeads);
      } catch (error) {
        console.error(`[Client Automation] Error generating leads for ${industry}:`, error);
      }
    }

    console.log(`[Client Automation] Generated ${leads.length} leads for ${client.client_name}`);

    // Push to GMP
    if (leads.length > 0) {
      const syncResult = await gmpSync.pushLeads(leads, client.gmp_tenant_id);
      console.log(`[Client Automation] Synced ${syncResult.successful}/${syncResult.total} leads to GMP`);
    }

    return leads;
  }

  /**
   * Run content generation for a specific client
   */
  async runContentGenerationForClient(client) {
    console.log(`[Client Automation] Generating content for: ${client.client_name}`);

    // Import content creator service
    const contentCreator = require('../services/content-creator');

    const contentPieces = [];

    // Generate content based on client's topics
    const topics = client.content_topics || ['business growth'];
    const topicsToGenerate = topics.slice(0, client.content_per_week || 2);

    for (const topic of topicsToGenerate) {
      try {
        const content = await contentCreator.createBlogPost({
          topic: topic,
          wordCount: 1500,
          seoOptimized: true,
          tenantId: client.unbound_tenant_id
        });

        contentPieces.push(content);
      } catch (error) {
        console.error(`[Client Automation] Error generating content for ${topic}:`, error);
      }
    }

    console.log(`[Client Automation] Generated ${contentPieces.length} content pieces for ${client.client_name}`);

    // Push to GMP
    if (contentPieces.length > 0) {
      const syncResult = await gmpSync.pushContent(contentPieces, client.gmp_tenant_id);
      console.log(`[Client Automation] Synced ${syncResult.successful}/${syncResult.total} content pieces to GMP`);
    }

    return contentPieces;
  }

  /**
   * Run market research for a specific client
   */
  async runResearchForClient(client) {
    console.log(`[Client Automation] Generating research for: ${client.client_name}`);

    // Import market researcher service
    const marketResearcher = require('../services/market-researcher');

    const reports = [];

    // Generate research based on client's industries
    const industries = client.target_industries || ['general'];
    const industryToResearch = industries[0]; // Focus on primary industry

    try {
      const report = await marketResearcher.conductMarketResearch({
        industry: industryToResearch,
        researchType: 'competitor_analysis',
        tenantId: client.unbound_tenant_id
      });

      reports.push(report);
    } catch (error) {
      console.error(`[Client Automation] Error generating research:`, error);
    }

    console.log(`[Client Automation] Generated ${reports.length} research reports for ${client.client_name}`);

    // Push to GMP
    if (reports.length > 0) {
      const syncResult = await gmpSync.pushResearch(reports, client.gmp_tenant_id);
      console.log(`[Client Automation] Synced ${syncResult.successful}/${syncResult.total} reports to GMP`);
    }

    return reports;
  }

  /**
   * Run automation manually for testing
   */
  async runManual() {
    console.log('[Client Automation] Running manual automation...');
    await this.runDailyAutomation();
    await this.runWeeklyAutomation();
    await this.runMonthlyAutomation();
  }

  /**
   * Run automation for a specific client (for testing)
   */
  async runForClient(unboundTenantId) {
    console.log(`[Client Automation] Running automation for: ${unboundTenantId}`);

    const { data: client, error } = await supabase
      .from('gmp_client_config')
      .select('*')
      .eq('unbound_tenant_id', unboundTenantId)
      .single();

    if (error || !client) {
      console.error('[Client Automation] Client not found:', error);
      return;
    }

    await this.runLeadGenerationForClient(client);
    await this.runContentGenerationForClient(client);
    await this.runResearchForClient(client);

    console.log('[Client Automation] ✅ Complete for client');
  }
}

// Export singleton instance
const automation = new ClientAutomation();

// If running directly (node client-automation.js), start scheduler
if (require.main === module) {
  console.log('[Client Automation] Running as standalone process');
  automation.start();

  // Keep process alive
  process.on('SIGTERM', () => {
    console.log('[Client Automation] Received SIGTERM, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[Client Automation] Received SIGINT, shutting down gracefully');
    process.exit(0);
  });
}

module.exports = automation;
