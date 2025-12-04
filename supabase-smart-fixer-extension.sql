-- Smart Auto-Fixer Extension - AI Codebase Analysis + Learning
-- Add these tables to bot testing schema for intelligent auto-fixing
-- Run this AFTER running supabase-bot-testing-service-schema.sql

-- ============================================================================
-- TABLE: client_codebase_knowledge
-- AI-powered analysis of client codebases
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_codebase_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE UNIQUE,

  -- Analysis metadata
  analyzed_at TIMESTAMP DEFAULT NOW(),
  codebase_path VARCHAR(500),
  confidence_score INTEGER, -- 0-10 score of how well we understand the codebase
  last_updated TIMESTAMP DEFAULT NOW(),

  -- Tech Stack
  tech_stack JSONB, -- {framework: 'express', database: 'postgresql', frontend: 'react', etc}

  -- Database Schema
  database_schema JSONB, -- {tables: [...], relationships: [...], indexes: [...]}

  -- API Structure
  api_structure JSONB, -- {endpoints: [{path, method, auth, description}], authMethod: 'JWT'}

  -- Business Rules
  business_rules JSONB, -- {rules: [...], workflows: [...], constraints: [...]}

  -- Code Patterns
  code_patterns JSONB, -- {errorHandling, logging, validation, stateManagement}

  -- AI Understanding
  ai_understanding JSONB, -- {summary, architecture, dataFlow, commonIssues, fixStrategies}

  -- Full Analysis (for reference)
  full_analysis TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_codebase_knowledge_client ON client_codebase_knowledge(client_id);
CREATE INDEX idx_codebase_knowledge_confidence ON client_codebase_knowledge(confidence_score DESC);
CREATE INDEX idx_codebase_knowledge_updated ON client_codebase_knowledge(last_updated DESC);

