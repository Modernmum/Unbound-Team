-- This will force Supabase to recognize the discovered_opportunities table

-- First, verify the table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'discovered_opportunities';

-- Force a refresh by selecting from it
SELECT COUNT(*) FROM discovered_opportunities;

-- Grant permissions to ensure API can access it
GRANT ALL ON discovered_opportunities TO anon;
GRANT ALL ON discovered_opportunities TO authenticated;
GRANT ALL ON discovered_opportunities TO service_role;

-- Make sure RLS is disabled (we already did this but let's be sure)
ALTER TABLE discovered_opportunities DISABLE ROW LEVEL SECURITY;
