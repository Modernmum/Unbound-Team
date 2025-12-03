// API endpoint to get client dashboard data
// Uses service key to bypass RLS

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    // Create Supabase client with service key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('testing_clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get test results
    const { data: tests, error: testsError } = await supabase
      .from('bot_test_results')
      .select('*')
      .eq('client_id', clientId)
      .order('test_date', { ascending: false })
      .limit(10);

    if (testsError) {
      console.error('Tests error:', testsError);
    }

    // Get open issues
    const { data: issues, error: issuesError } = await supabase
      .from('bot_test_issues')
      .select('*')
      .eq('client_id', clientId)
      .in('status', ['open', 'pending']);

    if (issuesError) {
      console.error('Issues error:', issuesError);
    }

    // Calculate stats
    const stats = {
      testsRun: tests?.length || 0,
      openIssues: issues?.length || 0,
      latestRating: tests?.[0]?.overall_rating || 0,
      healthScore: 100
    };

    if (tests && tests.length > 0) {
      const avgRating = tests.slice(0, 5).reduce((sum, t) => sum + t.overall_rating, 0) / Math.min(tests.length, 5);
      stats.healthScore = Math.round((avgRating / 10) * 100);
    }

    return res.status(200).json({
      success: true,
      client: {
        id: client.id,
        name: client.client_name,
        email: client.client_email,
        siteUrl: client.site_url,
        plan: client.plan
      },
      stats,
      tests: tests || [],
      issues: issues || []
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
