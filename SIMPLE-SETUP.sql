-- Simple setup - creates only missing tables
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Lead generation table
CREATE TABLE IF NOT EXISTS discovered_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  source_url TEXT,
  title TEXT,
  description TEXT,
  business_area TEXT,
  pain_points TEXT[],
  urgency_level TEXT,
  fit_score INTEGER,
  contact_info JSONB,
  metadata JSONB,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot testing tables
CREATE TABLE IF NOT EXISTS testing_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  email TEXT NOT NULL,
  dashboard_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bot_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id),
  bot_persona TEXT NOT NULL,
  test_url TEXT NOT NULL,
  rating INTEGER,
  issues_found TEXT[],
  suggestions TEXT[],
  full_report JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for immediate use
ALTER TABLE discovered_opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE testing_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_test_results DISABLE ROW LEVEL SECURITY;
