-- ============================================================================
-- UNBOUND.TEAM BOT TESTING SYSTEM - DATABASE SETUP
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS testing_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  plan VARCHAR(50) NOT NULL,
  monthly_fee DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active',
  site_url VARCHAR(500) NOT NULL,
  site_type VARCHAR(50),
  test_frequency VARCHAR(50) DEFAULT 'daily',
  personas_to_test TEXT[],
  dashboard_token VARCHAR(255) UNIQUE,
  auto_fix_enabled BOOLEAN DEFAULT false,
  engineering_bot_access BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. TEST RESULTS TABLE
CREATE TABLE IF NOT EXISTS bot_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE,
  test_date TIMESTAMP DEFAULT NOW(),
  persona_used VARCHAR(100) NOT NULL,
  persona_name VARCHAR(100),
  overall_rating DECIMAL(3,1),
  would_recommend BOOLEAN,
  test_duration_minutes DECIMAL(5,2),
  steps_completed JSONB,
  issues_found JSONB,
  critical_issues INTEGER DEFAULT 0,
  high_issues INTEGER DEFAULT 0,
  positive_experiences JSONB,
  suggestions JSONB
);

-- 3. ISSUES TABLE
CREATE TABLE IF NOT EXISTS bot_test_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE,
  test_result_id UUID REFERENCES bot_test_results(id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  step VARCHAR(100),
  can_auto_fix BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. DISABLE ROW LEVEL SECURITY (for demo/testing)
ALTER TABLE testing_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_test_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_test_issues DISABLE ROW LEVEL SECURITY;

-- 5. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_clients_email ON testing_clients(client_email);
CREATE INDEX IF NOT EXISTS idx_results_client ON bot_test_results(client_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON bot_test_results(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_issues_client ON bot_test_issues(client_id);

-- 6. INSERT DEMO CLIENT (Maggie Forbes)
INSERT INTO testing_clients (
  client_name,
  client_email,
  company_name,
  plan,
  monthly_fee,
  site_url,
  site_type,
  test_frequency,
  personas_to_test,
  dashboard_token,
  auto_fix_enabled,
  engineering_bot_access,
  status
) VALUES (
  'Maggie Forbes',
  'maggie@maggieforbesstrategies.com',
  'Maggie Forbes Strategies',
  'pro',
  0.00,
  'https://maggieforbesstrategies.com',
  'marketing',
  'on-demand',
  ARRAY['enterpriseManager', 'smallBusinessOwner'],
  'maggie-' || substr(md5(random()::text), 1, 16),
  false,
  false,
  'active'
)
ON CONFLICT (client_email) DO NOTHING;

-- Done! Now you can run: node test/test-maggie-forbes-site.js
