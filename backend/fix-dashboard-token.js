#!/usr/bin/env node
// Generate and update dashboard token for Maggie Forbes client

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixDashboardToken() {
  // Generate a secure random token
  const dashboardToken = crypto.randomBytes(32).toString('hex');

  console.log('\n' + '='.repeat(70));
  console.log('🔧 FIXING DASHBOARD TOKEN');
  console.log('='.repeat(70));
  console.log(`\nGenerated Token: ${dashboardToken}`);

  // Update the Maggie Forbes client record
  const { data, error } = await supabase
    .from('testing_clients')
    .update({ dashboard_token: dashboardToken })
    .eq('client_name', 'Maggie Forbes')
    .select()
    .single();

  if (error) {
    console.error('\n❌ Error updating token:', error);
    process.exit(1);
  }

  console.log('\n✅ Dashboard token updated successfully!');
  console.log(`\nClient ID: ${data.id}`);
  console.log(`Client Name: ${data.client_name}`);
  console.log(`Site URL: ${data.site_url}`);
  console.log(`\n🔗 Dashboard URL:`);
  console.log(`https://unboundteam-three.vercel.app/client-dashboard.html?token=${dashboardToken}`);
  console.log('\n' + '='.repeat(70) + '\n');
}

fixDashboardToken();
