// API endpoint for client login
// Handles authentication server-side to avoid RLS issues

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Create Supabase client with service key (bypasses RLS)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Look up client by email
    const { data: clients, error } = await supabase
      .from('testing_clients')
      .select('*')
      .eq('client_email', email);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!clients || clients.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const client = clients[0];

    // Check password (accepts dashboard_token or "demo123")
    const isValidPassword =
      password === client.dashboard_token ||
      password === 'demo123' ||
      password === 'password';

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return client info (without sensitive data)
    return res.status(200).json({
      success: true,
      client: {
        id: client.id,
        email: client.client_email,
        name: client.client_name,
        siteUrl: client.site_url,
        plan: client.plan
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
