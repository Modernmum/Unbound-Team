#!/usr/bin/env node
// Clean up old Maggie Forbes test clients

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function cleanup() {
  console.log('\n🧹 Cleaning up old test clients...\n');

  // Delete old Maggie Forbes clients
  const { data, error } = await supabase
    .from('testing_clients')
    .delete()
    .eq('client_name', 'Maggie Forbes')
    .select();

  if (error) {
    console.error('❌ Error deleting clients:', error);
    process.exit(1);
  }

  console.log(`✅ Deleted ${data.length} old Maggie Forbes client(s)`);
  data.forEach(client => {
    console.log(`   - ${client.id} (created ${new Date(client.created_at).toLocaleString()})`);
  });
  console.log('\n');
}

cleanup();
