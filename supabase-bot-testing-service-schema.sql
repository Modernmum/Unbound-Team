-- Bot Testing Service Database Schema
-- For clients who subscribe to automated UX testing

-- ============================================================================
-- TABLE: testing_clients
-- Clients subscribed to bot testing service
-- ============================================================================

CREATE TABLE IF NOT EXISTS testing_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),

  -- Subscription
  plan VARCHAR(50) NOT NULL, -- 'basic', 'pro', 'enterprise'
  monthly_fee DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'cancelled'

  -- Site to test
  site_url VARCHAR(500) NOT NULL,
  site_type VARCHAR(50), -- 'saas', 'ecommerce', 'marketing', 'portal'

  -- Testing configuration
  test_frequency VARCHAR(50) DEFAULT 'daily', -- 'daily', 'weekly', 'on-demand'
  personas_to_test TEXT[] DEFAULT '{"smallBusinessOwner","freelancer"}',
  features_to_test JSONB DEFAULT '{}',

  -- Access
  dashboard_token VARCHAR(255) UNIQUE,
  api_key VARCHAR(255) UNIQUE,

  -- Engineering bot integration
  auto_fix_enabled BOOLEAN DEFAULT false,
  engineering_bot_access BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_testing_clients_email ON testing_clients(client_email);
CREATE INDEX idx_testing_clients_status ON testing_clients(status);
CREATE INDEX idx_testing_clients_token ON testing_clients(dashboard_token);

-- ============================================================================
-- TABLE: bot_test_results
-- Individual test results
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE,

  -- Test info
  test_date TIMESTAMP DEFAULT NOW(),
  persona_used VARCHAR(100) NOT NULL,
  persona_name VARCHAR(100),
  persona_role VARCHAR(100),

  -- Results
  overall_rating DECIMAL(3,1), -- 0.0 to 10.0
  would_recommend BOOLEAN,
  test_duration_minutes DECIMAL(5,2),

  -- Journey results
  steps_completed JSONB, -- Array of step results
  total_steps INTEGER,
  successful_steps INTEGER,
  failed_steps INTEGER,

  -- Issues found
  issues_found JSONB, -- Array of issues with severity
  critical_issues INTEGER DEFAULT 0,
  high_issues INTEGER DEFAULT 0,
  medium_issues INTEGER DEFAULT 0,
  low_issues INTEGER DEFAULT 0,

  -- Positives
  positive_experiences JSONB,

  -- Suggestions
  suggestions JSONB,

  -- Technical details
  console_errors INTEGER DEFAULT 0,
  network_errors INTEGER DEFAULT 0,
  screenshots JSONB, -- Array of screenshot URLs

  -- Full report
  full_report TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bot_test_results_client ON bot_test_results(client_id);
CREATE INDEX idx_bot_test_results_date ON bot_test_results(test_date DESC);
CREATE INDEX idx_bot_test_results_rating ON bot_test_results(overall_rating);

-- ============================================================================
-- TABLE: bot_test_issues
-- Individual issues found during tests
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_test_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE,
  test_result_id UUID REFERENCES bot_test_results(id) ON DELETE CASCADE,

  -- Issue details
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  issue_type VARCHAR(100), -- 'page-load', 'broken-link', 'form-error', etc.
  description TEXT NOT NULL,

  -- Location
  step_name VARCHAR(100),
  url VARCHAR(500),
  screenshot_url VARCHAR(500),

  -- Status
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'in-progress', 'fixed', 'ignored'

  -- Engineering bot
  can_auto_fix BOOLEAN DEFAULT false,
  fix_attempted BOOLEAN DEFAULT false,
  fix_successful BOOLEAN DEFAULT false,
  fix_details TEXT,

  -- Tracking
  first_detected TIMESTAMP DEFAULT NOW(),
  last_detected TIMESTAMP DEFAULT NOW(),
  detection_count INTEGER DEFAULT 1, -- How many times this issue appeared
  fixed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bot_test_issues_client ON bot_test_issues(client_id);
CREATE INDEX idx_bot_test_issues_severity ON bot_test_issues(severity);
CREATE INDEX idx_bot_test_issues_status ON bot_test_issues(status);

-- ============================================================================
-- TABLE: bot_fix_requests
-- Client requests for engineering bot to fix issues
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_fix_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES bot_test_issues(id) ON DELETE CASCADE,

  -- Request details
  request_type VARCHAR(50), -- 'auto-fix', 'analysis', 'manual-review'
  priority VARCHAR(20) DEFAULT 'medium', -- 'urgent', 'high', 'medium', 'low'

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in-progress', 'completed', 'failed'

  -- Engineering bot response
  bot_analysis TEXT,
  bot_recommendation TEXT,
  fix_applied BOOLEAN DEFAULT false,
  fix_code JSONB, -- Code changes made
  fix_result TEXT,

  -- Timing
  requested_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bot_fix_requests_client ON bot_fix_requests(client_id);
