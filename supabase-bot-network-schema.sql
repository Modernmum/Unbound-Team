-- Bot Network Database Schema
-- Bot-to-Bot Communication System

-- ============================================================================
-- TABLE: agent_network
-- Stores registered bots in the network
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_network (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id VARCHAR(255) NOT NULL UNIQUE,
  bot_info JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  registered_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_network_bot_id ON agent_network(bot_id);
CREATE INDEX idx_agent_network_status ON agent_network(status);

-- ============================================================================
-- TABLE: bot_messages
-- Stores messages exchanged between bots
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id VARCHAR(255) NOT NULL UNIQUE,
  from_bot VARCHAR(255) NOT NULL,
  to_bot VARCHAR(255) NOT NULL,
  message_type VARCHAR(50) NOT NULL, -- 'request', 'response', 'notification', 'query'
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'delivered', 'failed'
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bot_messages_from ON bot_messages(from_bot);
CREATE INDEX idx_bot_messages_to ON bot_messages(to_bot);
CREATE INDEX idx_bot_messages_status ON bot_messages(status);
CREATE INDEX idx_bot_messages_created ON bot_messages(created_at DESC);

-- ============================================================================
-- TABLE: bot_coordination
-- Stores multi-bot coordination plans
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_coordination (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal TEXT NOT NULL,
  assignments JSONB NOT NULL, -- Array of {bot, task, capability}
  status VARCHAR(50) DEFAULT 'in-progress', -- 'in-progress', 'completed', 'failed'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bot_coordination_status ON bot_coordination(status);
CREATE INDEX idx_bot_coordination_started ON bot_coordination(started_at DESC);

-- ============================================================================
-- TABLE: shared_knowledge
-- Shared knowledge base accessible by all bots
-- ============================================================================

CREATE TABLE IF NOT EXISTS shared_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_bot VARCHAR(255) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shared_knowledge_topic ON shared_knowledge(topic);
CREATE INDEX idx_shared_knowledge_tags ON shared_knowledge USING GIN(tags);
CREATE INDEX idx_shared_knowledge_created ON shared_knowledge(created_at DESC);

-- ============================================================================
-- TABLE: bot_consensus
-- Stores consensus results from multi-bot voting
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_consensus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  participating_bots TEXT[] NOT NULL,
  votes JSONB NOT NULL, -- Array of {bot, vote, confidence, reasoning}
  consensus VARCHAR(255),
  agreement_rate DECIMAL(3,2), -- 0.00 to 1.00
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bot_consensus_created ON bot_consensus(created_at DESC);

-- ============================================================================
-- TABLE: bot_performance
-- Tracks performance metrics for each bot
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id VARCHAR(255) NOT NULL,
  metric_date DATE NOT NULL,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  average_response_time INTEGER, -- milliseconds
  uptime_percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(bot_id, metric_date)
);

CREATE INDEX idx_bot_performance_bot ON bot_performance(bot_id);
CREATE INDEX idx_bot_performance_date ON bot_performance(metric_date DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_bot_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_network
  SET last_seen = NOW()
  WHERE bot_id = NEW.from_bot;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen when bot sends a message
CREATE TRIGGER trigger_update_bot_last_seen
AFTER INSERT ON bot_messages
FOR EACH ROW
EXECUTE FUNCTION update_bot_last_seen();

-- Function to increment knowledge access count
CREATE OR REPLACE FUNCTION increment_knowledge_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Active bots with their capabilities
CREATE OR REPLACE VIEW active_bots AS
SELECT
  bot_id,
  bot_info->>'name' AS name,
  bot_info->>'type' AS type,
  bot_info->'capabilities' AS capabilities,
  status,
  last_seen,
  registered_at
FROM agent_network
WHERE status = 'active'
ORDER BY last_seen DESC;

-- View: Recent bot communications
CREATE OR REPLACE VIEW recent_communications AS
SELECT
  m.message_id,
  m.from_bot,
  m.to_bot,
  m.message_type,
  m.status,
  m.created_at,
  f.bot_info->>'name' AS from_bot_name,
  t.bot_info->>'name' AS to_bot_name
FROM bot_messages m
LEFT JOIN agent_network f ON m.from_bot = f.bot_id
LEFT JOIN agent_network t ON m.to_bot = t.bot_id
ORDER BY m.created_at DESC
LIMIT 100;

-- View: Bot network health summary
CREATE OR REPLACE VIEW network_health AS
SELECT
  COUNT(*) AS total_bots,
  COUNT(*) FILTER (WHERE status = 'active') AS active_bots,
  COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '1 hour') AS recently_active,
  COUNT(*) FILTER (WHERE last_seen < NOW() - INTERVAL '1 day') AS potentially_stale
FROM agent_network;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Register the Unbound Autonomous Agent
INSERT INTO agent_network (bot_id, bot_info, status) VALUES
(
  'unbound-autonomous-agent',
  '{
    "id": "unbound-autonomous-agent",
    "name": "Unbound Autonomous Agent",
    "type": "autonomous-agent",
    "capabilities": ["lead-generation", "content-creation", "market-research", "email-marketing", "landing-pages"],
    "apiEndpoint": "https://unboundteam-three.vercel.app/api",
    "status": "active"
  }'::jsonb,
  'active'
)
ON CONFLICT (bot_id) DO UPDATE SET
  bot_info = EXCLUDED.bot_info,
  last_seen = NOW();

-- ============================================================================
-- SECURITY
-- ============================================================================

-- Enable Row Level Security (optional, if using Supabase Auth)
ALTER TABLE agent_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_coordination ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_knowledge ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access" ON agent_network
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON bot_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON bot_coordination
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON shared_knowledge
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up old messages (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM bot_messages
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-bot-messages', '0 2 * * *', 'SELECT cleanup_old_messages()');

COMMENT ON TABLE agent_network IS 'Registry of all bots in the network';
COMMENT ON TABLE bot_messages IS 'Messages exchanged between bots';
COMMENT ON TABLE bot_coordination IS 'Multi-bot coordination plans and results';
COMMENT ON TABLE shared_knowledge IS 'Shared knowledge base for all bots';
COMMENT ON TABLE bot_consensus IS 'Consensus results from multi-bot voting';
COMMENT ON TABLE bot_performance IS 'Performance metrics for each bot';
