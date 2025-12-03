-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('testing_clients', 'bot_test_results', 'bot_test_issues');
