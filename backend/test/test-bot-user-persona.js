#!/usr/bin/env node
// Test Bot User Persona - Simulate real user experiences

require('dotenv').config();
const botUserPersona = require('../services/bot-user-persona');
const agentNetwork = require('../services/agent-network');

async function runUserTest(personaKey) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎭 TESTING AS: ${personaKey.toUpperCase()}`);
  console.log('='.repeat(70));

  try {
    // Run user journey simulation
    const experience = await botUserPersona.simulateUserJourney(personaKey);

    // Generate report
    const report = botUserPersona.generateReport(experience);
    console.log(report);

    // Share experience with bot network
    await agentNetwork.shareKnowledge('gmp-maintenance-bot', {
      topic: 'user-experience',
      content: experience,
      summary: `User test: ${experience.persona} - Rating: ${experience.overallRating}/10`,
      tags: ['ux', 'testing', 'user-journey', personaKey]
    });

    return experience;

  } catch (error) {
    console.error(`\n❌ Test failed for ${personaKey}:`, error);
    throw error;
  }
}

async function runAllUserTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 BOT USER PERSONA - TESTING SUITE');
  console.log('Testing GMP from multiple user perspectives');
  console.log('='.repeat(70));

  const personas = [
    'smallBusinessOwner',
    'freelancer',
    'teamLead',
    'enterpriseManager'
  ];

  const results = [];

  for (const persona of personas) {
    try {
      const result = await runUserTest(persona);
      results.push(result);

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      console.error(`Failed to test ${persona}:`, error);
      results.push({
        persona,
        error: error.message,
        success: false
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY OF ALL USER TESTS');
  console.log('='.repeat(70));

  results.forEach(result => {
    if (result.success !== false) {
      console.log(`\n${result.persona} (${result.role})`);
      console.log(`  Rating: ${result.overallRating}/10 ${result.wouldRecommend ? '✅' : '❌'}`);
      console.log(`  Issues: ${result.issues.length}`);
      console.log(`  Duration: ${result.duration.toFixed(1)} minutes`);
    } else {
      console.log(`\n${result.persona}`);
      console.log(`  Status: ❌ FAILED`);
      console.log(`  Error: ${result.error}`);
    }
  });

  const avgRating = results
    .filter(r => r.success !== false)
    .reduce((sum, r) => sum + r.overallRating, 0) / results.filter(r => r.success !== false).length;

  const totalIssues = results
    .filter(r => r.success !== false)
    .reduce((sum, r) => sum + r.issues.length, 0);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`OVERALL AVERAGE RATING: ${avgRating.toFixed(1)}/10`);
  console.log(`TOTAL ISSUES FOUND: ${totalIssues}`);
  console.log('='.repeat(70) + '\n');

  return results;
}

// Run tests
if (require.main === module) {
  // Check if specific persona provided
  const persona = process.argv[2];

  if (persona) {
    // Test single persona
    runUserTest(persona)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    // Test all personas
    runAllUserTests()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { runUserTest, runAllUserTests };
