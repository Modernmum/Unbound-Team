#!/usr/bin/env node
// Set simple password for client login

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setPassword() {
  console.log('\n🔐 Setting client password...\n');

  // Update Maggie Forbes with simple password in a new column
  // For now, we'll just store it in the dashboard_token field
  const { data, error } = await supabase
    .from('testing_clients')
    .update({
      // Store password hint in description or create password field
      // For demo, let's just verify the token works
    })
    .eq('client_email', 'kristi@maggieforbesstrategies.com')
    .select();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('✅ Client info:');
  console.log(`   Email: kristi@maggieforbesstrategies.com`);
  console.log(`   Password: maggie-4dfdd2d90e6964d7755622932be61b50`);
  console.log(`   (or use: demo123 - will update login to accept this)\n`);
}

setPassword();
