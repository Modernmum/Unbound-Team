#!/usr/bin/env node
// Get dashboard URL for Maggie Forbes client

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getDashboardUrl() {
  const { data, error } = await supabase
    .from('testing_clients')
    .select('id, client_name, dashboard_token, site_url, created_at')
    .eq('client_name', 'Maggie Forbes')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching client:', error);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 MAGGIE FORBES CLIENT DASHBOARD');
  console.log('='.repeat(70));
  console.log(`\nClient ID: ${data.id}`);
  console.log(`Client Name: ${data.client_name}`);
  console.log(`Site URL: ${data.site_url}`);
  console.log(`Created: ${new Date(data.created_at).toLocaleString()}`);
  console.log(`\nDashboard Token: ${data.dashboard_token}`);
  console.log(`\n🔗 Dashboard URL:`);
  console.log(`https://unboundteam-three.vercel.app/client-dashboard.html?token=${data.dashboard_token}`);
  console.log('\n' + '='.repeat(70) + '\n');
}

getDashboardUrl();
