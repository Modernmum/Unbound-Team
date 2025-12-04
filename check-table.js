const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  'https://bixudsnkdeafczzqfvdq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpeHVkc25rZGVhZmN6enFmdmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc1NTI5NCwiZXhwIjoyMDc5MzMxMjk0fQ.eGuTmmYqpS2SPaRN9Xz4Tryy0Ndw_td91ylc07TgJi0'
);

async function checkTables() {
  console.log('\n🔍 Checking Supabase tables...\n');

  const tables = ['discovered_opportunities', 'testing_clients', 'bot_test_results'];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ ${table}: NOT FOUND`);
      console.log(`   Error: ${error.message}`);
    } else {
      console.log(`✅ ${table}: EXISTS (${data.length} rows found)`);
    }
  }

  console.log('\n');
}

checkTables();
