-- ============================================
-- EMPIRE AGI - Intelligence & Learning System
-- ============================================
-- This schema stores the AGI's memory, learning, and decision-making data
-- The AGI monitors both Maggie Forbes and Growth Manager Pro autonomously

-- ============================================
-- 1. BUSINESS STATE TRACKING
-- ============================================
-- Stores current state of each business for AGI monitoring

CREATE TABLE agi_business_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL, -- 'maggie-forbes', 'growth-manager-pro'
  timestamp TIMESTAMP DEFAULT NOW(),

  -- KPIs
  kpis JSONB NOT NULL, -- {"leads": 50, "conversions": 5, "revenue": 25000, "mrr": 10000}

  -- Health metrics
  health_score NUMERIC, -- 0-100
  trend TEXT, -- 'improving', 'stable', 'declining'

  -- Current focus
  current_strategy TEXT,
  active_experiments JSONB, -- [{"name": "pricing-test-1", "status": "active"}]

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast time-series queries
CREATE INDEX idx_business_state_timestamp ON agi_business_state(business_name, timestamp DESC);

-- ============================================
-- 2. AGI LEARNING & INSIGHTS
-- ============================================
-- The AGI learns what works and stores insights

CREATE TABLE agi_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,

  -- Insight details
  category TEXT NOT NULL, -- 'lead_generation', 'content', 'pricing', 'outreach'
  insight_type TEXT NOT NULL, -- 'pattern', 'correlation', 'causation', 'anomaly'

  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Evidence
  confidence_score NUMERIC, -- 0-100 (how sure is the AGI?)
  evidence JSONB, -- {"data_points": 50, "correlation": 0.85, "samples": [...]}

  -- Impact
  impact_level TEXT, -- 'critical', 'high', 'medium', 'low'
  potential_value NUMERIC, -- Estimated $ value of implementing this insight

  -- Status
  status TEXT DEFAULT 'discovered', -- 'discovered', 'testing', 'validated', 'implemented', 'rejected'

  -- Cross-business applicability
  applicable_to JSONB, -- ["maggie-forbes", "growth-manager-pro"]

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example insights the AGI might discover:
-- "LinkedIn posts on Tuesday at 9am get 3x more engagement"
-- "Leads from Reddit convert 40% better than Twitter"
-- "Clients who get results in <48hrs refer 2x more people"
-- "Pricing at $497 converts better than $500 (psychological threshold)"

-- ============================================
-- 3. AGI DECISIONS & ACTIONS
-- ============================================
-- Every action the AGI takes is logged for learning

CREATE TABLE agi_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,

  -- Decision context
  situation TEXT NOT NULL, -- What was happening?
  decision TEXT NOT NULL, -- What did the AGI decide to do?
  reasoning TEXT NOT NULL, -- Why?

  -- Action taken
  action_type TEXT NOT NULL, -- 'generate_leads', 'create_content', 'adjust_pricing', 'send_outreach'
  action_details JSONB, -- Full parameters of what was executed

  -- Confidence & risk
  confidence_score NUMERIC, -- How confident was the AGI in this decision?
  risk_level TEXT, -- 'low', 'medium', 'high'

  -- Results
  executed_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  outcome TEXT, -- 'success', 'failure', 'partial', 'pending'
  results JSONB, -- {"leads_generated": 20, "conversions": 3, "revenue": 1500}

  -- Learning
  learned_from BOOLEAN DEFAULT FALSE,
  feedback_score NUMERIC, -- -100 to +100 (negative = bad outcome, positive = good)

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for learning queries
CREATE INDEX idx_decisions_outcome ON agi_decisions(action_type, outcome);
CREATE INDEX idx_decisions_business ON agi_decisions(business_name, executed_at DESC);

-- ============================================
-- 4. CROSS-BUSINESS KNOWLEDGE TRANSFER
-- ============================================
-- Tracks when strategies are copied between businesses

