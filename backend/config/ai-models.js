// AI Model Configuration & Cost Protection
// This manages all AI API keys and routes to cheapest models first

module.exports = {
  // Daily spending cap (in dollars)
  DAILY_SPENDING_CAP: 5.00,

  // Model configurations with cost per 1M tokens
  models: {
    // FREE TIER (use first)
    gemini: {
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      inputCostPer1M: 0.00, // Free tier: 1500 req/day
      outputCostPer1M: 0.00,
      dailyLimit: 1500,
      rateLimit: 15, // requests per minute
      useCases: ['content', 'analysis', 'bulk'],
      priority: 1 // Use first
    },

    // CHEAP TIER
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      provider: 'openai',
      inputCostPer1M: 0.15,
      outputCostPer1M: 0.60,
      dailyLimit: null, // No hard limit
      rateLimit: 500, // requests per minute
      useCases: ['content', 'quick-analysis', 'bulk'],
      priority: 2
    },

    'claude-haiku': {
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      inputCostPer1M: 0.25,
      outputCostPer1M: 1.25,
      dailyLimit: null,
      rateLimit: 50,
      useCases: ['fast-decisions', 'content', 'analysis'],
      priority: 3
    },

    // MEDIUM TIER
    'gpt-4o': {
      name: 'GPT-4o',
      provider: 'openai',
      inputCostPer1M: 2.50,
      outputCostPer1M: 10.00,
      dailyLimit: null,
      rateLimit: 500,
      useCases: ['complex-analysis', 'creative'],
      priority: 4
    },

    'perplexity': {
      name: 'Perplexity',
      provider: 'perplexity',
      inputCostPer1M: 1.00, // Estimate
      outputCostPer1M: 1.00,
      dailyLimit: null,
      rateLimit: 50,
      useCases: ['research', 'deep-analysis'],
      priority: 5
    },

    // EXPENSIVE TIER (use sparingly)
    'claude-sonnet': {
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      inputCostPer1M: 3.00,
      outputCostPer1M: 15.00,
      dailyLimit: null,
      rateLimit: 50,
      useCases: ['complex-problems', 'coding', 'strategic'],
      priority: 6 // Use last
    }
  },

  // Task to Model Mapping (cheapest first)
  taskRouting: {
    'content-generation': ['gemini', 'gpt-4o-mini', 'claude-haiku'],
    'lead-research': ['gemini', 'perplexity', 'gpt-4o-mini'],
    'market-analysis': ['perplexity', 'gpt-4o', 'claude-sonnet'],
    'code-generation': ['gpt-4o-mini', 'claude-sonnet'],
    'strategy': ['gpt-4o', 'claude-sonnet'],
    'quick-task': ['gemini', 'gpt-4o-mini'],
    'deep-research': ['perplexity', 'gpt-4o']
  }
};
