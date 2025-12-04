CREATE TABLE discovered_opportunities (
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

ALTER TABLE discovered_opportunities DISABLE ROW LEVEL SECURITY;
