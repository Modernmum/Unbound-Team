-- ============================================================================
-- MAGGIE FORBES STRATEGIES - SOLUTION BROKERAGE DATABASE
-- ============================================================================
-- Business Model: Discover needs → Match with providers → Earn recurring revenue
-- Target: $100K/month MRR from solution brokerage
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: DISCOVERED NEEDS
-- ============================================================================
-- Business needs discovered from Reddit, forums, manual entry, etc.

CREATE TABLE IF NOT EXISTS discovered_needs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Source tracking
  source TEXT NOT NULL,                    -- 'Reddit', 'IndieHackers', 'Manual', 'LinkedIn', etc.
  source_url TEXT,                         -- URL where need was found
  raw_content TEXT,                        -- Original post/content
  discovered_at TIMESTAMPTZ DEFAULT NOW(),

  -- Need details (AI-extracted or manual)
  problem_description TEXT NOT NULL,       -- Clear description of the problem
  business_area TEXT,                      -- 'marketing', 'sales', 'operations', 'product', etc.
  urgency TEXT,                            -- 'urgent', 'high', 'medium', 'low'

  -- Contact info
  person_name TEXT,
  person_email TEXT,
  person_linkedin TEXT,
  company_name TEXT,
  company_size TEXT,                       -- 'solo', '2-10', '10-50', '50-500', '500+'
  industry TEXT,

  -- AI analysis
  ai_summary TEXT,
  tags TEXT[],
  estimated_budget_min INTEGER,            -- In cents
  estimated_budget_max INTEGER,            -- In cents

  -- Status tracking
  status TEXT DEFAULT 'active',            -- 'active', 'matched', 'closed', 'unqualified'
  matched_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discovered_needs_status ON discovered_needs(status);
CREATE INDEX idx_discovered_needs_source ON discovered_needs(source);
CREATE INDEX idx_discovered_needs_business_area ON discovered_needs(business_area);
CREATE INDEX idx_discovered_needs_discovered_at ON discovered_needs(discovered_at DESC);

-- ============================================================================
-- TABLE 2: SOLUTION PROVIDERS
-- ============================================================================
-- Your network of experts/freelancers/consultants who can solve problems

CREATE TABLE IF NOT EXISTS solution_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Provider details
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,                              -- 'Fractional CMO', 'Growth Consultant', etc.

  -- Expertise
  expertise_areas TEXT[] NOT NULL,         -- ['marketing', 'b2b', 'saas', 'growth']
  industries_served TEXT[],                -- ['saas', 'fintech', 'healthcare']
  years_experience INTEGER,

  -- Rates & availability
  hourly_rate INTEGER,                     -- In cents
  monthly_retainer_min INTEGER,            -- In cents
  monthly_retainer_max INTEGER,            -- In cents
  availability_status TEXT DEFAULT 'available',  -- 'available', 'limited', 'unavailable'

  -- Profile links
  linkedin_url TEXT,
  website_url TEXT,
  profile_url TEXT,

  -- Performance tracking
  introductions_received INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 0,     -- Percentage
  avg_client_rating NUMERIC(3,2),          -- 1.00 to 5.00

  -- Relationship with Maggie Forbes
  relationship_strength TEXT DEFAULT 'new', -- 'new', 'warm', 'strong', 'partner'
  commission_percentage NUMERIC(5,2) DEFAULT 10.00,  -- What % Maggie gets
  notes TEXT,

  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_match_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_solution_providers_availability ON solution_providers(availability_status);
CREATE INDEX idx_solution_providers_expertise ON solution_providers USING GIN(expertise_areas);
CREATE INDEX idx_solution_providers_industries ON solution_providers USING GIN(industries_served);

-- ============================================================================
-- TABLE 3: NEED-PROVIDER MATCHES
-- ============================================================================
-- AI-scored matches between needs and providers

CREATE TABLE IF NOT EXISTS need_provider_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The match
  need_id UUID REFERENCES discovered_needs(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES solution_providers(id) ON DELETE CASCADE,

  -- AI scoring
  fit_score INTEGER CHECK (fit_score >= 1 AND fit_score <= 10),
  ai_reasoning TEXT,                       -- Why this is a good match
  ai_intro_template TEXT,                  -- Suggested intro email

  -- Match status
  match_status TEXT DEFAULT 'potential',   -- 'potential', 'approved', 'introduced', 'deal_closed', 'rejected'
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
  deal_value INTEGER,                      -- In cents
  maggie_commission INTEGER,               -- In cents
  closed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure we don't match the same need+provider twice
  UNIQUE(need_id, provider_id)
);

CREATE INDEX idx_matches_status ON need_provider_matches(match_status);
CREATE INDEX idx_matches_fit_score ON need_provider_matches(fit_score DESC);
CREATE INDEX idx_matches_need ON need_provider_matches(need_id);
CREATE INDEX idx_matches_provider ON need_provider_matches(provider_id);

