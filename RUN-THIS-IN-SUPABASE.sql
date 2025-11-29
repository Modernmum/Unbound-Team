-- UNBOUND.TEAM - COMPLETE DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/awgxauppcufwftcxrfez/sql/new

-- PART 1: MULTI-TENANT SYSTEM

-- Tenants table
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

-- Tenant users
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

-- Tenant revenue
CREATE TABLE IF NOT EXISTS tenant_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  total_revenue NUMERIC DEFAULT 0,
  partner_share NUMERIC DEFAULT 0,
  unbound_share NUMERIC DEFAULT 0,
  revenue_breakdown JSONB DEFAULT '{}',
  active_users INTEGER DEFAULT 0,
  paying_users INTEGER DEFAULT 0,
  churned_users INTEGER DEFAULT 0,
  payout_status TEXT DEFAULT 'pending',
  payout_date TIMESTAMP,
  payout_method TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, month)
);

-- Social proof
CREATE TABLE IF NOT EXISTS social_proof (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  quote TEXT,
  client_name TEXT,
  client_business TEXT,
  client_title TEXT,
  client_avatar_url TEXT,
  results JSONB DEFAULT '{}',
  solution_type TEXT,
  rating NUMERIC,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  featured BOOLEAN DEFAULT FALSE,
  slug TEXT UNIQUE,
  meta_description TEXT,
  client_approved BOOLEAN DEFAULT FALSE,
  can_use_name BOOLEAN DEFAULT TRUE,
  can_use_business BOOLEAN DEFAULT TRUE,
  can_use_photo BOOLEAN DEFAULT FALSE,
  share_with_tenants UUID[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Client provisioning log
CREATE TABLE IF NOT EXISTS client_provisioning_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_plan TEXT,
  to_plan TEXT,
  provisioned_by TEXT,
  partner_user_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cross promotion campaigns
CREATE TABLE IF NOT EXISTS cross_promotion_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT,
  target_tenants UUID[],
  subject TEXT,
  body TEXT,
  cta_text TEXT,
  cta_url TEXT,
  case_study_id UUID REFERENCES social_proof(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  recipients_count INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant user usage
CREATE TABLE IF NOT EXISTS tenant_user_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  problems_solved INTEGER DEFAULT 0,
  usage_limit INTEGER,
  lead_generation_count INTEGER DEFAULT 0,
  content_creation_count INTEGER DEFAULT 0,
  market_research_count INTEGER DEFAULT 0,
  landing_page_count INTEGER DEFAULT 0,
  email_marketing_count INTEGER DEFAULT 0,
  limit_reached BOOLEAN DEFAULT FALSE,
  limit_reached_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, month)
);

-- Partner dashboard stats
CREATE TABLE IF NOT EXISTS partner_dashboard_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  churned_users INTEGER DEFAULT 0,
  mrr NUMERIC DEFAULT 0,
  arr NUMERIC DEFAULT 0,
  revenue_share NUMERIC DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  avg_satisfaction_score NUMERIC,
  testimonials_collected INTEGER DEFAULT 0,
  case_studies_published INTEGER DEFAULT 0,
  top_solution TEXT,
  solution_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- PART 2: AUTOMATION SYSTEM

-- Automation log
CREATE TABLE IF NOT EXISTS automation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  job_id UUID,
  automation_type TEXT NOT NULL,
  trigger_type TEXT DEFAULT 'scheduled',
  settings JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  result JSONB,
  error TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Partner automation preferences
CREATE TABLE IF NOT EXISTS partner_automation_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  lead_gen_enabled BOOLEAN DEFAULT FALSE,
  lead_gen_schedule TEXT DEFAULT 'weekly',
  lead_gen_day_of_week INTEGER DEFAULT 1,
  lead_gen_hour INTEGER DEFAULT 9,
  leads_per_run INTEGER DEFAULT 10,
  target_industry TEXT,
  target_location TEXT DEFAULT 'global',
  min_fit_score NUMERIC DEFAULT 6,
  opportunity_discovery_enabled BOOLEAN DEFAULT TRUE,
  notify_on_high_value BOOLEAN DEFAULT TRUE,
  high_value_threshold NUMERIC DEFAULT 8,
  auto_request_testimonials BOOLEAN DEFAULT TRUE,
  auto_generate_case_studies BOOLEAN DEFAULT TRUE,
  require_client_approval BOOLEAN DEFAULT TRUE,
  cross_promotion_enabled BOOLEAN DEFAULT TRUE,
  share_with_other_tenants BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  discord_notifications BOOLEAN DEFAULT FALSE,
  notification_email TEXT,
  discord_webhook_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Automation schedules
CREATE TABLE IF NOT EXISTS automation_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  automation_type TEXT NOT NULL,
  schedule_type TEXT DEFAULT 'cron',
  cron_expression TEXT,
  interval_minutes INTEGER,
  settings JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update queue_jobs if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'queue_jobs') THEN
    ALTER TABLE queue_jobs
    ADD COLUMN IF NOT EXISTS testimonial_requested BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS case_study_generated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- PART 3: SEED DATA

-- Insert tenants
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

-- Insert automation preferences for Maggie Forbes
INSERT INTO partner_automation_preferences (
  tenant_id, lead_gen_enabled, leads_per_run, target_industry, min_fit_score, notification_email
)
SELECT
  id, FALSE, 20, 'high-end business clients seeking strategic help', 8, 'kristi@maggieforbes.com'
FROM tenants WHERE slug = 'maggie-forbes'
ON CONFLICT (tenant_id) DO NOTHING;

-- Insert automation preferences for Growth Manager Pro
INSERT INTO partner_automation_preferences (
  tenant_id, lead_gen_enabled, leads_per_run, target_industry, min_fit_score, notification_email
)
SELECT
  id, FALSE, 50, 'solopreneurs struggling with growth', 6, 'kristi@growthmangerpro.com'
FROM tenants WHERE slug = 'growth-manager-pro'
ON CONFLICT (tenant_id) DO NOTHING;

-- PART 4: INDEXES

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_revenue_tenant ON tenant_revenue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_proof_tenant ON social_proof(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_log_tenant ON automation_log(tenant_id);

-- PART 5: FUNCTIONS

CREATE OR REPLACE FUNCTION get_tenant_stats(tenant_slug TEXT)
RETURNS TABLE(
  total_users BIGINT,
  active_users BIGINT,
  paying_users BIGINT,
  mrr NUMERIC,
  testimonials BIGINT,
  case_studies BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT tu.user_id)::BIGINT as total_users,
    COUNT(DISTINCT CASE WHEN tu.status = 'active' THEN tu.user_id END)::BIGINT as active_users,
    COUNT(DISTINCT CASE WHEN tu.plan != 'free' THEN tu.user_id END)::BIGINT as paying_users,
    COALESCE(SUM(CASE WHEN tu.plan = 'starter' THEN 50 WHEN tu.plan = 'growth' THEN 150 ELSE 0 END), 0) as mrr,
    COUNT(DISTINCT CASE WHEN sp.type = 'testimonial' AND sp.published = true THEN sp.id END)::BIGINT as testimonials,
    COUNT(DISTINCT CASE WHEN sp.type = 'case_study' AND sp.published = true THEN sp.id END)::BIGINT as case_studies
  FROM tenants t
  LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
  LEFT JOIN social_proof sp ON t.id = sp.tenant_id
  WHERE t.slug = tenant_slug
  GROUP BY t.id;
END;
$$ LANGUAGE plpgsql;

-- COMPLETE
SELECT 'Database setup complete! 🎉' as status;
