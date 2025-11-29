-- Unbound.team Queue System using Supabase
-- Replaces Redis/Bull with Postgres-based job queue

-- Job Queue Table
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_name ON job_queue(queue_name);
CREATE INDEX IF NOT EXISTS idx_queue_created ON job_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON job_queue(priority DESC);

-- AI Usage Tracking Table
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost DECIMAL(10, 6),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cost tracking
CREATE INDEX IF NOT EXISTS idx_ai_usage_timestamp ON ai_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage(model_id);

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

-- Function to get next pending job
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

-- Function to mark job completed
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

-- Function to mark job failed
CREATE OR REPLACE FUNCTION fail_job(job_id UUID, error_message TEXT)
RETURNS VOID AS $$
DECLARE
  current_attempts INTEGER;
  max_retries INTEGER;
BEGIN
  SELECT attempts, max_attempts INTO current_attempts, max_retries
  FROM job_queue WHERE id = job_id;

  IF current_attempts + 1 >= max_retries THEN
    -- Max attempts reached, mark as failed
    UPDATE job_queue
    SET
      status = 'failed',
      error = error_message,
      failed_at = NOW(),
      attempts = attempts + 1
    WHERE id = job_id;
  ELSE
    -- Retry: reset to pending
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

-- Enable Row Level Security
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for serverless functions)
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
