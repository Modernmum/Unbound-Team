#!/usr/bin/env node
// Update Maggie Forbes email to correct address

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateEmail() {
  console.log('\n📧 Updating Maggie Forbes email...\n');

  const { data, error } = await supabase
    .from('testing_clients')
    .update({
      client_email: 'maggie@maggieforbesstrategies.com'
    })
    .eq('client_name', 'Maggie Forbes')
    .select();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('✅ Email updated successfully!');
  data.forEach(client => {
    console.log(`\n   Client: ${client.client_name}`);
    console.log(`   Email: ${client.client_email}`);
    console.log(`   Site: ${client.site_url}`);
    console.log(`   ID: ${client.id}`);
  });
  console.log('\n');
}

updateEmail();
