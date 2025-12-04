// ============================================
// LEARNING ENGINE - The AGI's Brain Evolution
// ============================================
// Analyzes past decisions, discovers patterns, and continuously improves

const { createClient } = require('@supabase/supabase-js');
const orchestrator = require('./ai-orchestrator');

class LearningEngine {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    this.minSampleSize = 10; // Need at least 10 data points to learn
    this.confidenceThreshold = 70; // Only trust insights with 70%+ confidence
  }

  // ==========================================
  // MAIN LEARNING METHOD
  // ==========================================

  async analyzePastDecisions() {
    console.log('  🎓 Analyzing past decisions for patterns...');

    const insights = [];

    // 1. Analyze decision success rates by type
    const actionTypeInsights = await this.analyzeActionTypes();
    insights.push(...actionTypeInsights);

    // 2. Analyze timing patterns
    const timingInsights = await this.analyzeTimingPatterns();
    insights.push(...timingInsights);

    // 3. Analyze strategy performance
    const strategyInsights = await this.analyzeStrategies();
    insights.push(...strategyInsights);

    // 4. Discover correlations
    const correlationInsights = await this.discoverCorrelations();
    insights.push(...correlationInsights);

    // 5. Save new insights to database
    for (const insight of insights) {
      await this.saveInsight(insight);
    }

    return insights;
  }

  // ==========================================
  // ANALYZE ACTION TYPES
  // ==========================================

  async analyzeActionTypes() {
    const insights = [];

    // Get all completed decisions
    const { data: decisions } = await this.supabase
      .from('agi_decisions')
      .select('*')
      .not('completed_at', 'is', null)
      .order('executed_at', { ascending: false })
      .limit(1000);

    if (!decisions || decisions.length < this.minSampleSize) {
      return insights; // Not enough data yet
    }

    // Group by action type
    const byActionType = {};
    for (const decision of decisions) {
      if (!byActionType[decision.action_type]) {
        byActionType[decision.action_type] = {
          total: 0,
          successes: 0,
          failures: 0,
          avgFeedback: 0,
          totalFeedback: 0
        };
      }

      const stats = byActionType[decision.action_type];
      stats.total++;

      if (decision.outcome === 'success') stats.successes++;
      if (decision.outcome === 'failure') stats.failures++;

      if (decision.feedback_score) {
        stats.totalFeedback += decision.feedback_score;
      }
    }

    // Generate insights
    for (const [actionType, stats] of Object.entries(byActionType)) {
      if (stats.total < this.minSampleSize) continue;

      const successRate = (stats.successes / stats.total) * 100;
      stats.avgFeedback = stats.totalFeedback / stats.total;

      if (successRate >= 80) {
        insights.push({
          business_name: 'all',
          category: 'action_performance',
          insight_type: 'pattern',
          title: `${actionType} has high success rate`,
          description: `Action "${actionType}" succeeds ${successRate.toFixed(1)}% of the time (${stats.successes}/${stats.total})`,
          confidence_score: this.calculateConfidence(stats.total),
          impact_level: successRate >= 90 ? 'high' : 'medium',
          potential_value: stats.avgFeedback * 100, // Rough estimate
          evidence: {
            data_points: stats.total,
            success_rate: successRate,
            avg_feedback: stats.avgFeedback
          },
          applicable_to: ['maggie-forbes', 'growth-manager-pro']
        });
      }

      if (successRate < 40) {
        insights.push({
          business_name: 'all',
          category: 'action_performance',
          insight_type: 'pattern',
          title: `${actionType} has low success rate`,
          description: `Action "${actionType}" only succeeds ${successRate.toFixed(1)}% of the time. Consider avoiding or optimizing.`,
          confidence_score: this.calculateConfidence(stats.total),
          impact_level: 'high',
          potential_value: -stats.avgFeedback * 100, // Negative value (avoiding cost)
          evidence: {
            data_points: stats.total,
            success_rate: successRate,
            avg_feedback: stats.avgFeedback
          },
          applicable_to: ['maggie-forbes', 'growth-manager-pro']
        });
      }
    }

    return insights;
  }

  // ==========================================
  // ANALYZE TIMING PATTERNS
  // ==========================================

  async analyzeTimingPatterns() {
    const insights = [];

    // Get decisions with timestamps
    const { data: decisions } = await this.supabase
      .from('agi_decisions')
      .select('*')
      .not('completed_at', 'is', null)
      .gte('executed_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()); // Last 90 days

    if (!decisions || decisions.length < this.minSampleSize) {
      return insights;
    }

    // Analyze by day of week
    const byDayOfWeek = Array(7).fill(0).map(() => ({ total: 0, successes: 0 }));
    const byHourOfDay = Array(24).fill(0).map(() => ({ total: 0, successes: 0 }));

    for (const decision of decisions) {
      const date = new Date(decision.executed_at);
      const dayOfWeek = date.getDay();
      const hourOfDay = date.getHours();

      byDayOfWeek[dayOfWeek].total++;
      byHourOfDay[hourOfDay].total++;

      if (decision.outcome === 'success') {
        byDayOfWeek[dayOfWeek].successes++;
        byHourOfDay[hourOfDay].successes++;
      }
    }

    // Find best day
    let bestDay = 0;
    let bestDayRate = 0;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      if (byDayOfWeek[i].total >= 5) { // Need at least 5 samples
        const rate = (byDayOfWeek[i].successes / byDayOfWeek[i].total) * 100;
        if (rate > bestDayRate) {
          bestDay = i;
          bestDayRate = rate;
        }
      }
    }

    if (bestDayRate >= 70) {
      insights.push({
        business_name: 'all',
        category: 'timing',
        insight_type: 'pattern',
        title: `${dayNames[bestDay]} has highest success rate`,
        description: `Actions executed on ${dayNames[bestDay]} succeed ${bestDayRate.toFixed(1)}% of the time`,
        confidence_score: this.calculateConfidence(byDayOfWeek[bestDay].total),
        impact_level: 'medium',
        potential_value: 5000,
        evidence: {
          day: dayNames[bestDay],
          success_rate: bestDayRate,
          sample_size: byDayOfWeek[bestDay].total
        },
        applicable_to: ['maggie-forbes', 'growth-manager-pro']
      });
    }

    return insights;
  }

  // ==========================================
  // ANALYZE STRATEGIES
  // ==========================================

  async analyzeStrategies() {
    const insights = [];

    // Get strategy performance
    const { data: strategies } = await this.supabase
      .from('agi_strategies')
      .select('*')
      .gte('times_executed', this.minSampleSize);

    if (!strategies) return insights;

    for (const strategy of strategies) {
      // High-performing strategy
      if (strategy.success_rate >= 80 && strategy.avg_roi >= 2) {
        insights.push({
          business_name: strategy.business_name,
          category: 'strategy',
          insight_type: 'validated',
          title: `Strategy "${strategy.strategy_name}" is highly effective`,
          description: `${strategy.success_rate}% success rate with ${strategy.avg_roi}x ROI. Execute more frequently.`,
          confidence_score: this.calculateConfidence(strategy.times_executed),
          impact_level: 'high',
          potential_value: strategy.total_revenue_generated,
          evidence: {
            executions: strategy.times_executed,
            success_rate: strategy.success_rate,
            roi: strategy.avg_roi,
            revenue: strategy.total_revenue_generated
          },
          applicable_to: [strategy.business_name]
        });
      }

      // Poor-performing strategy
      if (strategy.success_rate < 40 && strategy.times_executed >= this.minSampleSize) {
        insights.push({
          business_name: strategy.business_name,
          category: 'strategy',
          insight_type: 'validated',
          title: `Strategy "${strategy.strategy_name}" is underperforming`,
          description: `Only ${strategy.success_rate}% success rate. Consider retiring or optimizing.`,
          confidence_score: this.calculateConfidence(strategy.times_executed),
          impact_level: 'high',
          potential_value: -strategy.total_cost, // Avoid wasting money
          evidence: {
            executions: strategy.times_executed,
            success_rate: strategy.success_rate,
            cost: strategy.total_cost
          },
          applicable_to: [strategy.business_name]
        });
      }
    }

    return insights;
  }

  // ==========================================
  // DISCOVER CORRELATIONS
  // ==========================================

  async discoverCorrelations() {
    const insights = [];

    // Use AI to discover patterns in decisions
    const { data: recentDecisions } = await this.supabase
      .from('agi_decisions')
      .select('*')
      .not('completed_at', 'is', null)
      .order('executed_at', { ascending: false })
      .limit(100);

    if (!recentDecisions || recentDecisions.length < 30) {
      return insights; // Need more data
    }

    // Ask AI to find patterns
    const prompt = `
Analyze these business decisions and find patterns:

${JSON.stringify(recentDecisions.slice(0, 50), null, 2)}

Identify:
1. What factors correlate with success?
2. What factors correlate with failure?
3. Are there any unexpected patterns?

Return insights in this format:
{
  "insights": [
    {
      "title": "Short title",
      "description": "Detailed description",
      "correlation": "positive or negative",
      "confidence": 1-100
    }
  ]
}
`;

    try {
      const response = await orchestrator.execute('analysis', prompt);
      const aiInsights = JSON.parse(response);

      for (const aiInsight of aiInsights.insights || []) {
        if (aiInsight.confidence >= this.confidenceThreshold) {
          insights.push({
            business_name: 'all',
            category: 'correlation',
            insight_type: 'pattern',
            title: aiInsight.title,
            description: aiInsight.description,
            confidence_score: aiInsight.confidence,
            impact_level: 'medium',
            potential_value: 10000, // Placeholder
            evidence: {
              correlation: aiInsight.correlation,
              ai_discovered: true
            },
            applicable_to: ['maggie-forbes', 'growth-manager-pro']
          });
        }
      }
    } catch (error) {
      console.error('  ⚠️  AI analysis failed:', error.message);
    }

    return insights;
  }

  // ==========================================
  // SAVE INSIGHT
  // ==========================================

  async saveInsight(insight) {
    // Check if this insight already exists
    const { data: existing } = await this.supabase
      .from('agi_insights')
      .select('*')
      .eq('title', insight.title)
      .single();

    if (existing) {
      // Update existing insight with new confidence/data
      await this.supabase
        .from('agi_insights')
        .update({
          confidence_score: insight.confidence_score,
          evidence: insight.evidence,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Insert new insight
      await this.supabase
        .from('agi_insights')
        .insert(insight);
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  calculateConfidence(sampleSize) {
    // Confidence increases with sample size, caps at 95%
    if (sampleSize < 5) return 20;
    if (sampleSize < 10) return 40;
    if (sampleSize < 25) return 60;
    if (sampleSize < 50) return 75;
    if (sampleSize < 100) return 85;
    return 95;
  }

  // ==========================================
  // RETRIEVE INSIGHTS
  // ==========================================

  async getInsights(businessId = null, impactLevel = null) {
    let query = this.supabase
      .from('agi_insights')
      .select('*')
      .gte('confidence_score', this.confidenceThreshold)
      .order('potential_value', { ascending: false });

    if (businessId) {
      query = query.or(`business_name.eq.${businessId},applicable_to.cs.{${businessId}}`);
    }

    if (impactLevel) {
      query = query.eq('impact_level', impactLevel);
    }

    const { data } = await query;
    return data || [];
  }

  async getTopInsights(limit = 5) {
    const { data } = await this.supabase
      .from('agi_insights')
      .select('*')
      .eq('status', 'discovered')
      .in('impact_level', ['critical', 'high'])
      .gte('confidence_score', this.confidenceThreshold)
      .order('potential_value', { ascending: false })
      .limit(limit);

    return data || [];
  }
}

// ==========================================
// EXPORTS
// ==========================================

const learningEngine = new LearningEngine();

module.exports = learningEngine;

// Test if running directly
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing Learning Engine...\n');

    const insights = await learningEngine.analyzePastDecisions();
    console.log(`\n💡 Discovered ${insights.length} insights:`);
    for (const insight of insights) {
      console.log(`  • ${insight.title} (${insight.confidence_score}% confidence)`);
    }

    const topInsights = await learningEngine.getTopInsights(3);
    console.log(`\n🏆 Top 3 actionable insights:`);
    for (const insight of topInsights) {
      console.log(`  • ${insight.title}`);
      console.log(`    ${insight.description}`);
    }

  })().catch(console.error);
}
