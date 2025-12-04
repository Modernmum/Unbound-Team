// ============================================
// CROSS-POLLINATOR - The AGI's Knowledge Bridge
// ============================================
// Shares winning strategies between Maggie Forbes and Growth Manager Pro
// "What works in one business might work in the other"

const { createClient } = require('@supabase/supabase-js');
const orchestrator = require('./ai-orchestrator');

class CrossPollinator {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    this.businesses = ['maggie-forbes', 'growth-manager-pro'];
    this.minSuccessRate = 75; // Only transfer strategies with 75%+ success
    this.minSampleSize = 10; // Need at least 10 executions to trust a strategy
  }

  // ==========================================
  // MAIN KNOWLEDGE TRANSFER METHOD
  // ==========================================

  async transferKnowledge() {
    console.log('  🔀 Looking for knowledge to transfer between businesses...');

    const transfers = [];

    // 1. Find successful strategies in each business
    const maggieStrategies = await this.getSuccessfulStrategies('maggie-forbes');
    const gmpStrategies = await this.getSuccessfulStrategies('growth-manager-pro');

    // 2. Transfer Maggie Forbes strategies to GMP
    for (const strategy of maggieStrategies) {
      const transfer = await this.considerTransfer(strategy, 'maggie-forbes', 'growth-manager-pro');
      if (transfer) {
        transfers.push(transfer);
      }
    }

    // 3. Transfer GMP strategies to Maggie Forbes
    for (const strategy of gmpStrategies) {
      const transfer = await this.considerTransfer(strategy, 'growth-manager-pro', 'maggie-forbes');
      if (transfer) {
        transfers.push(transfer);
      }
    }

    // 4. Find universal insights (work across both businesses)
    const universalInsights = await this.findUniversalInsights();
    transfers.push(...universalInsights);

    return transfers;
  }

  // ==========================================
  // GET SUCCESSFUL STRATEGIES
  // ==========================================

  async getSuccessfulStrategies(business) {
    const { data: strategies } = await this.supabase
      .from('agi_strategies')
      .select('*')
      .eq('business_name', business)
      .eq('status', 'active')
      .gte('times_executed', this.minSuccessRate)
      .gte('success_rate', this.minSuccessRate)
      .order('avg_roi', { ascending: false });

    return strategies || [];
  }

  // ==========================================
  // CONSIDER TRANSFER
  // ==========================================

  async considerTransfer(strategy, sourceBusiness, targetBusiness) {
    // Check if already transferred
    const { data: existingTransfer } = await this.supabase
      .from('agi_knowledge_transfer')
      .select('*')
      .eq('source_business', sourceBusiness)
      .eq('source_strategy', strategy.strategy_name)
      .eq('transferred_to', targetBusiness)
      .single();

    if (existingTransfer) {
      return null; // Already transferred
    }

    // Use AI to determine if strategy is transferable
    const isTransferable = await this.assessTransferability(strategy, sourceBusiness, targetBusiness);

    if (!isTransferable.shouldTransfer) {
      return null;
    }

    // Adapt the strategy for target business
    const adaptedStrategy = await this.adaptStrategy(strategy, sourceBusiness, targetBusiness);

    // Record the transfer
    const { data: transfer } = await this.supabase
      .from('agi_knowledge_transfer')
      .insert({
        source_business: sourceBusiness,
        source_strategy: strategy.strategy_name,
        source_results: {
          success_rate: strategy.success_rate,
          avg_roi: strategy.avg_roi,
          times_executed: strategy.times_executed
        },
        transferred_to: targetBusiness,
        adapted: adaptedStrategy.wasAdapted,
        adaptations: adaptedStrategy.changes,
        status: 'testing'
      })
      .select()
      .single();

    // Create the new strategy in target business
    await this.supabase
      .from('agi_strategies')
      .insert({
        business_name: targetBusiness,
        strategy_name: `${strategy.strategy_name}-from-${sourceBusiness}`,
        strategy_type: strategy.strategy_type,
        description: `Adapted from ${sourceBusiness}: ${strategy.description}`,
        parameters: adaptedStrategy.parameters,
        status: 'testing' // Start in testing mode
      });

    console.log(`    ✅ Transferred: ${strategy.strategy_name} from ${sourceBusiness} to ${targetBusiness}`);

    return {
      source: sourceBusiness,
      target: targetBusiness,
      strategy: strategy.strategy_name,
      confidence: isTransferable.confidence,
      reasoning: isTransferable.reasoning
    };
  }

  // ==========================================
  // ASSESS TRANSFERABILITY
  // ==========================================

  async assessTransferability(strategy, sourceBusiness, targetBusiness) {
    const prompt = `
Analyze if this strategy from ${sourceBusiness} would work for ${targetBusiness}:

Strategy: ${strategy.strategy_name}
Type: ${strategy.strategy_type}
Description: ${strategy.description}
Success Rate: ${strategy.success_rate}%
ROI: ${strategy.avg_roi}x

Source Business (${sourceBusiness}):
${sourceBusiness === 'maggie-forbes' ?
  '- High-end business consulting ($25K+ clients)\n- Target: CEOs, executives\n- Goal: $250K/month' :
  '- SaaS for solopreneurs ($50-200/month)\n- Target: Small business owners\n- Goal: $60K/month MRR'
}

Target Business (${targetBusiness}):
${targetBusiness === 'maggie-forbes' ?
  '- High-end business consulting ($25K+ clients)\n- Target: CEOs, executives\n- Goal: $250K/month' :
  '- SaaS for solopreneurs ($50-200/month)\n- Target: Small business owners\n- Goal: $60K/month MRR'
}

Respond in JSON:
{
  "shouldTransfer": true/false,
  "confidence": 0-100,
  "reasoning": "why or why not",
  "adaptationsNeeded": ["what needs to change"]
}
`;

    try {
      const response = await orchestrator.execute('analysis', prompt);
      const assessment = JSON.parse(response);
      return assessment;
    } catch (error) {
      console.error('    ⚠️  AI assessment failed, using heuristics');
      return this.heuristicAssessment(strategy, sourceBusiness, targetBusiness);
    }
  }

  // ==========================================
  // HEURISTIC ASSESSMENT
  // ==========================================

  heuristicAssessment(strategy, sourceBusiness, targetBusiness) {
    // Simple rules for transfer
    const universalTypes = ['content', 'discovery', 'automation', 'social-proof'];

    if (universalTypes.includes(strategy.strategy_type)) {
      return {
        shouldTransfer: true,
        confidence: 70,
        reasoning: 'Universal strategy type that works across businesses',
        adaptationsNeeded: ['Adjust messaging for target audience', 'Update pricing references']
      };
    }

    // Lead generation often transfers well
    if (strategy.strategy_type === 'lead_generation') {
      return {
        shouldTransfer: true,
        confidence: 65,
        reasoning: 'Lead generation strategies often transfer, but need audience adaptation',
        adaptationsNeeded: ['Change target audience', 'Adjust qualification criteria', 'Update messaging']
      };
    }

    // Sales/pricing is business-specific
    if (strategy.strategy_type === 'sales' || strategy.strategy_type === 'pricing') {
      return {
        shouldTransfer: false,
        confidence: 80,
        reasoning: 'Sales and pricing strategies are too business-specific',
        adaptationsNeeded: []
      };
    }

    // Default: cautiously transfer
    return {
      shouldTransfer: true,
      confidence: 50,
      reasoning: 'Unknown strategy type - testing recommended',
      adaptationsNeeded: ['Review and adapt all parameters']
    };
  }

  // ==========================================
  // ADAPT STRATEGY
  // ==========================================

  async adaptStrategy(strategy, sourceBusiness, targetBusiness) {
    const prompt = `
Adapt this strategy from ${sourceBusiness} for ${targetBusiness}:

Original Strategy Parameters:
${JSON.stringify(strategy.parameters, null, 2)}

What needs to change? Provide adapted parameters.

Respond in JSON:
{
  "parameters": { adapted parameters },
  "changes": ["list of changes made"]
}
`;

    try {
      const response = await orchestrator.execute('analysis', prompt);
      const adapted = JSON.parse(response);
      return {
        wasAdapted: true,
        parameters: adapted.parameters,
        changes: adapted.changes
      };
    } catch (error) {
      // Fallback: just copy parameters
      return {
        wasAdapted: false,
        parameters: strategy.parameters,
        changes: []
      };
    }
  }

  // ==========================================
  // FIND UNIVERSAL INSIGHTS
  // ==========================================

  async findUniversalInsights() {
    const transfers = [];

    // Find insights that work well in one business and might work in the other
    const { data: insights } = await this.supabase
      .from('agi_insights')
      .select('*')
      .gte('confidence_score', 80)
      .in('impact_level', ['high', 'critical'])
      .eq('status', 'validated');

    if (!insights) return transfers;

    for (const insight of insights) {
      // If insight is for one business, consider applying to the other
      if (insight.business_name !== 'all') {
        const targetBusiness = insight.business_name === 'maggie-forbes' ?
          'growth-manager-pro' : 'maggie-forbes';

        // Check if applicable
        const applicable = insight.applicable_to || [];
        if (!applicable.includes(targetBusiness)) {
          // Use AI to assess if it should apply
          const shouldApply = await this.assessInsightTransfer(insight, targetBusiness);

          if (shouldApply) {
            // Update insight to apply to both businesses
            await this.supabase
              .from('agi_insights')
              .update({
                applicable_to: [...applicable, targetBusiness],
                business_name: 'all'
              })
              .eq('id', insight.id);

            transfers.push({
              source: insight.business_name,
              target: targetBusiness,
              strategy: `Insight: ${insight.title}`,
              confidence: insight.confidence_score,
              reasoning: 'Universal insight applies to both businesses'
            });
          }
        }
      }
    }

    return transfers;
  }

  // ==========================================
  // ASSESS INSIGHT TRANSFER
  // ==========================================

  async assessInsightTransfer(insight, targetBusiness) {
    // Quick heuristics for insight transfer
    const universalKeywords = [
      'timing', 'day of week', 'time of day',
      'content', 'engagement', 'response rate',
      'lead source', 'conversion', 'follow-up'
    ];

    const insightText = (insight.title + ' ' + insight.description).toLowerCase();

    for (const keyword of universalKeywords) {
      if (insightText.includes(keyword)) {
        return true; // Likely universal
      }
    }

    // Business-specific keywords that don't transfer
    const specificKeywords = [
      'price', 'pricing', '$', 'enterprise', 'solopreneur'
    ];

    for (const keyword of specificKeywords) {
      if (insightText.includes(keyword)) {
        return false; // Too specific
      }
    }

    return false; // Default: don't transfer unless confident
  }

  // ==========================================
  // UPDATE TRANSFER STATUS
  // ==========================================

  async updateTransferStatus(transferId, status, results) {
    await this.supabase
      .from('agi_knowledge_transfer')
      .update({
        status,
        target_results: results,
        conclusion: this.generateConclusion(status, results)
      })
      .eq('id', transferId);
  }

  generateConclusion(status, results) {
    if (status === 'success') {
      return `Strategy successfully transferred. ${results.success_rate}% success rate in target business.`;
    } else if (status === 'failure') {
      return `Strategy did not transfer well. Only ${results.success_rate}% success rate. Needs further adaptation.`;
    } else {
      return 'Still testing...';
    }
  }

  // ==========================================
  // GET TRANSFER HISTORY
  // ==========================================

  async getTransferHistory() {
    const { data } = await this.supabase
      .from('agi_knowledge_transfer')
      .select('*')
      .order('transferred_at', { ascending: false })
      .limit(50);

    return data || [];
  }

  async getSuccessfulTransfers() {
    const { data } = await this.supabase
      .from('agi_knowledge_transfer')
      .select('*')
      .eq('status', 'success')
      .order('transferred_at', { ascending: false });

    return data || [];
  }
}

// ==========================================
// EXPORTS
// ==========================================

const crossPollinator = new CrossPollinator();

module.exports = crossPollinator;

// Test if running directly
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing Cross-Pollinator...\n');

    const transfers = await crossPollinator.transferKnowledge();
    console.log(`\n🔀 Completed ${transfers.length} knowledge transfers:`);
    for (const transfer of transfers) {
      console.log(`  • ${transfer.strategy}: ${transfer.source} → ${transfer.target}`);
      console.log(`    Confidence: ${transfer.confidence}%`);
      console.log(`    Reasoning: ${transfer.reasoning}`);
    }

    const history = await crossPollinator.getTransferHistory();
    console.log(`\n📚 Transfer History: ${history.length} total transfers`);

  })().catch(console.error);
}
