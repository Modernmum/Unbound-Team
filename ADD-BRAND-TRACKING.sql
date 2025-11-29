-- Add brand tracking to distinguish between Maggie Forbes and Growth Manager Pro
-- Run this in Supabase SQL Editor

-- Add brand column to tenant_users
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS primary_brand TEXT DEFAULT 'maggie-forbes';

-- Add brand column to generated_content (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_content') THEN
    ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS brand TEXT;
  END IF;
END $$;

-- Add brand column to automation_log
ALTER TABLE automation_log ADD COLUMN IF NOT EXISTS brand TEXT;

-- Create view for Maggie Forbes clients
CREATE OR REPLACE VIEW maggie_forbes_clients AS
SELECT
  tu.*,
  p.email,
  p.name
FROM tenant_users tu
LEFT JOIN profiles p ON tu.user_id = p.id
WHERE tu.tenant_id = '00000000-0000-0000-0000-000000000001'
AND (tu.source = 'maggie-forbes' OR tu.primary_brand = 'maggie-forbes');

-- Create view for Growth Manager Pro clients
CREATE OR REPLACE VIEW growth_manager_pro_clients AS
SELECT
  tu.*,
  p.email,
  p.name
FROM tenant_users tu
LEFT JOIN profiles p ON tu.user_id = p.id
WHERE tu.tenant_id = '00000000-0000-0000-0000-000000000001'
AND (tu.source = 'growth-manager-pro' OR tu.primary_brand = 'growth-manager-pro');

-- Function to get brand statistics
CREATE OR REPLACE FUNCTION get_brand_stats(brand_name TEXT)
RETURNS TABLE(
  total_clients BIGINT,
  active_clients BIGINT,
  paying_clients BIGINT,
  mrr NUMERIC,
  problems_solved BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT tu.user_id)::BIGINT as total_clients,
    COUNT(DISTINCT CASE WHEN tu.status = 'active' THEN tu.user_id END)::BIGINT as active_clients,
    COUNT(DISTINCT CASE WHEN tu.plan != 'free' THEN tu.user_id END)::BIGINT as paying_clients,
    COALESCE(SUM(CASE
      WHEN tu.plan = 'starter' THEN 50
      WHEN tu.plan = 'growth' THEN 150
      ELSE 0
    END), 0) as mrr,
    0::BIGINT as problems_solved  -- TODO: Count from generated_content table
  FROM tenant_users tu
  WHERE tu.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND (tu.source = brand_name OR tu.primary_brand = brand_name);
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM get_brand_stats('maggie-forbes');
-- SELECT * FROM get_brand_stats('growth-manager-pro');

-- Summary
SELECT 'Brand tracking added! Use get_brand_stats(''maggie-forbes'') or get_brand_stats(''growth-manager-pro'') to get statistics.' as status;
