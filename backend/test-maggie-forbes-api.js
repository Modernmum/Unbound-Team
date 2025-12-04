// Test script for Maggie Forbes API
// Run this after starting the server with: node server.js

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Helper function to make API calls
async function testAPI() {
  console.log('🧪 Testing Maggie Forbes API Integration\n');

  try {
    // Test 1: Add a client
    console.log('1️⃣  Adding a test client...');
    const addClientResponse = await axios.post(`${API_BASE}/api/maggie-forbes/clients`, {
      email: 'testclient@business.com',
      name: 'Test Client',
      plan: 'premium'
    });
    console.log('✅ Client added:', addClientResponse.data);
    console.log('');

    // Test 2: Get all clients
    console.log('2️⃣  Getting all Maggie Forbes clients...');
    const clientsResponse = await axios.get(`${API_BASE}/api/maggie-forbes/clients`);
    console.log('✅ Clients found:', clientsResponse.data.count);
    console.log('   Clients:', clientsResponse.data.clients);
    console.log('');

    // Test 3: Generate leads for client
    console.log('3️⃣  Generating leads for client...');
    const leadsResponse = await axios.post(`${API_BASE}/api/maggie-forbes/generate-leads`, {
      clientEmail: 'testclient@business.com',
      industry: 'technology',
      count: 20,
      targetTitles: ['CEO', 'VP', 'Director']
    });
    console.log('✅ Lead generation started:', leadsResponse.data);
    console.log('   Job ID:', leadsResponse.data.jobId);
    console.log('   Estimated time:', leadsResponse.data.estimatedTime);
    console.log('');

    // Wait 5 seconds for job to process
    console.log('⏳ Waiting 5 seconds for job to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 4: Get lead results
    console.log('4️⃣  Getting lead generation results...');
    const resultsResponse = await axios.get(
      `${API_BASE}/api/maggie-forbes/clients/testclient@business.com/leads`
    );
    console.log('✅ Results retrieved:', resultsResponse.data.totalJobs, 'jobs');
    if (resultsResponse.data.jobs.length > 0) {
      const latestJob = resultsResponse.data.jobs[0];
      console.log('   Latest job status:', latestJob.status);
      if (latestJob.result) {
        console.log('   Leads found:', latestJob.result.leadsFound || 0);
      }
    }
    console.log('');

    // Test 5: Get Maggie Forbes stats
    console.log('5️⃣  Getting Maggie Forbes business stats...');
    const statsResponse = await axios.get(`${API_BASE}/api/maggie-forbes/stats`);
    console.log('✅ Stats retrieved:', statsResponse.data.stats);
    console.log('');

    console.log('✅ All API tests completed successfully!\n');

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

// Run tests
testAPI().catch(console.error);