-- ============================================================================
-- TABLE: fix_history
-- Record of all fixes attempted (for learning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fix_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES bot_test_issues(id) ON DELETE SET NULL,

  -- Issue details
  issue_type VARCHAR(100), -- 'database', 'performance', 'cache', 'session', etc.
  issue_description TEXT,
  issue_severity VARCHAR(20),

  -- Fix details
  fix_type VARCHAR(50), -- 'ai-generated', 'reapplied', 'manual'
  fix_plan JSONB, -- {rootCause, fixSteps, sqlQueries, rollbackPlan, safetyChecks}
  fix_method VARCHAR(100), -- Which method was used to fix

  -- Execution
  fix_successful BOOLEAN DEFAULT false,
  fix_details TEXT,
  execution_time_ms INTEGER,

  -- Code changes (if any)
  code_changes JSONB, -- {files: [{path, before, after}]}
  sql_executed JSONB, -- [{query, rowsAffected}]

  -- Results
  error_message TEXT,
  rollback_executed BOOLEAN DEFAULT false,
  side_effects TEXT,

  -- Tracking
  executed_by VARCHAR(100), -- 'auto-fixer', 'manual-engineer', 'client-request'
  executed_at TIMESTAMP DEFAULT NOW(),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fix_history_client ON fix_history(client_id);
CREATE INDEX idx_fix_history_issue_type ON fix_history(issue_type);
CREATE INDEX idx_fix_history_successful ON fix_history(fix_successful);
CREATE INDEX idx_fix_history_executed ON fix_history(executed_at DESC);

-- Compound index for learning queries
CREATE INDEX idx_fix_history_learn ON fix_history(client_id, issue_type, fix_successful);

-- ============================================================================
-- TABLE: client_code_access
-- Store client repository access credentials (encrypted)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_code_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE UNIQUE,

  -- Repository info
  repo_type VARCHAR(50), -- 'github', 'gitlab', 'bitbucket', 'local'
  repo_url VARCHAR(500),
  branch VARCHAR(100) DEFAULT 'main',

  -- Access credentials (encrypted)
  access_token_encrypted TEXT, -- Encrypted GitHub PAT, etc.
  ssh_key_encrypted TEXT,

  -- Local path (for local repos)
  local_path VARCHAR(500),

  -- Settings
  auto_analyze BOOLEAN DEFAULT true, -- Automatically re-analyze on code changes
  analysis_frequency VARCHAR(50) DEFAULT 'weekly', -- 'daily', 'weekly', 'on-push'

  -- Status
  last_analyzed TIMESTAMP,
  next_analysis_scheduled TIMESTAMP,
  analysis_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_code_access_client ON client_code_access(client_id);
CREATE INDEX idx_code_access_next_analysis ON client_code_access(next_analysis_scheduled);

-- ============================================================================
-- TABLE: ai_fix_suggestions
-- Store AI-generated fix suggestions for review
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_fix_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES bot_test_issues(id) ON DELETE CASCADE,

  -- Suggestion
  suggested_fix JSONB, -- Complete fix plan from AI
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  estimated_risk VARCHAR(20), -- 'low', 'medium', 'high'

  -- Context
  codebase_context JSONB, -- Relevant codebase info used to generate fix
  similar_fixes JSONB, -- Array of similar past fixes

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'executed'
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP,

  -- Execution
  executed BOOLEAN DEFAULT false,
  execution_result JSONB,
  executed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_suggestions_client ON ai_fix_suggestions(client_id);
CREATE INDEX idx_ai_suggestions_status ON ai_fix_suggestions(status);
CREATE INDEX idx_ai_suggestions_confidence ON ai_fix_suggestions(confidence_score DESC);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Fix Success Rate by Issue Type
CREATE OR REPLACE VIEW fix_success_rate AS
SELECT
  client_id,
  issue_type,
  COUNT(*) AS total_fixes,
  COUNT(*) FILTER (WHERE fix_successful = true) AS successful_fixes,
  ROUND(
    (COUNT(*) FILTER (WHERE fix_successful = true)::DECIMAL / COUNT(*)) * 100,
    2
  ) AS success_rate_percent,
  AVG(execution_time_ms) AS avg_execution_time_ms
FROM fix_history
GROUP BY client_id, issue_type
ORDER BY success_rate_percent DESC;

-- View: Learning Progress
CREATE OR REPLACE VIEW learning_progress AS
SELECT
  c.id AS client_id,
  c.client_name,
  ck.confidence_score,
  ck.last_updated AS knowledge_updated,

  -- Fix stats
  COUNT(fh.id) AS total_fixes_attempted,
  COUNT(fh.id) FILTER (WHERE fh.fix_successful = true) AS successful_fixes,
  COUNT(fh.id) FILTER (WHERE fh.fix_type = 'reapplied') AS reapplied_fixes,

  -- Learning indicator
  CASE
    WHEN COUNT(fh.id) = 0 THEN 'No fixes yet'
    WHEN COUNT(fh.id) FILTER (WHERE fh.fix_successful = true)::DECIMAL / COUNT(fh.id) > 0.8 THEN 'Expert'
    WHEN COUNT(fh.id) FILTER (WHERE fh.fix_successful = true)::DECIMAL / COUNT(fh.id) > 0.5 THEN 'Learning'
    ELSE 'Beginner'
  END AS learning_stage

FROM testing_clients c
LEFT JOIN client_codebase_knowledge ck ON c.id = ck.client_id
LEFT JOIN fix_history fh ON c.id = fh.client_id
GROUP BY c.id, c.client_name, ck.confidence_score, ck.last_updated;

-- View: Most Fixable Issues
CREATE OR REPLACE VIEW most_fixable_issues AS
SELECT
  issue_type,
  COUNT(*) AS times_encountered,
  COUNT(*) FILTER (WHERE fix_successful = true) AS times_fixed,
  ROUND(
    (COUNT(*) FILTER (WHERE fix_successful = true)::DECIMAL / COUNT(*)) * 100,
    2
  ) AS fix_success_rate,
  AVG(execution_time_ms) AS avg_fix_time_ms
FROM fix_history
GROUP BY issue_type
HAVING COUNT(*) >= 3 -- At least 3 attempts
ORDER BY fix_success_rate DESC, times_encountered DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Get fix recommendations based on history
CREATE OR REPLACE FUNCTION get_fix_recommendation(p_client_id UUID, p_issue_type VARCHAR)
RETURNS TABLE (
  recommended_method VARCHAR,
  success_rate DECIMAL,
  avg_execution_time INTEGER,
  last_successful_fix JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fix_method AS recommended_method,
    (COUNT(*) FILTER (WHERE fix_successful = true)::DECIMAL / COUNT(*))::DECIMAL AS success_rate,
    AVG(execution_time_ms)::INTEGER AS avg_execution_time,
    (
      SELECT fix_plan
      FROM fix_history
      WHERE client_id = p_client_id
        AND issue_type = p_issue_type
        AND fix_successful = true
      ORDER BY executed_at DESC
      LIMIT 1
    ) AS last_successful_fix
  FROM fix_history
  WHERE client_id = p_client_id AND issue_type = p_issue_type
  GROUP BY fix_method
  ORDER BY success_rate DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate learning score (0-100)
CREATE OR REPLACE FUNCTION calculate_learning_score(p_client_id UUID)
RETURNS INTEGER AS $$
DECLARE
  confidence INTEGER;
  fix_count INTEGER;
  success_rate DECIMAL;
  learning_score INTEGER;
BEGIN
  -- Get codebase confidence
  SELECT confidence_score INTO confidence
  FROM client_codebase_knowledge
  WHERE client_id = p_client_id;

  -- Get fix stats
  SELECT
    COUNT(*),
    COALESCE(COUNT(*) FILTER (WHERE fix_successful = true)::DECIMAL / NULLIF(COUNT(*), 0), 0)
  INTO fix_count, success_rate
  FROM fix_history
  WHERE client_id = p_client_id;

  -- Calculate score
  learning_score :=
    (COALESCE(confidence, 0) * 5) +                    -- Codebase understanding (0-50)
    (LEAST(fix_count, 10) * 2) +                       -- Fix experience (0-20)
    ((success_rate * 30)::INTEGER);                     -- Fix success rate (0-30)

  RETURN LEAST(100, learning_score);
END;
$$ LANGUAGE plpgsql;

-- Function: Suggest best persona for testing based on past issues
CREATE OR REPLACE FUNCTION suggest_test_persona(p_client_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  common_issue_types TEXT[];
BEGIN
  -- Get most common issue types
  SELECT ARRAY_AGG(issue_type)
  INTO common_issue_types
  FROM (
    SELECT issue_type
    FROM bot_test_issues
    WHERE client_id = p_client_id AND status = 'open'
    GROUP BY issue_type
    ORDER BY COUNT(*) DESC
    LIMIT 3
  ) AS top_issues;

  -- Recommend persona based on issue types
  IF 'performance' = ANY(common_issue_types) OR 'database' = ANY(common_issue_types) THEN
    RETURN 'enterpriseManager'; -- Technical user who would notice performance
  ELSIF 'form-error' = ANY(common_issue_types) OR 'broken-ui' = ANY(common_issue_types) THEN
    RETURN 'smallBusinessOwner'; -- Average user who uses forms
  ELSE
    RETURN 'freelancer'; -- Quick, simple journey
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update codebase knowledge timestamp
CREATE OR REPLACE FUNCTION update_codebase_knowledge_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_codebase_knowledge
BEFORE UPDATE ON client_codebase_knowledge
FOR EACH ROW
EXECUTE FUNCTION update_codebase_knowledge_timestamp();

-- Trigger: Auto-suggest fix when issue is created
CREATE OR REPLACE FUNCTION auto_suggest_fix()
RETURNS TRIGGER AS $$
DECLARE
  client_knowledge RECORD;
  past_fix RECORD;
BEGIN
  -- Only suggest for auto-fixable issues
  IF NEW.can_auto_fix = true THEN
    -- Check if we have codebase knowledge
    SELECT * INTO client_knowledge
    FROM client_codebase_knowledge
    WHERE client_id = NEW.client_id;

    -- Check if we've fixed this before
    SELECT * INTO past_fix
    FROM fix_history
    WHERE client_id = NEW.client_id
      AND issue_type = NEW.issue_type
      AND fix_successful = true
    ORDER BY executed_at DESC
    LIMIT 1;

    IF past_fix.id IS NOT NULL THEN
      -- Create suggestion based on past fix
      INSERT INTO ai_fix_suggestions (
        client_id,
        issue_id,
        suggested_fix,
        confidence_score,
        estimated_risk,
        similar_fixes,
        status
      ) VALUES (
        NEW.client_id,
        NEW.id,
        past_fix.fix_plan,
        0.90, -- High confidence if we've done it before
        'low',
        jsonb_build_array(past_fix.id),
        'pending'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_suggest_fix
AFTER INSERT ON bot_test_issues
FOR EACH ROW
EXECUTE FUNCTION auto_suggest_fix();

-- ============================================================================
-- SECURITY
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE client_codebase_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE fix_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_code_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_fix_suggestions ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access" ON client_codebase_knowledge
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON fix_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON client_code_access
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON ai_fix_suggestions
  FOR ALL USING (auth.role() = 'service_role');

-- Clients can view their own knowledge and history (read-only)
CREATE POLICY "Clients view own knowledge" ON client_codebase_knowledge
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM testing_clients
      WHERE dashboard_token = current_setting('app.dashboard_token', true)
    )
  );

CREATE POLICY "Clients view own fix history" ON fix_history
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM testing_clients
      WHERE dashboard_token = current_setting('app.dashboard_token', true)
    )
  );

