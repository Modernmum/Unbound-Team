-- UPDATE TENANT IDS TO USE YOUR EXISTING TENANT
-- Run this in Supabase SQL Editor after running RUN-THIS-IN-SUPABASE.sql

-- Option 1: Update Maggie Forbes to use your existing tenant ID
UPDATE tenants
SET id = '00000000-0000-0000-0000-000000000001'
WHERE slug = 'maggie-forbes';

-- Option 2: Or if you want both businesses under one tenant,
-- delete the separate Growth Manager Pro tenant and
-- add it as a "brand" under your main tenant

-- First, let's see what we have:
SELECT id, name, slug FROM tenants ORDER BY created_at;

-- If you want ONE tenant for both businesses:
-- 1. Delete Growth Manager Pro as separate tenant
DELETE FROM tenants WHERE slug = 'growth-manager-pro';

-- 2. Update Maggie Forbes to be your main tenant
UPDATE tenants
SET
  id = '00000000-0000-0000-0000-000000000001',
  name = 'Kristi''s Business Empire',
  type = 'main',
  settings = settings || '{"brands": ["maggie-forbes", "growth-manager-pro"]}'::jsonb
WHERE slug = 'maggie-forbes';

-- OR if you want BOTH to share the same tenant ID but keep them separate:
-- (This means they share users, revenue, etc.)

UPDATE tenants
SET id = '00000000-0000-0000-0000-000000000001'
WHERE slug IN ('maggie-forbes', 'growth-manager-pro');

-- Note: The above will fail with unique constraint error
-- because two tenants can't have the same ID

-- Better approach: Make one the parent
UPDATE tenants
SET
  id = '00000000-0000-0000-0000-000000000001',
  settings = settings || '{"child_brands": ["growth-manager-pro"]}'::jsonb
WHERE slug = 'maggie-forbes';

-- And link GMP as a child brand
UPDATE tenants
SET
  settings = settings || '{"parent_tenant_id": "00000000-0000-0000-0000-000000000001"}'::jsonb
WHERE slug = 'growth-manager-pro';

-- Check results:
SELECT id, name, slug, type, settings FROM tenants;