CREATE TABLE agi_knowledge_transfer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Source
  source_business TEXT NOT NULL, -- Where did this work?
  source_strategy TEXT NOT NULL,
  source_results JSONB, -- What were the results?

  -- Transfer
  transferred_to TEXT NOT NULL, -- Which business are we trying it in?
  transferred_at TIMESTAMP DEFAULT NOW(),

  -- Adaptation
  adapted BOOLEAN DEFAULT FALSE, -- Did we modify the strategy?
  adaptations TEXT, -- How did we change it?

  -- Results
  status TEXT DEFAULT 'testing', -- 'testing', 'success', 'failure'
  target_results JSONB,

  -- Learning
  conclusion TEXT, -- "This strategy works across both businesses" or "Doesn't transfer well"

  created_at TIMESTAMP DEFAULT NOW()
);

-- Example transfers:
-- "Reddit lead gen works for MF → Try for GMP"
-- "Email sequence from GMP → Adapt for MF high-end clients"

-- ============================================
-- 5. AGI STRATEGY PERFORMANCE
-- ============================================
-- Tracks performance of different strategies over time

CREATE TABLE agi_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,

  strategy_name TEXT NOT NULL,
  strategy_type TEXT NOT NULL, -- 'lead_generation', 'content', 'nurture', 'sales'

  description TEXT,
  parameters JSONB, -- Strategy configuration

  -- Performance
  times_executed INTEGER DEFAULT 0,
  success_rate NUMERIC, -- 0-100%
  avg_roi NUMERIC, -- Average return on investment

  total_revenue_generated NUMERIC,
  total_cost NUMERIC,

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'archived'

  -- Learning
  last_executed TIMESTAMP,
  next_scheduled TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. AGI EXPERIMENTS
-- ============================================
-- A/B tests and experiments the AGI runs automatically

CREATE TABLE agi_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,

  experiment_name TEXT NOT NULL,
  hypothesis TEXT NOT NULL, -- "If we do X, then Y will happen"

  -- Test setup
  variant_a JSONB, -- Control
  variant_b JSONB, -- Treatment

  -- Metrics
  success_metric TEXT, -- What are we measuring?
  target_sample_size INTEGER,
  current_sample_size INTEGER DEFAULT 0,

  -- Results
  variant_a_results JSONB,
  variant_b_results JSONB,

  statistical_significance NUMERIC, -- p-value
  winner TEXT, -- 'a', 'b', 'no_difference'

  -- Status
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'cancelled'

  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Example experiments:
-- "Does $497 price point convert better than $500?"
-- "Do case studies in emails increase conversions?"

-- ============================================
-- 7. AGI MEMORY (Long-term patterns)
-- ============================================
-- Long-term patterns the AGI has discovered

CREATE TABLE agi_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  memory_type TEXT NOT NULL, -- 'pattern', 'rule', 'principle', 'best_practice'

  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Evidence base
  observations_count INTEGER, -- How many times has this been observed?
  confidence NUMERIC, -- 0-100

  -- Applicability
  context TEXT, -- When does this apply?
  businesses JSONB, -- Which businesses does this apply to?

  -- Impact
  importance TEXT, -- 'critical', 'high', 'medium', 'low'

  created_at TIMESTAMP DEFAULT NOW(),
  last_validated TIMESTAMP DEFAULT NOW()
);

-- Example memories:
-- "High-end clients prefer phone calls over email"
-- "Content posted on Tuesday gets 2x engagement"
-- "Leads respond better to questions than statements"

-- ============================================
-- 8. AGI GOALS & OBJECTIVES
-- ============================================
-- The AGI's current goals and progress

CREATE TABLE agi_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,

  goal_type TEXT NOT NULL, -- 'revenue', 'growth', 'efficiency', 'quality'

  title TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,

  deadline TIMESTAMP,

  status TEXT DEFAULT 'active', -- 'active', 'achieved', 'failed', 'cancelled'

  -- Progress tracking
  milestones JSONB, -- [{"name": "Get 10 leads", "completed": true}]

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example goals:
-- "Generate $250K revenue for Maggie Forbes by end of Q1"
-- "Reduce lead gen cost to <$10 per lead"
-- "Achieve 5% conversion rate on Growth Manager Pro"

-- ============================================
-- VIEWS FOR AGI ANALYSIS
-- ============================================

-- Recent business performance
CREATE VIEW agi_business_health AS
SELECT
  business_name,
  kpis,
  health_score,
  trend,
  timestamp
