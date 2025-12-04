// ============================================
// STRATEGY OPTIMIZER - The AGI's Decision Maker
// ============================================
// Decides the optimal actions to take based on current state and learned insights

const { createClient } = require('@supabase/supabase-js');
const orchestrator = require('./ai-orchestrator');
const learningEngine = require('./learning-engine');

class StrategyOptimizer {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
  }

  // ==========================================
  // MAIN OPTIMIZATION METHOD
  // ==========================================

  async determineOptimalAction(priority) {
    console.log(`    🎯 Optimizing action for: ${priority.issue || priority.opportunity}`);

    // Get relevant insights from learning engine
    const insights = await learningEngine.getInsights(priority.business);

    // Build context for AI decision-making
    const context = {
      business: priority.business,
      situation: priority,
      insights: insights.slice(0, 5), // Top 5 relevant insights
      currentState: await this.getCurrentState(priority.business),
      pastPerformance: await this.getPastPerformance(priority.business)
    };

    // Determine action type based on priority
    let action = null;

    if (priority.type === 'threat') {
      action = await this.handleThreat(context);
    } else if (priority.type === 'opportunity') {
      action = await this.handleOpportunity(context);
    }

    return action;
  }

  // ==========================================
  // HANDLE THREATS
  // ==========================================

  async handleThreat(context) {
    const { situation, business } = context;

    // Map threats to actions
    if (situation.issue === 'Low health score') {
      // Health is low - need immediate intervention
      return {
        business,
        situation: `Business health is critically low (${situation.details})`,
        decision: 'Generate emergency leads to boost health',
        reasoning: 'Low health score indicates declining metrics. Lead generation is fastest way to recover.',
        type: 'generate_leads',
        details: {
          criteria: await this.getBestLeadCriteria(business),
          count: 20, // Emergency mode
          urgency: 'high'
        },
        description: `Generate 20 high-quality leads immediately for ${business}`,
        confidence: 75,
        risk: 'medium'
      };
    }

    if (situation.issue === 'Declining trend') {
      // Metrics declining - analyze and adjust
      return {
        business,
        situation: 'Business metrics are trending downward',
        decision: 'Run experiment to test new strategy',
        reasoning: 'Current strategy is not working. Need to test alternatives.',
        type: 'run_experiment',
        details: {
          name: `strategy-test-${Date.now()}`,
          hypothesis: 'New lead source will improve conversion rate',
          variantA: { source: 'current' },
          variantB: { source: 'alternative' },
          successMetric: 'conversion_rate',
          sampleSize: 50
        },
        description: `Test new strategy for ${business}`,
        confidence: 65,
        risk: 'low'
      };
    }

    if (situation.issue === 'Conversion rate critically low') {
      // Need to optimize sales process
      return {
        business,
        situation: 'Conversions are below critical threshold',
        decision: 'Create nurture content to improve conversions',
        reasoning: 'Low conversion suggests leads need more nurturing before closing.',
        type: 'create_content',
        details: {
          topic: await this.getBestContentTopic(business, 'nurture'),
          contentType: 'email-sequence',
          goal: 'increase_conversions'
        },
        description: `Create nurture email sequence for ${business}`,
        confidence: 70,
        risk: 'low'
      };
    }

    // Default threat response
    return null;
  }

  // ==========================================
  // HANDLE OPPORTUNITIES
  // ==========================================

  async handleOpportunity(context) {
    const { situation, business, insights } = context;

    // Parse the opportunity
    const metric = situation.opportunity.replace('Increase ', '');

    if (metric === 'leads' || metric === 'signups') {
      // Opportunity to grow top-of-funnel
      return {
        business,
        situation: `Gap in ${metric}: ${situation.potential} potential value`,
        decision: `Generate more ${metric}`,
        reasoning: `${metric} gap represents significant revenue opportunity. Use proven lead generation strategy.`,
        type: 'generate_leads',
        details: {
          criteria: await this.getBestLeadCriteria(business, insights),
          count: Math.min(Math.floor(situation.priority / 10), 50), // Scale with priority
          urgency: situation.priority > 80 ? 'high' : 'medium'
        },
        description: `Generate leads to close ${metric} gap for ${business}`,
        confidence: 80,
        risk: 'low'
      };
    }

    if (metric === 'conversions') {
      // Opportunity to improve conversion rate
      return {
        business,
        situation: 'Conversion rate below target',
        decision: 'Create high-value content + outreach',
        reasoning: 'Combine content creation with targeted outreach to existing leads.',
        type: 'create_content',
        details: {
          topic: await this.getBestContentTopic(business, 'conversion'),
          contentType: 'case-study',
          followUp: 'outreach'
        },
        description: `Create case study and launch outreach campaign for ${business}`,
        confidence: 75,
        risk: 'low'
      };
    }

    if (metric === 'revenue' || metric === 'mrr') {
      // Direct revenue opportunity
      return {
        business,
        situation: `Revenue gap: $${situation.potential} potential`,
        decision: 'Multi-pronged revenue acceleration',
        reasoning: 'Maximize revenue with lead gen + upsell content.',
        type: 'generate_leads',
        details: {
          criteria: await this.getBestLeadCriteria(business, insights, 'high-value'),
          count: 15,
          urgency: 'high',
          followUpWith: 'premium-offer-content'
        },
        description: `Launch premium lead generation campaign for ${business}`,
        confidence: 85,
        risk: 'medium'
      };
    }

    // Default opportunity response
    return null;
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  async getCurrentState(business) {
    const { data } = await this.supabase
      .from('agi_business_state')
      .select('*')
      .eq('business_name', business)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    return data || {};
  }

  async getPastPerformance(business) {
    // Get performance over last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { data: decisions } = await this.supabase
      .from('agi_decisions')
      .select('*')
      .eq('business_name', business)
      .gte('executed_at', thirtyDaysAgo.toISOString());

    if (!decisions || decisions.length === 0) {
      return {
        totalActions: 0,
        successRate: 0,
        avgFeedback: 0
      };
    }

    const successes = decisions.filter(d => d.outcome === 'success').length;
    const totalFeedback = decisions.reduce((sum, d) => sum + (d.feedback_score || 0), 0);

    return {
      totalActions: decisions.length,
      successRate: (successes / decisions.length) * 100,
      avgFeedback: totalFeedback / decisions.length
    };
  }

  async getBestLeadCriteria(business, insights = [], tier = 'standard') {
    // Use insights to determine best lead sources

    const criteria = {
      'maggie-forbes': {
        standard: {
          targetIndustry: 'business strategy consulting',
          jobTitles: ['CEO', 'Founder', 'Business Owner'],
          companySize: '10-500 employees',
          budget: '$25K+',
          painPoints: ['scaling', 'strategy', 'optimization']
        },
        'high-value': {
          targetIndustry: 'high-end business consulting',
          jobTitles: ['CEO', 'President', 'C-Suite'],
          companySize: '100-1000 employees',
          budget: '$50K+',
          painPoints: ['transformation', 'expansion', 'M&A']
        }
      },
      'growth-manager-pro': {
        standard: {
          targetIndustry: 'solopreneurs and small business',
          jobTitles: ['Founder', 'Solopreneur', 'Freelancer'],
          companySize: '1-10 employees',
          budget: '$50-200/month',
          painPoints: ['growth', 'marketing', 'automation']
        },
        'high-value': {
          targetIndustry: 'growing startups',
          jobTitles: ['Founder', 'CEO', 'Growth Lead'],
          companySize: '10-50 employees',
          budget: '$200-500/month',
          painPoints: ['scaling', 'systems', 'team building']
        }
      }
    };

    return criteria[business][tier] || criteria[business].standard;
  }

  async getBestContentTopic(business, goal = 'general') {
    // AI-powered content topic selection
    const prompt = `
Business: ${business}
Goal: ${goal}
Current state: Needs to ${goal === 'nurture' ? 'nurture leads into conversions' : 'attract and convert leads'}

Suggest the single best content topic that would help achieve this goal.
Return just the topic as a string, no explanation.
`;

    try {
      const topic = await orchestrator.execute('content', prompt);
      return topic.trim();
    } catch (error) {
      // Fallback topics
      const fallbacks = {
        'maggie-forbes': {
          nurture: 'How to 10x Your Business Revenue in 90 Days',
          conversion: '5 Signs You Need a Strategic Business Advisor',
          general: 'The Strategic Advantage: Why Top CEOs Invest in Business Strategy'
        },
        'growth-manager-pro': {
          nurture: 'The Complete Guide to Growing Your Solo Business',
          conversion: 'From Side Hustle to 6-Figure Business',
          general: 'Automated Growth: How to Scale Without Burning Out'
        }
      };

      return fallbacks[business][goal] || fallbacks[business].general;
    }
  }

  // ==========================================
  // STRATEGY EVALUATION
  // ==========================================

  async evaluateStrategy(strategyName, business) {
    const { data: strategy } = await this.supabase
      .from('agi_strategies')
      .select('*')
      .eq('business_name', business)
      .eq('strategy_name', strategyName)
      .single();

    if (!strategy) {
      return { shouldUse: false, reason: 'Strategy not found' };
    }

    // Evaluate based on past performance
    if (strategy.times_executed >= 10) {
      if (strategy.success_rate >= 70 && strategy.avg_roi >= 1.5) {
        return {
          shouldUse: true,
          reason: `Proven strategy with ${strategy.success_rate}% success rate`,
          confidence: 90
        };
      }

      if (strategy.success_rate < 40) {
        return {
          shouldUse: false,
          reason: `Low success rate (${strategy.success_rate}%)`,
          confidence: 80
        };
      }
    }

    // Not enough data yet
    return {
      shouldUse: true,
      reason: 'Testing phase - need more data',
      confidence: 50
    };
  }

  // ==========================================
  // PRIORITY SCORING
  // ==========================================

  scorePriority(priority) {
    let score = priority.priority || 50;

    // Adjust based on type
    if (priority.type === 'threat') {
      if (priority.severity === 'critical') score += 50;
      if (priority.severity === 'high') score += 30;
    }

    // Adjust based on potential value
    if (priority.potential) {
      score += Math.min(priority.potential / 1000, 20); // Cap at +20
    }

    return Math.min(score, 100); // Cap at 100
  }
}

// ==========================================
// EXPORTS
// ==========================================

const strategyOptimizer = new StrategyOptimizer();

module.exports = strategyOptimizer;

// Test if running directly
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing Strategy Optimizer...\n');

    // Test threat handling
    const threat = {
      type: 'threat',
      business: 'maggie-forbes',
      issue: 'Low health score',
      severity: 'high',
      details: 'Health is 45/100',
      priority: 100
    };

    const threatAction = await strategyOptimizer.determineOptimalAction(threat);
    console.log('\n🚨 Threat Action:');
    console.log(JSON.stringify(threatAction, null, 2));

    // Test opportunity handling
    const opportunity = {
      type: 'opportunity',
      business: 'growth-manager-pro',
      opportunity: 'Increase leads',
      potential: 50000,
      priority: 85
    };

    const oppAction = await strategyOptimizer.determineOptimalAction(opportunity);
    console.log('\n✨ Opportunity Action:');
    console.log(JSON.stringify(oppAction, null, 2));

  })().catch(console.error);
}
