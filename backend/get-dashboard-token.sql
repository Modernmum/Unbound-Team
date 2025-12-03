SELECT 
  id,
  client_name,
  client_email,
  dashboard_token,
  site_url,
  created_at
FROM testing_clients
WHERE client_name = 'Maggie Forbes'
ORDER BY created_at DESC
LIMIT 1;
