/**
 * Export Leads API
 * Exports leads as CSV for client download
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
    const { tenant_id, format = 'csv' } = req.query;

    if (!tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'tenant_id required'
      });
    }

    // Fetch all leads for tenant
    const { data: leads, error } = await supabase
      .from('generated_leads')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No leads found'
      });
    }

    // Generate CSV
    if (format === 'csv') {
      const csv = generateCSV(leads);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="leads-${tenant_id}-${Date.now()}.csv"`);

      return res.status(200).send(csv);
    }

    // Return JSON if not CSV
    return res.status(200).json({
      success: true,
      leads,
      count: leads.length
    });

  } catch (error) {
    console.error('Error in export-leads API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Generate CSV from leads data
 */
function generateCSV(leads) {
  // CSV headers
  const headers = [
    'Name',
    'Email',
    'Company',
    'Title',
    'Industry',
    'Pain Points',
    'Fit Score',
    'Urgency',
    'Business Area',
    'Source',
    'Outreach Tip',
    'Created At'
  ];

  // CSV rows
  const rows = leads.map(lead => [
    escapeCSV(lead.name || ''),
    escapeCSV(lead.email || ''),
    escapeCSV(lead.company || ''),
    escapeCSV(lead.title || ''),
    escapeCSV(lead.industry || ''),
    escapeCSV(lead.pain_points || ''),
    lead.fit_score || '',
    escapeCSV(lead.urgency || ''),
    escapeCSV(lead.business_area || ''),
    escapeCSV(lead.platform || lead.source || ''),
    escapeCSV(lead.outreach_tip || ''),
    lead.created_at || ''
  ]);

  // Combine headers and rows
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csv;
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(field) {
  if (field == null) return '';

  const str = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}
