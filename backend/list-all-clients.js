#!/usr/bin/env node
// List all testing clients

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function listClients() {
  const { data, error } = await supabase
    .from('testing_clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching clients:', error);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📋 ALL TESTING CLIENTS');
  console.log('='.repeat(70) + '\n');

  data.forEach((client, i) => {
    console.log(`${i + 1}. ${client.client_name}`);
    console.log(`   ID: ${client.id}`);
    console.log(`   Email: ${client.client_email}`);
    console.log(`   Site: ${client.site_url}`);
    console.log(`   Token: ${client.dashboard_token || 'NULL'}`);
    console.log(`   Created: ${new Date(client.created_at).toLocaleString()}`);

    if (client.dashboard_token) {
      console.log(`   🔗 Dashboard: https://unboundteam-three.vercel.app/client-dashboard.html?token=${client.dashboard_token}`);
    }
    console.log('');
  });

  console.log('='.repeat(70) + '\n');
}

listClients();
