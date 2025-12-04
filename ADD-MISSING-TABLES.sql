-- ============================================================================
-- ADD MISSING SOLUTION BROKERAGE TABLES
-- ============================================================================
-- Only creates tables that don't exist yet

-- TABLE: NEED-PROVIDER MATCHES
CREATE TABLE IF NOT EXISTS need_provider_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The match
  need_id UUID REFERENCES discovered_needs(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES solution_providers(id) ON DELETE CASCADE,

  -- AI scoring
  fit_score INTEGER CHECK (fit_score >= 1 AND fit_score <= 10),
  ai_reasoning TEXT,
  ai_intro_template TEXT,

  -- Match status
  match_status TEXT DEFAULT 'potential',
  approved_at TIMESTAMPTZ,
  introduced_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Introduction tracking
  intro_email_sent BOOLEAN DEFAULT FALSE,
  intro_email_sent_at TIMESTAMPTZ,
  client_responded BOOLEAN DEFAULT FALSE,
  provider_responded BOOLEAN DEFAULT FALSE,

  -- Deal outcome
  deal_closed BOOLEAN DEFAULT FALSE,
  deal_value INTEGER,
  maggie_commission INTEGER,
  closed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(need_id, provider_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_status ON need_provider_matches(match_status);
CREATE INDEX IF NOT EXISTS idx_matches_fit_score ON need_provider_matches(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_need ON need_provider_matches(need_id);
CREATE INDEX IF NOT EXISTS idx_matches_provider ON need_provider_matches(provider_id);

-- Trigger
DROP TRIGGER IF EXISTS need_provider_matches_updated_at ON need_provider_matches;
CREATE TRIGGER need_provider_matches_updated_at
  BEFORE UPDATE ON need_provider_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Disable RLS for development
ALTER TABLE need_provider_matches DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DONE! Missing table added.
-- ============================================================================
