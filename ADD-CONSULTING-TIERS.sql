-- Add consulting tier tracking for Maggie Forbes clients
-- Run this in Supabase SQL Editor

-- Add consulting tier columns
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS consulting_tier TEXT;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS consulting_fee NUMERIC DEFAULT 0;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS gmp_access BOOLEAN DEFAULT FALSE;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS white_glove BOOLEAN DEFAULT FALSE;

-- Create consulting tiers enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consulting_tier_type') THEN
    CREATE TYPE consulting_tier_type AS ENUM ('strategy', 'premium', 'enterprise');
  END IF;
END$$;

-- Update consulting_tier column to use enum (optional, for data validation)
-- ALTER TABLE tenant_users ALTER COLUMN consulting_tier TYPE consulting_tier_type USING consulting_tier::consulting_tier_type;

-- Create view for Maggie Forbes clients by tier
CREATE OR REPLACE VIEW maggie_forbes_tiers AS
SELECT
  tu.id,
  tu.user_id,
  p.name,
  p.email,
  tu.consulting_tier,
  tu.consulting_fee,
  tu.gmp_access,
  tu.white_glove,
  tu.plan as gmp_plan,
  tu.status,
  tu.created_at
FROM tenant_users tu
LEFT JOIN profiles p ON tu.user_id = p.id
WHERE tu.primary_brand = 'maggie-forbes'
ORDER BY tu.consulting_fee DESC;

-- Function to provision Maggie Forbes client with tier
CREATE OR REPLACE FUNCTION provision_maggie_forbes_client(
  client_email TEXT,
  client_name TEXT,
  tier consulting_tier_type,
  start_date TIMESTAMP DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  tier_config JSONB;
BEGIN
  -- Define tier configurations
  tier_config := CASE tier
    WHEN 'strategy' THEN '{
      "consulting_fee": 2500,
      "gmp_access": false,
      "gmp_plan": null,
      "white_glove": false
    }'::JSONB
    WHEN 'premium' THEN '{
      "consulting_fee": 5000,
      "gmp_access": true,
      "gmp_plan": "premium",
      "white_glove": false
    }'::JSONB
    WHEN 'enterprise' THEN '{
      "consulting_fee": 10000,
      "gmp_access": true,
      "gmp_plan": "enterprise",
      "white_glove": true
    }'::JSONB
  END;

  -- Create user in profiles (if not exists)
  INSERT INTO profiles (email, name, created_at)
  VALUES (client_email, client_name, start_date)
  ON CONFLICT (email) DO UPDATE SET name = client_name
  RETURNING id INTO new_user_id;

  -- Create tenant_user record
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    primary_brand,
    source,
    consulting_tier,
    consulting_fee,
    gmp_access,
    white_glove,
    plan,
    plan_limits,
    status,
    created_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000001',
    new_user_id,
    'maggie-forbes',
    'maggie-forbes',
    tier,
    (tier_config->>'consulting_fee')::NUMERIC,
    (tier_config->>'gmp_access')::BOOLEAN,
    (tier_config->>'white_glove')::BOOLEAN,
    tier_config->>'gmp_plan',
    CASE
      WHEN tier_config->>'gmp_plan' = 'premium' THEN '{"problems_per_month": 9999}'::JSONB
      WHEN tier_config->>'gmp_plan' = 'enterprise' THEN '{"problems_per_month": 9999}'::JSONB
      ELSE '{"problems_per_month": 0}'::JSONB
    END,
    'active',
    start_date
  )
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET
    consulting_tier = tier,
    consulting_fee = (tier_config->>'consulting_fee')::NUMERIC,
    gmp_access = (tier_config->>'gmp_access')::BOOLEAN,
    white_glove = (tier_config->>'white_glove')::BOOLEAN,
    plan = tier_config->>'gmp_plan';

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get revenue breakdown by tier
CREATE OR REPLACE FUNCTION get_revenue_by_tier()
RETURNS TABLE(
  tier TEXT,
  client_count BIGINT,
  monthly_revenue NUMERIC,
  annual_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(tu.consulting_tier::TEXT, 'none') as tier,
    COUNT(*)::BIGINT as client_count,
    SUM(tu.consulting_fee) as monthly_revenue,
    SUM(tu.consulting_fee * 12) as annual_revenue
  FROM tenant_users tu
  WHERE tu.primary_brand = 'maggie-forbes'
  AND tu.status = 'active'
  GROUP BY tu.consulting_tier
  ORDER BY monthly_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- Provision a new premium client
-- SELECT provision_maggie_forbes_client('sarah@example.com', 'Sarah Johnson', 'premium');

-- Get revenue breakdown
-- SELECT * FROM get_revenue_by_tier();

-- View all Maggie Forbes clients by tier
-- SELECT * FROM maggie_forbes_tiers;

SELECT 'Consulting tier tracking added! Use provision_maggie_forbes_client() to add clients.' as status;