CREATE INDEX idx_bot_fix_requests_status ON bot_fix_requests(status);

-- ============================================================================
-- TABLE: client_notifications
-- Notifications sent to clients
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE,

  -- Notification details
  notification_type VARCHAR(50), -- 'test-complete', 'issue-found', 'issue-fixed', 'report-ready'
  severity VARCHAR(20), -- 'info', 'warning', 'critical'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Related data
  related_test_id UUID REFERENCES bot_test_results(id),
  related_issue_id UUID REFERENCES bot_test_issues(id),

  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,

  -- Delivery
  sent_via_email BOOLEAN DEFAULT false,
  sent_via_dashboard BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_client_notifications_client ON client_notifications(client_id);
CREATE INDEX idx_client_notifications_read ON client_notifications(read);
CREATE INDEX idx_client_notifications_created ON client_notifications(created_at DESC);

-- ============================================================================
-- TABLE: client_dashboard_activity
-- Track what clients view in their dashboard
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_dashboard_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES testing_clients(id) ON DELETE CASCADE,

  activity_type VARCHAR(50), -- 'view-report', 'request-fix', 'view-issue', 'download-screenshots'
  activity_data JSONB,

  ip_address VARCHAR(50),
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dashboard_activity_client ON client_dashboard_activity(client_id);
CREATE INDEX idx_dashboard_activity_created ON client_dashboard_activity(created_at DESC);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Client Dashboard Summary
CREATE OR REPLACE VIEW client_dashboard_summary AS
SELECT
  c.id AS client_id,
  c.client_name,
  c.company_name,
  c.site_url,
  c.plan,
  c.status,

  -- Latest test
  (SELECT test_date FROM bot_test_results WHERE client_id = c.id ORDER BY test_date DESC LIMIT 1) AS last_test_date,
  (SELECT overall_rating FROM bot_test_results WHERE client_id = c.id ORDER BY test_date DESC LIMIT 1) AS latest_rating,

  -- Issue counts
  (SELECT COUNT(*) FROM bot_test_issues WHERE client_id = c.id AND status = 'open') AS open_issues,
  (SELECT COUNT(*) FROM bot_test_issues WHERE client_id = c.id AND status = 'open' AND severity = 'critical') AS critical_issues,
  (SELECT COUNT(*) FROM bot_test_issues WHERE client_id = c.id AND status = 'fixed') AS fixed_issues,

  -- Tests this month
  (SELECT COUNT(*) FROM bot_test_results WHERE client_id = c.id AND test_date >= DATE_TRUNC('month', CURRENT_DATE)) AS tests_this_month,

  -- Unread notifications
  (SELECT COUNT(*) FROM client_notifications WHERE client_id = c.id AND read = false) AS unread_notifications

FROM testing_clients c
WHERE c.status = 'active';

-- View: Recent test results for client
CREATE OR REPLACE VIEW client_recent_tests AS
SELECT
  r.id,
  r.client_id,
  c.client_name,
  r.test_date,
  r.persona_used,
  r.overall_rating,
  r.would_recommend,
  r.critical_issues,
  r.high_issues,
  r.medium_issues,
  r.low_issues
FROM bot_test_results r
JOIN testing_clients c ON r.client_id = c.id
ORDER BY r.test_date DESC;

-- View: Issues by severity
CREATE OR REPLACE VIEW issues_by_severity AS
SELECT
  c.id AS client_id,
  c.client_name,
  i.severity,
  COUNT(*) AS issue_count,
  COUNT(*) FILTER (WHERE i.status = 'open') AS open_count,
  COUNT(*) FILTER (WHERE i.status = 'fixed') AS fixed_count