FROM agi_business_state
WHERE timestamp > NOW() - INTERVAL '7 days'
ORDER BY business_name, timestamp DESC;

-- Top performing strategies
CREATE VIEW agi_top_strategies AS
SELECT
  business_name,
  strategy_name,
  strategy_type,
  success_rate,
  avg_roi,
  total_revenue_generated,
  times_executed
FROM agi_strategies
WHERE status = 'active' AND times_executed > 5
ORDER BY avg_roi DESC;

-- Recent insights that need action
CREATE VIEW agi_actionable_insights AS
SELECT
  business_name,
  title,
  description,
  confidence_score,
  impact_level,
  potential_value,
  status
FROM agi_insights
WHERE status IN ('discovered', 'validated')
  AND impact_level IN ('critical', 'high')
ORDER BY potential_value DESC;

-- Learning from past decisions
CREATE VIEW agi_decision_analysis AS
SELECT
  action_type,
  COUNT(*) as total_decisions,
  AVG(confidence_score) as avg_confidence,
  SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as success_rate,
  AVG(feedback_score) as avg_feedback
FROM agi_decisions
WHERE completed_at IS NOT NULL
GROUP BY action_type
ORDER BY success_rate DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to record a new AGI decision
CREATE OR REPLACE FUNCTION record_agi_decision(
  p_business_name TEXT,
  p_situation TEXT,
  p_decision TEXT,
  p_reasoning TEXT,
  p_action_type TEXT,
  p_action_details JSONB,
  p_confidence_score NUMERIC,
  p_risk_level TEXT
)
RETURNS UUID AS $$
DECLARE
  v_decision_id UUID;
BEGIN
  INSERT INTO agi_decisions (
    business_name,
    situation,
    decision,
    reasoning,
    action_type,
    action_details,
    confidence_score,
    risk_level,
    outcome
  ) VALUES (
    p_business_name,
    p_situation,
    p_decision,
    p_reasoning,
    p_action_type,
    p_action_details,
    p_confidence_score,
    p_risk_level,
    'pending'
  )
  RETURNING id INTO v_decision_id;

  RETURN v_decision_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update decision outcome
CREATE OR REPLACE FUNCTION update_decision_outcome(
  p_decision_id UUID,
  p_outcome TEXT,
  p_results JSONB,
  p_feedback_score NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE agi_decisions
  SET
    completed_at = NOW(),
    outcome = p_outcome,
    results = p_results,
    feedback_score = p_feedback_score,
    learned_from = TRUE
  WHERE id = p_decision_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Set up initial business tracking
INSERT INTO agi_business_state (business_name, kpis, health_score, trend, current_strategy) VALUES
('maggie-forbes', '{"leads": 0, "conversions": 0, "revenue": 0, "clients": 0}'::jsonb, 50, 'stable', 'bootstrap_with_existing_clients'),
('growth-manager-pro', '{"signups": 0, "mrr": 0, "churn": 0, "ltv": 0}'::jsonb, 50, 'stable', 'student_onboarding');

-- Set up initial goals
INSERT INTO agi_goals (business_name, goal_type, title, target_value, deadline) VALUES
('maggie-forbes', 'revenue', 'Generate $250K/month revenue', 250000, NOW() + INTERVAL '90 days'),
('growth-manager-pro', 'revenue', 'Generate $60K/month MRR', 60000, NOW() + INTERVAL '90 days'),
('maggie-forbes', 'growth', 'Onboard 10 high-end clients', 10, NOW() + INTERVAL '30 days'),
('growth-manager-pro', 'growth', 'Reach 200 active users', 200, NOW() + INTERVAL '60 days');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_insights_status ON agi_insights(status, impact_level);
CREATE INDEX idx_strategies_performance ON agi_strategies(business_name, success_rate DESC);
CREATE INDEX idx_experiments_status ON agi_experiments(business_name, status);
CREATE INDEX idx_memory_importance ON agi_memory(importance, confidence DESC);
CREATE INDEX idx_goals_status ON agi_goals(business_name, status);

-- ============================================
-- COMPLETE!
-- ============================================
-- The AGI now has persistent memory and learning capability.
-- Next: Build the AGI brain that uses this data to make decisions.
