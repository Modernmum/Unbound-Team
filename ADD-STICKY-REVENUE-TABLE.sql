-- ============================================================================
-- ADD STICKY REVENUE RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sticky_revenue_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The original match that created this relationship
  match_id UUID REFERENCES need_provider_matches(id) ON DELETE SET NULL,
  need_id UUID REFERENCES discovered_needs(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES solution_providers(id) ON DELETE SET NULL,

  -- Client details
  client_company_name TEXT NOT NULL,
  client_contact_name TEXT,
  client_contact_email TEXT,

  -- Revenue model
  revenue_model TEXT DEFAULT 'commission',

  -- Recurring revenue from client
  monthly_recurring_revenue INTEGER DEFAULT 0,
  maggie_commission_percentage NUMERIC(5,2),
  maggie_monthly_revenue INTEGER DEFAULT 0,

  -- Relationship health
  health_score INTEGER DEFAULT 100,
  last_interaction TIMESTAMPTZ,
  next_review_date DATE,
  risk_level TEXT DEFAULT 'healthy',

  -- Lifetime value tracking
  relationship_started_at TIMESTAMPTZ DEFAULT NOW(),
  months_active INTEGER DEFAULT 0,
  lifetime_value INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active',
  churned_at TIMESTAMPTZ,
  churn_reason TEXT,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sticky_revenue_status ON sticky_revenue_relationships(status);
CREATE INDEX IF NOT EXISTS idx_sticky_revenue_health ON sticky_revenue_relationships(health_score);
CREATE INDEX IF NOT EXISTS idx_sticky_revenue_risk ON sticky_revenue_relationships(risk_level);
CREATE INDEX IF NOT EXISTS idx_sticky_revenue_started ON sticky_revenue_relationships(relationship_started_at DESC);

-- Trigger
DROP TRIGGER IF EXISTS sticky_revenue_updated_at ON sticky_revenue_relationships;
CREATE TRIGGER sticky_revenue_updated_at
  BEFORE UPDATE ON sticky_revenue_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Disable RLS for development
ALTER TABLE sticky_revenue_relationships DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DONE! Sticky revenue table added.
-- ============================================================================
