// ============================================
// PERCEPTION ENGINE - The AGI's Eyes & Ears
// ============================================
// Monitors both businesses 24/7, tracking KPIs, trends, and opportunities

const { createClient } = require('@supabase/supabase-js');
const orchestrator = require('./ai-orchestrator');

class PerceptionEngine {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
  }

  // ==========================================
  // MAIN MONITORING METHOD
  // ==========================================

  async monitorBusiness(businessId) {
    console.log(`  📡 Monitoring ${businessId}...`);

    const state = {
      businessId,
      timestamp: new Date(),
      kpis: {},
      healthScore: 0,
      trend: 'stable',
      currentStrategy: null,
      activeExperiments: [],
      alerts: [],
      recommendations: []
    };

    // Get KPIs based on business type
    if (businessId === 'maggie-forbes') {
      state.kpis = await this.getMaggieForbesKPIs();
      state.currentStrategy = await this.getCurrentStrategy(businessId);
    } else if (businessId === 'growth-manager-pro') {
      state.kpis = await this.getGrowthManagerProKPIs();
      state.currentStrategy = await this.getCurrentStrategy(businessId);
    }

    // Calculate health score
    state.healthScore = this.calculateHealthScore(businessId, state.kpis);

    // Determine trend
    state.trend = await this.determineTrend(businessId, state.kpis);

    // Check for active experiments
    state.activeExperiments = await this.getActiveExperiments(businessId);

    // Generate alerts if needed
    state.alerts = this.generateAlerts(businessId, state);

    return state;
  }

  // ==========================================
  // MAGGIE FORBES KPIS
  // ==========================================

  async getMaggieForbesKPIs() {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Get leads from last 7 days
    const { data: leads, error: leadsError } = await this.supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', 'maggie-forbes')
      .gte('created_at', weekAgo.toISOString());

    // Get conversions (clients)
    const { data: clients, error: clientsError } = await this.supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', 'maggie-forbes')
      .eq('plan', 'premium');

    // Get revenue (from completed jobs)
    const { data: revenue, error: revenueError } = await this.supabase
      .from('queue_jobs')
      .select('*')
      .eq('tenant_id', 'maggie-forbes')
      .eq('status', 'completed')
      .gte('created_at', weekAgo.toISOString());

    return {
      leads: leads?.length || 0,
      conversions: clients?.length || 0,
      revenue: this.estimateRevenue('maggie-forbes', clients?.length || 0),
      client_satisfaction: 9.0 // Would be calculated from feedback
    };
  }

  // ==========================================
  // GROWTH MANAGER PRO KPIS
  // ==========================================

  async getGrowthManagerProKPIs() {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Get signups from last 7 days
    const { data: signups } = await this.supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', 'growth-manager-pro')
      .gte('created_at', weekAgo.toISOString());

    // Get active paying users
    const { data: payingUsers } = await this.supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', 'growth-manager-pro')
      .in('plan', ['starter', 'growth']);

    // Calculate MRR
    const mrr = this.calculateMRR(payingUsers);

    // Get churned users
    const { data: churnedUsers } = await this.supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', 'growth-manager-pro')
      .eq('plan', 'cancelled')
      .gte('updated_at', monthAgo.toISOString());

    const churnRate = (churnedUsers?.length || 0) / (payingUsers?.length || 1) * 100;

    return {
      signups: signups?.length || 0,
      mrr: mrr,
      churn: churnRate,
      ltv: this.calculateLTV(mrr, churnRate)
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  async getCurrentStrategy(businessId) {
    const { data } = await this.supabase
      .from('agi_strategies')
      .select('*')
      .eq('business_name', businessId)
      .eq('status', 'active')
      .order('last_executed', { ascending: false })
      .limit(1)
      .single();

    return data?.strategy_name || 'bootstrap';
  }

  async getActiveExperiments(businessId) {
    const { data } = await this.supabase
      .from('agi_experiments')
      .select('*')
      .eq('business_name', businessId)
      .eq('status', 'running');

    return data || [];
  }

  calculateHealthScore(businessId, kpis) {
    // Health score is a weighted average of how close we are to targets

    if (businessId === 'maggie-forbes') {
      const targets = {
        leads: 50,
        conversions: 10,
        revenue: 250000,
        client_satisfaction: 9.5
      };

      let score = 0;
      let weights = {
        leads: 0.2,
        conversions: 0.3,
        revenue: 0.4,
        client_satisfaction: 0.1
      };

      for (const [metric, target] of Object.entries(targets)) {
        const current = kpis[metric] || 0;
        const ratio = Math.min(current / target, 1); // Cap at 100%
        score += ratio * weights[metric] * 100;
      }

      return Math.round(score);

    } else if (businessId === 'growth-manager-pro') {
      const targets = {
        signups: 200,
        mrr: 60000,
        churn: 5, // Lower is better
        ltv: 1500
      };

      let score = 0;
      let weights = {
        signups: 0.2,
        mrr: 0.4,
        churn: 0.2,
        ltv: 0.2
      };

      score += (Math.min(kpis.signups / targets.signups, 1) * weights.signups * 100);
      score += (Math.min(kpis.mrr / targets.mrr, 1) * weights.mrr * 100);
      score += (Math.min(targets.churn / (kpis.churn || 1), 1) * weights.churn * 100); // Inverted
      score += (Math.min(kpis.ltv / targets.ltv, 1) * weights.ltv * 100);

      return Math.round(score);
    }

    return 50; // Default
  }

  async determineTrend(businessId, currentKPIs) {
    // Compare current KPIs to last week

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { data: lastWeekState } = await this.supabase
      .from('agi_business_state')
      .select('*')
      .eq('business_name', businessId)
      .lte('timestamp', weekAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!lastWeekState) {
      return 'stable'; // Not enough data yet
    }

    const lastWeekKPIs = lastWeekState.kpis;

    // Compare key metrics
    let improvementCount = 0;
    let declineCount = 0;

    for (const [metric, currentValue] of Object.entries(currentKPIs)) {
      const lastValue = lastWeekKPIs[metric] || 0;

      // For churn, lower is better
      if (metric === 'churn') {
        if (currentValue < lastValue) improvementCount++;
        if (currentValue > lastValue) declineCount++;
      } else {
        if (currentValue > lastValue) improvementCount++;
        if (currentValue < lastValue) declineCount++;
      }
    }

    if (improvementCount > declineCount) return 'improving';
    if (declineCount > improvementCount) return 'declining';
    return 'stable';
  }

  generateAlerts(businessId, state) {
    const alerts = [];

    // Health alerts
    if (state.healthScore < 50) {
      alerts.push({
        severity: 'critical',
        message: `${businessId} health is critical (${state.healthScore}/100)`,
        action: 'immediate_attention_required'
      });
    } else if (state.healthScore < 70) {
      alerts.push({
        severity: 'warning',
        message: `${businessId} health is low (${state.healthScore}/100)`,
        action: 'review_strategy'
      });
    }

    // Trend alerts
    if (state.trend === 'declining') {
      alerts.push({
        severity: 'warning',
        message: `${businessId} metrics are declining`,
        action: 'investigate_causes'
      });
    }

    // Business-specific alerts
    if (businessId === 'maggie-forbes') {
      if (state.kpis.leads < 30) {
        alerts.push({
          severity: 'medium',
          message: 'Lead generation below critical threshold',
          action: 'increase_lead_generation'
        });
      }

      if (state.kpis.conversions < 5) {
        alerts.push({
          severity: 'high',
          message: 'Conversion rate critically low',
          action: 'optimize_sales_process'
        });
      }
    }

    if (businessId === 'growth-manager-pro') {
      if (state.kpis.churn > 10) {
        alerts.push({
          severity: 'critical',
          message: 'Churn rate dangerously high',
          action: 'reduce_churn_immediately'
        });
      }

      if (state.kpis.signups < 15) {
        alerts.push({
          severity: 'medium',
          message: 'Signup rate below target',
          action: 'increase_marketing'
        });
      }
    }

    return alerts;
  }

  // ==========================================
  // CALCULATION HELPERS
  // ==========================================

  estimateRevenue(businessId, conversions) {
    if (businessId === 'maggie-forbes') {
      return conversions * 25000; // $25K per client
    }
    return 0;
  }

  calculateMRR(users) {
    if (!users) return 0;

    let mrr = 0;
    for (const user of users) {
      if (user.plan === 'starter') {
        mrr += 50;
      } else if (user.plan === 'growth') {
        mrr += 200;
      }
    }

    return mrr;
  }

  calculateLTV(mrr, churnRate) {
    if (churnRate === 0) return mrr * 24; // Assume 2 year LTV

    const monthsRetained = 1 / (churnRate / 100);
    const avgMRRPerUser = mrr / 100; // Rough estimate
    return avgMRRPerUser * monthsRetained;
  }

  // ==========================================
  // EXTERNAL DATA MONITORING
  // ==========================================

  async monitorExternalSignals(businessId) {
    // This could monitor:
    // - Social media mentions
    // - Competitor activity
    // - Market trends
    // - Industry news

    const signals = {
      socialMediaActivity: await this.checkSocialMedia(businessId),
      competitorMoves: await this.checkCompetitors(businessId),
      marketTrends: await this.checkMarketTrends(businessId)
    };

    return signals;
  }

  async checkSocialMedia(businessId) {
    // Would integrate with social media APIs
    // For now, return placeholder
    return {
      mentions: 0,
      sentiment: 'neutral',
      trending: false
    };
  }

  async checkCompetitors(businessId) {
    // Would scrape competitor websites/social
    // For now, return placeholder
    return {
      newFeatures: [],
      pricingChanges: [],
      marketingCampaigns: []
    };
  }

  async checkMarketTrends(businessId) {
    // Would use Google Trends API or similar
    // For now, return placeholder
    return {
      interestLevel: 'stable',
      emergingKeywords: [],
      seasonalFactors: []
    };
  }
}

// ==========================================
// EXPORTS
// ==========================================

const perceptionEngine = new PerceptionEngine();

module.exports = perceptionEngine;

// Test if running directly
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing Perception Engine...\n');

    const maggieState = await perceptionEngine.monitorBusiness('maggie-forbes');
    console.log('\n📊 Maggie Forbes State:');
    console.log(JSON.stringify(maggieState, null, 2));

    const gmpState = await perceptionEngine.monitorBusiness('growth-manager-pro');
    console.log('\n📊 Growth Manager Pro State:');
    console.log(JSON.stringify(gmpState, null, 2));

  })().catch(console.error);
}
