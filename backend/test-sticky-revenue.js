// Quick test of sticky revenue system
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSystem() {
  console.log('🧪 Testing Sticky Revenue System\n');

  // Test 1: Check tables exist
  console.log('1️⃣  Checking database tables...');

  const tables = [
    'discovered_needs',
    'solution_providers',
    'matches',
    'introductions',
    'payments',
    'ongoing_relationships',
    'recurring_payments',
    'relationship_health_checks',
    'client_accounts'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table}`);
    }
  }

  // Test 2: Check functions exist
  console.log('\n2️⃣  Checking database functions...');

  const { data: mrrData, error: mrrError } = await supabase.rpc('calculate_total_mrr');
  if (mrrError) {
    console.log(`   ❌ calculate_total_mrr: ${mrrError.message}`);
  } else {
    console.log(`   ✅ calculate_total_mrr: $${mrrData / 100}`);
  }

  const { data: statsData, error: statsError } = await supabase.rpc('get_sticky_revenue_stats');
  if (statsError) {
    console.log(`   ❌ get_sticky_revenue_stats: ${statsError.message}`);
  } else {
    console.log(`   ✅ get_sticky_revenue_stats`);
    console.log(`      Total MRR: $${statsData.total_mrr / 100}`);
    console.log(`      Annual Recurring Revenue: $${statsData.annual_recurring_revenue / 100}`);
    console.log(`      Active Relationships: ${statsData.active_relationships}`);
  }

  // Test 3: Check sample data
  console.log('\n3️⃣  Checking sample data...');

  const { data: needs, error: needsError } = await supabase
    .from('discovered_needs')
    .select('*')
    .limit(1);

  if (needs && needs.length > 0) {
    console.log(`   ✅ Sample need found: ${needs[0].problem_description?.substring(0, 50)}...`);
  } else {
    console.log('   ⚠️  No sample needs found (this is OK)');
  }

  const { data: providers, error: providersError } = await supabase
    .from('solution_providers')
    .select('*')
    .limit(1);

  if (providers && providers.length > 0) {
    console.log(`   ✅ Sample provider found: ${providers[0].name}`);
  } else {
    console.log('   ⚠️  No sample providers found (this is OK)');
  }

  const { data: relationships, error: relError } = await supabase
    .from('ongoing_relationships')
    .select('*')
    .limit(1);

  if (relationships && relationships.length > 0) {
    console.log(`   ✅ Sample relationship found: $${relationships[0].total_mrr / 100}/month MRR`);
  } else {
    console.log('   ⚠️  No ongoing relationships yet (create your first match!)');
  }

  console.log('\n✅ System test complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Ready to make your first $3K/month match!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testSystem().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
