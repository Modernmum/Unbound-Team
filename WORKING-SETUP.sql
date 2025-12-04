-- UNBOUND.TEAM + MAGGIE FORBES - WORKING DATABASE SETUP
-- Run this ONCE in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 1: BASE TABLES (Users & Profiles)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: MULTI-TENANT SYSTEM

-- Tenants table (Unbound.team, Maggie Forbes, Growth Manager Pro)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  branding JSONB DEFAULT '{}',
  domain TEXT,
  subdomain TEXT,
  settings JSONB DEFAULT '{}',
  revenue_share_percent NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant Users (which clients belong to which tenant)
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free',
  plan_limits JSONB DEFAULT '{"problems_per_month": 1}',
  source TEXT,
  referral_code TEXT,
  status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- STEP 3: LEAD GENERATION & DISCOVERY

-- Discovered Opportunities (from RSS, forums, blogs)
CREATE TABLE IF NOT EXISTS discovered_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  source_url TEXT,
  title TEXT,
  description TEXT,
  business_area TEXT,
  pain_points TEXT[],
  urgency_level TEXT,
  fit_score INTEGER CHECK (fit_score >= 1 AND fit_score <= 10),
  contact_info JSONB,
  metadata JSONB,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_discovered_opp_source ON discovered_opportunities(source);
CREATE INDEX idx_discovered_opp_score ON discovered_opportunities(fit_score);
CREATE INDEX idx_discovered_opp_status ON discovered_opportunities(status);

-- STEP 4: CONTENT CREATION

-- Generated Content (blog posts, social media, emails)
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_generated_content_user ON generated_content(user_id);
CREATE INDEX idx_generated_content_type ON generated_content(content_type);

-- STEP 5: MARKET RESEARCH

-- Market Research Reports
CREATE TABLE IF NOT EXISTS market_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  idea TEXT NOT NULL,
  industry TEXT,
  opportunity_score INTEGER CHECK (opportunity_score >= 1 AND opportunity_score <= 10),
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_market_research_user ON market_research(user_id);
CREATE INDEX idx_market_research_score ON market_research(opportunity_score);

-- STEP 6: LANDING PAGES

-- Landing Pages
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  metadata JSONB
);

CREATE INDEX idx_landing_pages_user ON landing_pages(user_id);
CREATE INDEX idx_landing_pages_status ON landing_pages(status);

-- STEP 7: EMAIL CAMPAIGNS

-- Email Campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  goal TEXT,
  audience TEXT,
  email_count INTEGER,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  open_rate NUMERIC(5,2),
  click_rate NUMERIC(5,2),
  conversion_rate NUMERIC(5,2),
  metadata JSONB
);

CREATE INDEX idx_email_campaigns_user ON email_campaigns(user_id);
CREATE INDEX idx_email_campaigns_type ON email_campaigns(campaign_type);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);

-- STEP 8: JOB QUEUE SYSTEM

-- Job Queue (replaces Redis/Bull)
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_name TEXT NOT NULL,
  job_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_queue_status ON job_queue(status);
CREATE INDEX idx_queue_name ON job_queue(queue_name);
CREATE INDEX idx_queue_created ON job_queue(created_at);
CREATE INDEX idx_queue_priority ON job_queue(priority DESC);

-- AI Usage Tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost DECIMAL(10, 6),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_timestamp ON ai_usage(timestamp);
CREATE INDEX idx_ai_usage_model ON ai_usage(model_id);

-- STEP 9: BOT TESTING SYSTEM

-- Testing Clients
CREATE TABLE IF NOT EXISTS testing_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  email TEXT NOT NULL,
  dashboard_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_test_at TIMESTAMPTZ
);

-- Bot Test Results
CREATE TABLE IF NOT EXISTS bot_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE,
  bot_persona TEXT NOT NULL,
  test_url TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  issues_found TEXT[],
  suggestions TEXT[],
  screenshots JSONB,
  full_report JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bot_test_client ON bot_test_results(client_id);
CREATE INDEX idx_bot_test_persona ON bot_test_results(bot_persona);

-- SEED DATA: Initial Tenants

INSERT INTO tenants (name, slug, type, branding, revenue_share_percent, status)
VALUES
  (
    'Unbound.team',
    'unbound-team',
    'main',
    '{"logo": "/logos/unbound-team.png", "colors": {"primary": "#4F46E5", "secondary": "#10B981", "accent": "#F59E0B"}, "tagline": "Your Autonomous AI Team - Unbound from Big Tech"}',
    0,
    'active'
  ),
  (
    'Maggie Forbes AI Solutions',
    'maggie-forbes',
    'partner',
    '{"logo": "/logos/maggie-forbes.png", "colors": {"primary": "#8B5CF6", "secondary": "#EC4899", "accent": "#F59E0B"}, "tagline": "AI-Powered Strategic Solutions for High-End Businesses"}',
    50.00,
    'active'
  ),
  (
    'Growth Manager Pro AI Assistant',
    'growth-manager-pro',
    'partner',
    '{"logo": "/logos/growth-manager-pro.png", "colors": {"primary": "#059669", "secondary": "#0891B2", "accent": "#F59E0B"}, "tagline": "Your AI-Powered Growth Partner"}',
    50.00,
    'active'
  )
ON CONFLICT (slug) DO NOTHING;

-- FUNCTIONS

-- Get next job from queue
CREATE OR REPLACE FUNCTION get_next_job(queue TEXT)
RETURNS SETOF job_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE job_queue
  SET status = 'processing', started_at = NOW()
  WHERE id = (
    SELECT id FROM job_queue
    WHERE queue_name = queue AND status = 'pending'
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Complete job
CREATE OR REPLACE FUNCTION complete_job(job_id UUID, job_result JSONB)
RETURNS VOID AS $$
BEGIN
  UPDATE job_queue
  SET
    status = 'completed',
    result = job_result,
    completed_at = NOW()
  WHERE id = job_id;
END;
$$ LANGUAGE plpgsql;

-- Fail job with retry logic
CREATE OR REPLACE FUNCTION fail_job(job_id UUID, error_message TEXT)
RETURNS VOID AS $$
DECLARE
  current_attempts INTEGER;
  max_retries INTEGER;
BEGIN
  SELECT attempts, max_attempts INTO current_attempts, max_retries
  FROM job_queue WHERE id = job_id;

  IF current_attempts + 1 >= max_retries THEN
    UPDATE job_queue
    SET
      status = 'failed',
      error = error_message,
      failed_at = NOW(),
      attempts = attempts + 1
    WHERE id = job_id;
  ELSE
    UPDATE job_queue
    SET
      status = 'pending',
      error = error_message,
      attempts = attempts + 1,
      started_at = NULL
    WHERE id = job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Daily spending view
CREATE OR REPLACE VIEW daily_spending AS
SELECT
  DATE(timestamp) as date,
  model_id,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cost) as total_cost
FROM ai_usage
GROUP BY DATE(timestamp), model_id
ORDER BY date DESC;

-- Landing page view tracking
CREATE OR REPLACE FUNCTION increment_landing_page_views(page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET views = views + 1
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql;

-- Landing page conversion tracking
CREATE OR REPLACE FUNCTION increment_landing_page_conversions(page_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE landing_pages
  SET conversions = conversions + 1
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql;

-- ROW LEVEL SECURITY

-- Enable RLS on sensitive tables
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can do everything on job_queue"
  ON job_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything on ai_usage"
  ON ai_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For testing, disable RLS on bot testing tables
ALTER TABLE testing_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_test_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_opportunities DISABLE ROW LEVEL SECURITY;

-- COMPLETE! Database ready for all systems
