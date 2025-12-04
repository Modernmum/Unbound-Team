// ============================================
// EMPIRE AGI BRAIN - The Core Intelligence
// ============================================
// This is the central decision-making system that runs both businesses autonomously
// It monitors, learns, decides, and executes 24/7

const { createClient } = require('@supabase/supabase-js');
const orchestrator = require('./ai-orchestrator');
const perceptionEngine = require('./perception-engine');
const learningEngine = require('./learning-engine');
const strategyOptimizer = require('./strategy-optimizer');
const crossPollinator = require('./cross-pollinator');
const queueService = require('./supabase-queue');
const notifications = require('./notifications');

class EmpireAGI {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Business definitions
    this.businesses = {
      'maggie-forbes': {
        name: 'Maggie Forbes Strategies',
        goal: 'Generate $250K/month from high-end consulting',
        kpis: ['leads', 'conversions', 'revenue', 'client_satisfaction'],
        targetMetrics: {
          leads: 50,
          conversions: 10,
          revenue: 250000,
          client_satisfaction: 9.5
        }
      },
      'growth-manager-pro': {
        name: 'Growth Manager Pro',
        goal: 'Generate $60K/month MRR from SaaS',
        kpis: ['signups', 'mrr', 'churn', 'ltv'],
        targetMetrics: {
          signups: 200,
          mrr: 60000,
          churn: 5,
          ltv: 1500
        }
      }
    };

