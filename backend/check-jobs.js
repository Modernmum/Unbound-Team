// Quick script to check job status
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkJobs() {
  console.log('📊 Checking job status...\n');

  // Check all jobs (correct table name: job_queue)
  const { data: allJobs, error } = await supabase
    .from('job_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!allJobs || allJobs.length === 0) {
    console.log('⚠️  No jobs found in database');
    return;
  }

  console.log(`Found ${allJobs.length} jobs:\n`);

  const statusCounts = {};
  allJobs.forEach(job => {
    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
  });

  console.log('📊 Status Summary:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  console.log('\n📋 Recent Jobs:');
  allJobs.slice(0, 10).forEach(job => {
    const emoji = job.status === 'completed' ? '✅' :
                  job.status === 'failed' ? '❌' :
                  job.status === 'processing' ? '🔄' : '⏳';
    console.log(`${emoji} [${job.status}] ${job.queue_name} - ${job.id}`);
    if (job.status === 'completed' && job.result) {
      console.log(`   Result: ${job.result.leadsFound || 0} leads found`);
    }
    if (job.status === 'failed') {
      console.log(`   Error: ${job.error || 'Unknown error'}`);
    }
  });
}

checkJobs().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
