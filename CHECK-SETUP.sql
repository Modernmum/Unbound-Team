-- Verify everything is ready
SELECT 
  (SELECT COUNT(*) FROM discovered_needs) as needs_count,
  (SELECT COUNT(*) FROM solution_providers) as providers_count,
  (SELECT COUNT(*) FROM need_provider_matches) as matches_count,
  (SELECT COUNT(*) FROM sticky_revenue_relationships) as revenue_relationships_count;

-- Check if Maggie Forbes exists as a provider
SELECT id, name, title, expertise_areas, availability_status 
FROM solution_providers 
LIMIT 5;