FROM testing_clients c
LEFT JOIN bot_test_issues i ON c.id = i.client_id
GROUP BY c.id, c.client_name, i.severity;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Get client's latest test result
CREATE OR REPLACE FUNCTION get_latest_test_result(p_client_id UUID)
RETURNS TABLE (
  test_id UUID,
  test_date TIMESTAMP,
  overall_rating DECIMAL,
  total_issues INTEGER,
  critical_issues INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id AS test_id,
    bot_test_results.test_date,
    overall_rating,
    (critical_issues + high_issues + medium_issues + low_issues) AS total_issues,
    bot_test_results.critical_issues
  FROM bot_test_results
  WHERE client_id = p_client_id
  ORDER BY test_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get trending issues (appearing in multiple tests)
CREATE OR REPLACE FUNCTION get_trending_issues(p_client_id UUID)
RETURNS TABLE (
  issue_description TEXT,
  detection_count INTEGER,
  first_detected TIMESTAMP,
  last_detected TIMESTAMP,
  severity VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    description AS issue_description,
    bot_test_issues.detection_count,
    first_detected,
    last_detected,
    bot_test_issues.severity
  FROM bot_test_issues
  WHERE client_id = p_client_id
    AND status = 'open'
    AND bot_test_issues.detection_count >= 2
  ORDER BY bot_test_issues.detection_count DESC, last_detected DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate client health score (0-100)
CREATE OR REPLACE FUNCTION calculate_health_score(p_client_id UUID)
RETURNS INTEGER AS $$
DECLARE
  avg_rating DECIMAL;
  open_critical INTEGER;
  open_high INTEGER;
  health_score INTEGER;
BEGIN
  -- Get average rating from last 7 tests
  SELECT AVG(overall_rating) INTO avg_rating
  FROM bot_test_results
  WHERE client_id = p_client_id
    AND test_date >= NOW() - INTERVAL '30 days'
  LIMIT 7;

  -- Get open issues
  SELECT
    COUNT(*) FILTER (WHERE severity = 'critical'),
    COUNT(*) FILTER (WHERE severity = 'high')
  INTO open_critical, open_high
  FROM bot_test_issues
  WHERE client_id = p_client_id AND status = 'open';

  -- Calculate score
  health_score := GREATEST(0, LEAST(100,
    (COALESCE(avg_rating, 7) * 10)::INTEGER  -- Rating component (0-100)
    - (open_critical * 20)                    -- Deduct 20 per critical issue
    - (open_high * 10)                        -- Deduct 10 per high issue
  ));

  RETURN health_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-increment detection count for duplicate issues
CREATE OR REPLACE FUNCTION increment_issue_detection()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if similar issue exists
  UPDATE bot_test_issues
  SET
    detection_count = detection_count + 1,
    last_detected = NEW.created_at,
    updated_at = NOW()
  WHERE client_id = NEW.client_id
    AND description = NEW.description
    AND status = 'open'
    AND id != NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_issue_detection
AFTER INSERT ON bot_test_issues
FOR EACH ROW
EXECUTE FUNCTION increment_issue_detection();

-- Trigger: Create notification on critical issue
CREATE OR REPLACE FUNCTION notify_on_critical_issue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.severity = 'critical' THEN
    INSERT INTO client_notifications (
      client_id,
      notification_type,
      severity,
      title,
      message,
      related_issue_id
    ) VALUES (
      NEW.client_id,
      'issue-found',
      'critical',
      'Critical Issue Found',
      'A critical issue was detected: ' || NEW.description,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_critical_issue
AFTER INSERT ON bot_test_issues
FOR EACH ROW
EXECUTE FUNCTION notify_on_critical_issue();

-- ============================================================================
-- SAMPLE DATA (for development)
-- ============================================================================

-- Insert sample client
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
  api_key,
  auto_fix_enabled,
  engineering_bot_access
) VALUES (
  'John Smith',
  'john@acmecorp.com',
  'Acme Corporation',
  'pro',
  599.00,
  'https://acmecorp.com',
  'saas',
  'daily',
  '{"smallBusinessOwner","teamLead","enterpriseManager"}',
  'demo-token-' || gen_random_uuid()::text,
  'demo-api-' || gen_random_uuid()::text,
  true,
  true
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECURITY
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE testing_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_test_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can only see their own data
CREATE POLICY "Clients see own data" ON testing_clients
  FOR SELECT USING (dashboard_token = current_setting('app.dashboard_token', true));

CREATE POLICY "Clients see own test results" ON bot_test_results
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM testing_clients
      WHERE dashboard_token = current_setting('app.dashboard_token', true)
    )
  );

CREATE POLICY "Clients see own issues" ON bot_test_issues
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM testing_clients
      WHERE dashboard_token = current_setting('app.dashboard_token', true)
    )
  );

CREATE POLICY "Clients see own notifications" ON client_notifications
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM testing_clients
      WHERE dashboard_token = current_setting('app.dashboard_token', true)
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access" ON testing_clients
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON bot_test_results
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON bot_test_issues
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON client_notifications
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE testing_clients IS 'Clients subscribed to bot testing service';
COMMENT ON TABLE bot_test_results IS 'Individual test results for each client';
COMMENT ON TABLE bot_test_issues IS 'Issues found during bot testing';
COMMENT ON TABLE bot_fix_requests IS 'Client requests for engineering bot to fix issues';
COMMENT ON TABLE client_notifications IS 'Notifications sent to clients about their tests';
