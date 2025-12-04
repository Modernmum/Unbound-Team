-- Check if Solution Brokerage tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('discovered_needs', 'solution_providers', 'need_provider_matches', 'sticky_revenue_relationships')
ORDER BY table_name;

-- Check if Maggie Forbes is already in providers
SELECT id, name, title, expertise_areas, availability_status 
FROM solution_providers 
WHERE name ILIKE '%maggie%' OR email ILIKE '%maggie%'
LIMIT 5;

-- Count existing data
SELECT 
  'discovered_needs' as table_name, COUNT(*) as rows FROM discovered_needs
UNION ALL
SELECT 'solution_providers', COUNT(*) FROM solution_providers
UNION ALL  
SELECT 'need_provider_matches', COUNT(*) FROM need_provider_matches
UNION ALL
SELECT 'sticky_revenue_relationships', COUNT(*) FROM sticky_revenue_relationships;