    this.isRunning = false;
    this.cycleCount = 0;
  }

  // ==========================================
  // MAIN AGI LOOP - Runs continuously
  // ==========================================

  async run() {
    console.log('🧠 Empire AGI Brain starting...');
    this.isRunning = true;

    while (this.isRunning) {
      try {
        this.cycleCount++;
        const cycleStartTime = Date.now();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧠 AGI CYCLE #${this.cycleCount} - ${new Date().toISOString()}`);
        console.log(`${'='.repeat(60)}\n`);

        // 1. PERCEIVE - Monitor both businesses
        const businessStates = await this.perceive();

        // 2. ANALYZE - What's working? What's not?
        const analysis = await this.analyze(businessStates);

        // 3. LEARN - Update knowledge from past decisions
        await this.learn();

        // 4. PLAN - Decide what to do next
        const actions = await this.plan(analysis);

        // 5. EXECUTE - Take action
        await this.execute(actions);

        // 6. CROSS-POLLINATE - Share insights between businesses
        await this.crossPollinate();

        // 7. REPORT - Send status update
        await this.report(businessStates, analysis, actions);

        const cycleTime = Date.now() - cycleStartTime;
        console.log(`\n✅ AGI cycle complete in ${cycleTime}ms`);

        // Sleep for 1 hour before next cycle
        console.log(`⏰ Sleeping for 1 hour until next cycle...\n`);
        await this.sleep(60 * 60 * 1000); // 1 hour

      } catch (error) {
        console.error('❌ AGI cycle error:', error);
        try {
          await notifications.sendDiscordNotification(
            '⚠️ AGI Brain Error',
            `Error in cycle #${this.cycleCount}: ${error.message}`,
            'error'
          );
        } catch (notifError) {
          console.log('  ℹ️  Could not send error notification');
        }

        // Sleep for 5 minutes before retrying
        await this.sleep(5 * 60 * 1000);
      }
    }
  }

  // ==========================================
  // 1. PERCEIVE - Monitor business state
  // ==========================================

  async perceive() {
    console.log('👁️  PERCEIVING: Monitoring business state...');

    const states = {};

    for (const [businessId, business] of Object.entries(this.businesses)) {
      console.log(`  📊 Checking ${business.name}...`);

      // Use perception engine to get current state
      const state = await perceptionEngine.monitorBusiness(businessId);

      states[businessId] = state;

      // Store state in database
      await this.supabase
        .from('agi_business_state')
        .insert({
          business_name: businessId,
          kpis: state.kpis,
          health_score: state.healthScore,
          trend: state.trend,
          current_strategy: state.currentStrategy,
          active_experiments: state.activeExperiments
        });

      console.log(`  ✓ ${business.name}: Health ${state.healthScore}/100, Trend: ${state.trend}`);
    }

    return states;
  }

  // ==========================================
  // 2. ANALYZE - Understand what's happening
  // ==========================================

  async analyze(businessStates) {
    console.log('\n🔍 ANALYZING: Understanding current situation...');

    const analysis = {
      insights: [],
      opportunities: [],
      threats: [],
      priorities: []
    };

    for (const [businessId, state] of Object.entries(businessStates)) {
      const business = this.businesses[businessId];

      // Compare current vs target
      const gaps = this.identifyGaps(state.kpis, business.targetMetrics);

      // Identify what needs attention
      if (state.healthScore < 70) {
        analysis.threats.push({
          business: businessId,
          issue: 'Low health score',
          severity: 'high',
          details: `Health is ${state.healthScore}/100`
        });
      }

      if (state.trend === 'declining') {
        analysis.threats.push({
          business: businessId,
          issue: 'Declining trend',
          severity: 'medium',
          details: 'Business metrics are trending down'
        });
      }

      // Identify opportunities
      if (gaps.length > 0) {
        for (const gap of gaps) {
          analysis.opportunities.push({
            business: businessId,
            opportunity: `Increase ${gap.metric}`,
            potential: gap.potential,
            priority: gap.priority
          });
        }
      }

      console.log(`  ✓ ${business.name}: ${gaps.length} gaps identified`);
    }

    // Prioritize actions
    analysis.priorities = this.prioritizeActions(analysis);

    return analysis;
  }

  // ==========================================
  // 3. LEARN - Update knowledge from results
  // ==========================================

  async learn() {
    console.log('\n🎓 LEARNING: Analyzing past decisions...');

    // Use learning engine
    const newInsights = await learningEngine.analyzePastDecisions();

    if (newInsights.length > 0) {
      console.log(`  ✓ Discovered ${newInsights.length} new insights`);

      for (const insight of newInsights) {
        console.log(`    💡 ${insight.title} (confidence: ${insight.confidence}%)`);
      }
    } else {
      console.log('  • No new insights discovered this cycle');
    }

    return newInsights;
  }

  // ==========================================
  // 4. PLAN - Decide what to do next
  // ==========================================

  async plan(analysis) {
    console.log('\n🎯 PLANNING: Deciding optimal actions...');

    const actions = [];

    // Process priorities
    for (const priority of analysis.priorities) {
      const action = await strategyOptimizer.determineOptimalAction(priority);

      if (action) {
        actions.push(action);
        console.log(`  ✓ Planned: ${action.description} (confidence: ${action.confidence}%)`);
      }
    }

    return actions;
  }

  // ==========================================
  // 5. EXECUTE - Take action
  // ==========================================

  async execute(actions) {
    console.log('\n⚡ EXECUTING: Taking actions...');

    for (const action of actions) {
      try {
        // Record the decision
        const { data: decision } = await this.supabase
          .rpc('record_agi_decision', {
            p_business_name: action.business,
            p_situation: action.situation,
            p_decision: action.decision,
            p_reasoning: action.reasoning,
            p_action_type: action.type,
            p_action_details: action.details,
            p_confidence_score: action.confidence,
            p_risk_level: action.risk
          });

        console.log(`  🚀 Executing: ${action.description}`);

        // Execute the action based on type
        let result;
        switch (action.type) {
          case 'generate_leads':
            result = await this.executeLeadGeneration(action);
            break;

          case 'create_content':
            result = await this.executeContentCreation(action);
            break;

          case 'send_outreach':
            result = await this.executeOutreach(action);
            break;

          case 'adjust_pricing':
            result = await this.executePricingAdjustment(action);
            break;

          case 'run_experiment':
            result = await this.executeExperiment(action);
            break;

          default:
            console.log(`    ⚠️  Unknown action type: ${action.type}`);
            result = { success: false, error: 'Unknown action type' };
        }

        // Update decision with outcome
        if (result.success) {
          await this.supabase.rpc('update_decision_outcome', {
            p_decision_id: decision,
            p_outcome: 'success',
            p_results: result.data,
            p_feedback_score: result.feedbackScore || 50
          });

          console.log(`  ✅ Success: ${action.description}`);
        } else {
          await this.supabase.rpc('update_decision_outcome', {
            p_decision_id: decision,
            p_outcome: 'failure',
            p_results: { error: result.error },
            p_feedback_score: -50
          });

          console.log(`  ❌ Failed: ${result.error}`);
        }

      } catch (error) {
        console.error(`  ❌ Error executing action:`, error);
      }
    }
  }

  // ==========================================
  // 6. CROSS-POLLINATE - Share insights
  // ==========================================

  async crossPollinate() {
    console.log('\n🔄 CROSS-POLLINATING: Sharing insights between businesses...');

    const transfers = await crossPollinator.transferKnowledge();

    if (transfers.length > 0) {
      console.log(`  ✓ ${transfers.length} strategies transferred`);

      for (const transfer of transfers) {
        console.log(`    🔀 ${transfer.source} → ${transfer.target}: ${transfer.strategy}`);
      }
    } else {
      console.log('  • No new knowledge transfers this cycle');
    }

    return transfers;
  }

  // ==========================================
  // 7. REPORT - Send status update
  // ==========================================

  async report(businessStates, analysis, actions) {
    console.log('\n📊 REPORTING: Sending status update...');

    // Build report
    let report = `**🧠 Empire AGI - Cycle #${this.cycleCount}**\n\n`;

    // Business health
    report += `**Business Health:**\n`;
    for (const [businessId, state] of Object.entries(businessStates)) {
      const business = this.businesses[businessId];
      const healthEmoji = state.healthScore >= 80 ? '🟢' : state.healthScore >= 60 ? '🟡' : '🔴';
      report += `${healthEmoji} ${business.name}: ${state.healthScore}/100 (${state.trend})\n`;
    }

    // Key insights
    if (analysis.insights.length > 0) {
      report += `\n**💡 Insights:**\n`;
      for (const insight of analysis.insights.slice(0, 3)) {
        report += `• ${insight}\n`;
      }
    }

    // Actions taken
    if (actions.length > 0) {
      report += `\n**⚡ Actions Taken:**\n`;
      for (const action of actions) {
        report += `• ${action.description}\n`;
      }
    }

    // Send to Discord (if configured)
    try {
      await notifications.sendDiscordNotification(
        '🧠 Empire AGI Status Update',
        report,
        'info'
      );
      console.log('  ✓ Status report sent');
    } catch (error) {
      console.log('  ℹ️  Discord notification skipped (not configured)');
    }
  }

  // ==========================================
  // EXECUTION METHODS
  // ==========================================

  async executeLeadGeneration(action) {
    console.log(`    🔍 Generating leads for ${action.business}...`);

    try {
      // Queue lead generation job
      const job = await queueService.addJob('lead-generation', {
        business: action.business,
        criteria: action.details.criteria,
        count: action.details.count || 10,
        source: 'agi-autonomous'
      });

      return {
        success: true,
        data: { jobId: job.id },
        feedbackScore: 50 // Neutral until we see results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executeContentCreation(action) {
    console.log(`    ✍️  Creating content for ${action.business}...`);

    try {
      const job = await queueService.addJob('content-creation', {
        business: action.business,
        topic: action.details.topic,
        contentType: action.details.contentType || 'blog-post',
        source: 'agi-autonomous'
      });

      return {
        success: true,
        data: { jobId: job.id },
        feedbackScore: 50
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executeOutreach(action) {
    console.log(`    📧 Sending outreach for ${action.business}...`);

    try {
      const job = await queueService.addJob('outreach', {
        business: action.business,
        campaign: action.details.campaign,
        recipients: action.details.recipients,
        source: 'agi-autonomous'
      });

      return {
        success: true,
        data: { jobId: job.id },
        feedbackScore: 50
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executePricingAdjustment(action) {
    console.log(`    💰 Adjusting pricing for ${action.business}...`);

    // This would update pricing in the database
    // For now, we'll just log it
    return {
      success: true,
      data: { newPricing: action.details.newPricing },
      feedbackScore: 60 // Slightly positive - pricing changes are good
    };
  }

  async executeExperiment(action) {
    console.log(`    🧪 Running experiment for ${action.business}...`);

    try {
      // Create experiment in database
      const { data } = await this.supabase
        .from('agi_experiments')
        .insert({
          business_name: action.business,
          experiment_name: action.details.name,
          hypothesis: action.details.hypothesis,
          variant_a: action.details.variantA,
          variant_b: action.details.variantB,
          success_metric: action.details.successMetric,
          target_sample_size: action.details.sampleSize || 100
        })
        .select()
        .single();

      return {
        success: true,
        data: { experimentId: data.id },
        feedbackScore: 70 // Positive - experiments lead to learning
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  identifyGaps(current, targets) {
    const gaps = [];

    for (const [metric, target] of Object.entries(targets)) {
      const currentValue = current[metric] || 0;
      const gap = target - currentValue;

      if (gap > 0) {
        gaps.push({
          metric,
          current: currentValue,
          target,
          gap,
          gapPercent: (gap / target) * 100,
          potential: this.estimatePotentialValue(metric, gap),
          priority: this.calculatePriority(metric, gap, target)
        });
      }
    }

    return gaps.sort((a, b) => b.priority - a.priority);
  }

  estimatePotentialValue(metric, gap) {
    // Rough estimates of dollar value per metric
    const valuePerUnit = {
      leads: 100, // Each lead worth ~$100
      conversions: 25000, // Each conversion worth ~$25K (for MF)
      revenue: 1, // Direct $ value
      signups: 50, // Each signup worth ~$50 LTV
      mrr: 12, // MRR * 12 months = annual value
    };

    return gap * (valuePerUnit[metric] || 0);
  }

  calculatePriority(metric, gap, target) {
    // Priority = impact * urgency
    const impact = gap / target; // How big is the gap?
    const urgency = metric === 'revenue' || metric === 'conversions' ? 2 : 1;

    return impact * urgency * 100;
  }

  prioritizeActions(analysis) {
    const allItems = [
      ...analysis.threats.map(t => ({ ...t, type: 'threat', priority: t.severity === 'high' ? 100 : 50 })),
      ...analysis.opportunities.map(o => ({ ...o, type: 'opportunity', priority: o.priority }))
    ];

    return allItems.sort((a, b) => b.priority - a.priority);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================================
  // CONTROL METHODS
  // ==========================================

  async stop() {
    console.log('🛑 Empire AGI stopping...');
    this.isRunning = false;
  }

  async getStatus() {
    return {
      running: this.isRunning,
      cycleCount: this.cycleCount,
      businesses: Object.keys(this.businesses)
    };
  }
}

// ==========================================
// EXPORTS
// ==========================================

const empireAGI = new EmpireAGI();

module.exports = empireAGI;

// If running directly
if (require.main === module) {
  console.log('🚀 Starting Empire AGI Brain...\n');
  empireAGI.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