-- ============================================================================
-- TABLE 4: STICKY REVENUE RELATIONSHIPS
-- ============================================================================
-- Ongoing revenue streams from successful matches

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
  revenue_model TEXT DEFAULT 'commission',  -- 'commission', 'referral_fee', 'ongoing_percentage'

  -- Recurring revenue from client
  monthly_recurring_revenue INTEGER DEFAULT 0,  -- Total MRR in cents
  maggie_commission_percentage NUMERIC(5,2),    -- What % Maggie gets from client payments
  maggie_monthly_revenue INTEGER DEFAULT 0,     -- Maggie's actual monthly revenue in cents

  -- Relationship health
  health_score INTEGER DEFAULT 100,        -- 0-100 score
  last_interaction TIMESTAMPTZ,
  next_review_date DATE,
  risk_level TEXT DEFAULT 'healthy',       -- 'healthy', 'at_risk', 'churning'

  -- Lifetime value tracking
  relationship_started_at TIMESTAMPTZ DEFAULT NOW(),
  months_active INTEGER DEFAULT 0,
  lifetime_value INTEGER DEFAULT 0,        -- Total revenue generated (cents)

  -- Status
  status TEXT DEFAULT 'active',            -- 'active', 'paused', 'churned', 'completed'
  churned_at TIMESTAMPTZ,
  churn_reason TEXT,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sticky_revenue_status ON sticky_revenue_relationships(status);
CREATE INDEX idx_sticky_revenue_health ON sticky_revenue_relationships(health_score);
CREATE INDEX idx_sticky_revenue_risk ON sticky_revenue_relationships(risk_level);
CREATE INDEX idx_sticky_revenue_started ON sticky_revenue_relationships(relationship_started_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER discovered_needs_updated_at
  BEFORE UPDATE ON discovered_needs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER solution_providers_updated_at
  BEFORE UPDATE ON solution_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER need_provider_matches_updated_at
  BEFORE UPDATE ON need_provider_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sticky_revenue_updated_at
  BEFORE UPDATE ON sticky_revenue_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate relationship health score
CREATE OR REPLACE FUNCTION calculate_relationship_health(rel_id UUID)
RETURNS INTEGER AS $$
DECLARE
  health INTEGER := 100;
  days_since_interaction INTEGER;
  risk TEXT;
BEGIN
  -- Get relationship details
  SELECT
    EXTRACT(DAY FROM NOW() - COALESCE(last_interaction, relationship_started_at)),
    risk_level
  INTO days_since_interaction, risk
  FROM sticky_revenue_relationships
  WHERE id = rel_id;

  -- Deduct points based on last interaction
  IF days_since_interaction > 60 THEN
    health := health - 40;
  ELSIF days_since_interaction > 30 THEN
    health := health - 20;
  ELSIF days_since_interaction > 14 THEN
    health := health - 10;
  END IF;

  -- Additional factors can be added here

  RETURN GREATEST(0, LEAST(100, health));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR DASHBOARD
-- ============================================================================

-- Active pipeline summary
CREATE OR REPLACE VIEW pipeline_summary AS
SELECT
  COUNT(*) FILTER (WHERE status = 'active') as active_needs,
  COUNT(*) FILTER (WHERE status = 'matched') as matched_needs,
  COUNT(*) FILTER (WHERE status = 'closed') as closed_needs,
  COUNT(DISTINCT business_area) as business_areas_covered,
  COUNT(*) FILTER (WHERE urgency = 'urgent') as urgent_needs
FROM discovered_needs;

-- Sticky revenue summary
CREATE OR REPLACE VIEW sticky_revenue_summary AS
SELECT
  COUNT(*) as total_relationships,
  COUNT(*) FILTER (WHERE status = 'active') as active_relationships,
  COALESCE(SUM(maggie_monthly_revenue) FILTER (WHERE status = 'active'), 0) as total_mrr,
  COALESCE(SUM(maggie_monthly_revenue) FILTER (WHERE status = 'active') * 12, 0) as annual_recurring_revenue,
  COALESCE(SUM(lifetime_value), 0) as total_lifetime_value,
  COALESCE(AVG(health_score) FILTER (WHERE status = 'active'), 0) as avg_health_score,
  COUNT(*) FILTER (WHERE status = 'active' AND health_score < 50) as at_risk_count
FROM sticky_revenue_relationships;

-- ============================================================================
-- ROW LEVEL SECURITY (Disabled for development)
-- ============================================================================

ALTER TABLE discovered_needs DISABLE ROW LEVEL SECURITY;
ALTER TABLE solution_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE need_provider_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE sticky_revenue_relationships DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SEED DATA: Maggie Forbes as First Provider
-- ============================================================================

INSERT INTO solution_providers (
  name,
  email,
  title,
  expertise_areas,
  industries_served,
  availability_status,
  relationship_strength,
  commission_percentage,
  notes
) VALUES (
  'Maggie Forbes',
  'maggie@maggieforbesstrategies.com',
  'Strategic Business Consultant',
  ARRAY['business strategy', 'operations', 'scaling', 'optimization', 'executive coaching'],
  ARRAY['professional services', 'consulting', 'high-end services', 'b2b'],
  'available',
  'partner',
  0,  -- Maggie doesn't pay commission to herself
  'Primary consultant - high-end strategic work for established businesses'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETE! Ready for Maggie Forbes Solution Brokerage
-- ============================================================================