-- Comments
COMMENT ON TABLE client_codebase_knowledge IS 'AI-powered analysis of client codebases for intelligent auto-fixing';
COMMENT ON TABLE fix_history IS 'Historical record of all fix attempts for learning and improvement';
COMMENT ON TABLE client_code_access IS 'Client repository access credentials for codebase analysis';
COMMENT ON TABLE ai_fix_suggestions IS 'AI-generated fix suggestions for review before execution';

-- ============================================================================
-- SAMPLE DATA (for development)
-- ============================================================================

-- Add codebase knowledge for sample client (if exists)
INSERT INTO client_codebase_knowledge (
  client_id,
  codebase_path,
  confidence_score,
  tech_stack,
  database_schema,
  api_structure,
  business_rules,
  ai_understanding
)
SELECT
  id,
  '/sample/codebase/path',
  7,
  '{"framework": "express", "database": "postgresql", "frontend": "react"}'::jsonb,
  '{"tables": [{"name": "users", "columns": [{"name": "id", "type": "uuid"}]}]}'::jsonb,
  '{"endpoints": [{"path": "/api/users", "method": "GET", "auth": true}], "authMethod": "JWT"}'::jsonb,
  '{"rules": ["users must verify email"], "workflows": ["signup → verify → activate"]}'::jsonb,
  '{"summary": "Sample SaaS application", "architecture": "REST API + React frontend"}'::jsonb
FROM testing_clients
WHERE client_email = 'john@acmecorp.com'
ON CONFLICT (client_id) DO NOTHING;
