// ============================================================================
// STICKY REVENUE SERVICE - Recurring Revenue Engine
// ============================================================================
// Manages ongoing relationships and monthly recurring revenue
// Transforms one-time matches into lifetime revenue streams
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const orchestrator = require('./ai-orchestrator');

class StickyRevenueService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  // ============================================================================
  // CONVERT: Match → Ongoing Relationship
  // ============================================================================

  async convertToOngoingRelationship(matchId, params) {
    const {
      revenueModel = 'double_sided',
      clientMonthlyFee,       // In cents, e.g., 200000 = $2,000/month
      clientFeeType = 'fixed_retainer',
      clientPercentage,       // e.g., 0.15 = 15%
      providerCommission,     // In cents
      providerPercentage,     // e.g., 0.10 = 10%
      estimatedLTV,
      contractEndDate
    } = params;

    console.log(`💰 Converting match ${matchId} to ongoing relationship...`);

    // Get the match
    const { data: match, error: matchError } = await this.supabase
      .from('matches')
      .select(`
        *,
        need:discovered_needs(*),
        provider:solution_providers(*)
      `)
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      throw new Error('Match not found');
    }

    // Create ongoing relationship
    const { data: relationship, error: relError } = await this.supabase
      .from('ongoing_relationships')
      .insert({
        match_id: matchId,
        need_id: match.need_id,
        provider_id: match.provider_id,
        started_at: new Date(),
        status: 'active',
        revenue_model: revenueModel,
        client_monthly_fee: clientMonthlyFee,
        client_fee_type: clientFeeType,
        client_percentage: clientPercentage,
        provider_monthly_commission: providerCommission,
        provider_commission_percentage: providerPercentage,
        estimated_ltv: estimatedLTV,
        contract_end_date: contractEndDate,
        health_score: 10.0, // Start at perfect health
        months_active: 0
      })
      .select()
      .single();

    if (relError) {
      console.error('Error creating relationship:', relError);
      throw relError;
    }

    console.log(`✅ Ongoing relationship created: $${relationship.total_mrr / 100}/month MRR`);

    return relationship;
  }

  // ============================================================================
  // HEALTH: Check Relationship Health (AI-powered)
  // ============================================================================

  async checkRelationshipHealth(relationshipId) {
    console.log(`🏥 Checking health for relationship ${relationshipId}...`);

    // Call database function to calculate health
    const { data, error } = await this.supabase
      .rpc('check_relationship_health', { rel_id: relationshipId });

    if (error) {
      console.error('Error checking health:', error);
      throw error;
    }

    const healthScore = data;

    // Get relationship details for AI analysis
    const { data: relationship } = await this.supabase
      .from('ongoing_relationships')
      .select(`
        *,
        need:discovered_needs(*),
        provider:solution_providers(*)
      `)
      .eq('id', relationshipId)
      .single();

    // Use AI to analyze health
    const aiAnalysis = await this.analyzeHealthWithAI(relationship);

    // Store analysis
    await this.supabase
      .from('relationship_health_checks')
      .insert({
        relationship_id: relationshipId,
        health_score: healthScore,
        factors: aiAnalysis.factors,
        issues: aiAnalysis.issues,
        recommended_actions: aiAnalysis.recommendations,
        ai_summary: aiAnalysis.summary
      });

    console.log(`   Health score: ${healthScore}/10`);
    if (aiAnalysis.issues.length > 0) {
      console.log(`   ⚠️  Issues: ${aiAnalysis.issues.join(', ')}`);
    }

    return {
      healthScore,
      analysis: aiAnalysis
    };
  }

  // ============================================================================
  // AI: Analyze relationship health
  // ============================================================================

  async analyzeHealthWithAI(relationship) {
    const prompt = `Analyze this ongoing business relationship and identify any health issues:

CLIENT: ${relationship.need?.company_name}
PROVIDER: ${relationship.provider?.name}
STARTED: ${relationship.started_at}
STATUS: ${relationship.status}
MRR: $${relationship.total_mrr / 100}/month
HEALTH SCORE: ${relationship.health_score}/10
CLIENT SATISFACTION: ${relationship.client_satisfaction}/5
MONTHS ACTIVE: ${relationship.months_active}

Analyze for:
1. Payment issues (late payments, disputes)
2. Communication gaps (no recent feedback)
3. Satisfaction trends
4. Churn risk factors

Respond with JSON:
{
  "factors": {
    "payment_status": "good/warning/critical",
    "communication": "good/warning/critical",
    "satisfaction": "good/warning/critical"
  },
  "issues": ["issue1", "issue2"],
  "recommendations": ["action1", "action2"],
  "summary": "2-3 sentence analysis",
  "churnRisk": "low/medium/high"
}`;

    try {
      const result = await orchestrator.execute('quick-task', prompt, { maxTokens: 500 });
      return JSON.parse(result.content);
    } catch (e) {
      return {
        factors: {},
        issues: [],
        recommendations: [],
        summary: 'Unable to analyze health',
        churnRisk: 'unknown'
      };
    }
  }

  // ============================================================================
  // MONITOR: Run health checks on all active relationships
  // ============================================================================

  async monitorAllRelationships() {
    console.log('🔍 Monitoring all active relationships...');

    const { data: relationships, error } = await this.supabase
      .from('ongoing_relationships')
      .select('id, health_score, last_health_check')
      .eq('status', 'active');

    if (error || !relationships) {
      console.error('Error fetching relationships:', error);
      return;
    }

    console.log(`   Found ${relationships.length} active relationships`);

    const results = [];

    for (const rel of relationships) {
      // Check if health check is overdue (> 7 days)
      const daysSinceCheck = rel.last_health_check
        ? (Date.now() - new Date(rel.last_health_check)) / (1000 * 60 * 60 * 24)
        : 999;

      if (daysSinceCheck > 7) {
        const healthResult = await this.checkRelationshipHealth(rel.id);
        results.push({
          relationshipId: rel.id,
          previousHealth: rel.health_score,
          newHealth: healthResult.healthScore,
          issues: healthResult.analysis.issues
        });

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Monitored ${results.length} relationships`);
    return results;
  }

  // ============================================================================
  // PAYMENT: Process monthly recurring payments
  // ============================================================================

  async processMonthlyPayments() {
    console.log('💳 Processing monthly recurring payments...');

    // Get all active relationships
    const { data: relationships, error } = await this.supabase
      .from('ongoing_relationships')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching relationships:', error);
      return;
    }

    const today = new Date();
    const results = [];

    for (const rel of relationships) {
      // Check if we need to generate this month's payment
      const { data: existingPayment } = await this.supabase
        .from('recurring_payments')
        .select('id')
        .eq('relationship_id', rel.id)
        .gte('period_start', new Date(today.getFullYear(), today.getMonth(), 1).toISOString())
        .single();

      if (!existingPayment) {
        // Generate payment for current month
        const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const { data: payment } = await this.supabase
          .from('recurring_payments')
          .insert({
            relationship_id: rel.id,
            period_start: periodStart.toISOString().split('T')[0],
            period_end: periodEnd.toISOString().split('T')[0],
            client_fee: rel.client_monthly_fee,
            provider_commission: rel.provider_monthly_commission,
            total_amount: rel.total_mrr,
            status: 'pending',
            due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          })
          .select()
          .single();

        // Update relationship lifetime revenue and months active
        await this.supabase
          .from('ongoing_relationships')
          .update({
            lifetime_revenue: rel.lifetime_revenue + rel.total_mrr,
            months_active: rel.months_active + 1
          })
          .eq('id', rel.id);

        results.push(payment);
      }
    }

    console.log(`✅ Generated ${results.length} new monthly payments`);
    return results;
  }

  // ============================================================================
  // STATS: Get sticky revenue metrics
  // ============================================================================

  async getMetrics() {
    const { data, error } = await this.supabase.rpc('get_sticky_revenue_stats');

    if (error) {
      console.error('Error getting metrics:', error);
      return null;
    }

    return data;
  }

  // ============================================================================
  // DASHBOARD: Get client dashboard data
  // ============================================================================

  async getClientDashboard(companyName) {
    // Get all relationships for this client
    const { data: relationships, error } = await this.supabase
      .from('ongoing_relationships')
      .select(`
        *,
        provider:solution_providers(*),
        payments:recurring_payments(*)
      `)
      .eq('need_id', this.supabase
        .from('discovered_needs')
        .select('id')
        .eq('company_name', companyName)
      );

    if (error) {
      console.error('Error fetching dashboard:', error);
      return null;
    }

    // Calculate totals
    const totalMRR = relationships
      .filter(r => r.status === 'active')
      .reduce((sum, r) => sum + r.total_mrr, 0);

    const totalLTV = relationships.reduce((sum, r) => sum + r.lifetime_revenue, 0);

    const avgHealthScore = relationships
      .filter(r => r.status === 'active')
      .reduce((sum, r) => sum + r.health_score, 0) / relationships.filter(r => r.status === 'active').length || 0;

    return {
      companyName,
      relationships,
      metrics: {
        totalMRR: totalMRR / 100, // Convert to dollars
        totalLTV: totalLTV / 100,
        activeRelationships: relationships.filter(r => r.status === 'active').length,
        avgHealthScore,
        atRiskCount: relationships.filter(r => r.status === 'at_risk').length
      }
    };
  }

  // ============================================================================
  // ALERT: Get relationships needing attention
  // ============================================================================

  async getRelationshipsNeedingAttention() {
    const { data, error } = await this.supabase
      .from('ongoing_relationships')
      .select(`
        *,
        need:discovered_needs(*),
        provider:solution_providers(*)
      `)
      .or('status.eq.at_risk,health_score.lt.6')
      .order('health_score', { ascending: true });

    if (error) {
      console.error('Error fetching at-risk relationships:', error);
      return [];
    }

    return data;
  }

  // ============================================================================
  // CHURN: Mark relationship as ended
  // ============================================================================

  async markAsChurned(relationshipId, churnReason) {
    console.log(`😔 Marking relationship ${relationshipId} as churned...`);

    const { data, error } = await this.supabase
      .from('ongoing_relationships')
      .update({
        status: 'ended',
        ended_at: new Date(),
        churn_reason: churnReason
      })
      .eq('id', relationshipId)
      .select()
      .single();

    if (error) {
      console.error('Error marking as churned:', error);
      throw error;
    }

    console.log(`✅ Relationship ended. Lifetime revenue: $${data.lifetime_revenue / 100}`);
    return data;
  }
}

module.exports = new StickyRevenueService();
