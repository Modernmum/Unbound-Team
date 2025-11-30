/**
 * Client Dashboard API
 * Powers both Maggie Forbes and GMP dashboards
 * Returns aggregated data about leads, content, and research
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.ENTREPRENEURHUB_SUPABASE_URL,
  process.env.ENTREPRENEURHUB_SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tenant_id } = req.query;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id required'
      });
    }

    // Get date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7*24*60*60*1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30*24*60*60*1000).toISOString();

    // Fetch leads (last 7 days)
    const { data: leadsWeek, error: leadsError } = await supabase
      .from('generated_leads')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('created_at', sevenDaysAgo);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
    }

    // Fetch content (last 30 days)
    const { data: content, error: contentError } = await supabase
      .from('generated_content')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('created_at', thirtyDaysAgo);

    if (contentError) {
      console.error('Error fetching content:', contentError);
    }

    // Fetch research (last 30 days)
    const { data: research, error: researchError } = await supabase
      .from('market_research')
      .select('*')
      .eq('tenant_id', tenant_id)
      .gte('created_at', thirtyDaysAgo);

    if (researchError) {
      console.error('Error fetching research:', researchError);
    }

    // Calculate stats
    const stats = {
      leads: {
        this_week: leadsWeek?.length || 0,
        avg_fit_score: leadsWeek && leadsWeek.length > 0
          ? (leadsWeek.reduce((sum, l) => sum + (l.fit_score || 0), 0) / leadsWeek.length).toFixed(1)
          : 0,
        high_quality: leadsWeek?.filter(l => l.fit_score >= 8).length || 0,
        by_urgency: {
          urgent: leadsWeek?.filter(l => l.urgency === 'urgent').length || 0,
          high: leadsWeek?.filter(l => l.urgency === 'high').length || 0,
          medium: leadsWeek?.filter(l => l.urgency === 'medium').length || 0
        }
      },
      content: {
        total: content?.length || 0,
        draft: content?.filter(c => c.status === 'draft').length || 0,
        published: content?.filter(c => c.status === 'published').length || 0,
        by_type: {
          blog: content?.filter(c => c.content_type === 'blog').length || 0,
          social: content?.filter(c => c.content_type === 'social').length || 0,
          email: content?.filter(c => c.content_type === 'email').length || 0
        }
      },
      research: {
        total: research?.length || 0,
        avg_opportunity_score: research && research.length > 0
          ? (research.reduce((sum, r) => sum + (r.opportunity_score || 0), 0) / research.length).toFixed(1)
          : 0,
        by_type: {
          competitor: research?.filter(r => r.research_type === 'competitor_analysis').length || 0,
          market_gap: research?.filter(r => r.research_type === 'market_gap').length || 0,
          pricing: research?.filter(r => r.research_type === 'pricing').length || 0
        }
      }
    };

    // Return response
    return res.status(200).json({
      success: true,
      tenant_id,
      stats,
      recent_leads: leadsWeek?.slice(0, 10) || [],
      recent_content: content?.slice(0, 5) || [],
      recent_research: research?.slice(0, 3) || [],
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in client-dashboard API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
