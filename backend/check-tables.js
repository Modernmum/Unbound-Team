require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTables() {
  // Query pg_tables to see what exists
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

  if (error) {
    console.log('Trying direct query instead...');
    
    // Try a simple INSERT to see if tables exist
    const { error: insertError } = await supabase
      .from('discovered_needs')
      .insert({
        source: 'Test',
        problem_description: 'Test problem',
        business_area: 'test',
        status: 'discovered'
      })
      .select();

    if (insertError) {
      console.error('❌ Tables might not exist:', insertError.message);
      console.log('\n💡 Solution: In Supabase dashboard, go to Database → Refresh schema');
    } else {
      console.log('✅ Tables exist! Schema cache just needs refresh.');
      console.log('\n💡 In Supabase: Database → Refresh button (top right)');
    }
  } else {
    console.log('✅ Tables found:', data);
  }
}

checkTables().then(() => process.exit(0));
