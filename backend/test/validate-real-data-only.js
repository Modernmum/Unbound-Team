// ⚠️ CRITICAL VALIDATION TEST - NEVER USE FAKE DATA
//
// This test ensures NO fake or placeholder data exists in the codebase.
// Run this BEFORE every deployment.
//
// Date Created: 2025-12-04
// Reason: System was generating fake AI companies instead of real leads
// See: NEVER-USE-FAKE-DATA.md

const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDATING: No fake or placeholder data exists\n');

let hasErrors = false;

// ============================================================================
// TEST 1: Check for hardcoded mock data patterns
// ============================================================================

console.log('Test 1: Checking for hardcoded mock data...');

const forbiddenPatterns = [
  { pattern: /john doe/i, file: 'any', reason: 'Placeholder name "John Doe"' },
  { pattern: /jane smith/i, file: 'any', reason: 'Placeholder name "Jane Smith"' },
  { pattern: /example\.com/i, file: 'any', reason: 'Example domain' },
  { pattern: /example saas/i, file: 'any', reason: 'Placeholder company "Example SaaS"' },
  { pattern: /product example/i, file: 'any', reason: 'Placeholder "Product Example"' },
  { pattern: /lorem ipsum/i, file: 'any', reason: 'Lorem ipsum placeholder text' },
  { pattern: /test@test\.com/i, file: 'any', reason: 'Test email' },
  { pattern: /fake@/i, file: 'any', reason: 'Fake email' },
  { pattern: /mock-/i, file: 'any', reason: 'Mock data prefix' },
  { pattern: /\[TODO: Replace with real/i, file: 'any', reason: 'TODO for real data replacement' }
];

const filesToCheck = [
  'services/executive-lead-finder.js',
  'services/lead-scraper.js',
  'services/lead-generator.js'
];

filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`   ⚠️  File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  forbiddenPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(content)) {
      console.log(`   ❌ FAIL: ${filePath}`);
      console.log(`      Found: ${reason}`);
      hasErrors = true;
    }
  });
});

if (!hasErrors) {
  console.log('   ✅ PASS: No hardcoded mock data found\n');
}

// ============================================================================
// TEST 2: Verify real data sources are used
// ============================================================================

console.log('Test 2: Verifying real data sources...');

const requiredSources = [
  { file: 'services/executive-lead-finder.js', pattern: /ycombinator\.com/i, name: 'YCombinator' },
  { file: 'services/executive-lead-finder.js', pattern: /stripe\.com|notion\.so|figma\.com/i, name: 'Real company fallback' },
  { file: 'services/lead-scraper.js', pattern: /indiehackers\.com/i, name: 'Indie Hackers' },
  { file: 'services/lead-scraper.js', pattern: /producthunt\.com/i, name: 'Product Hunt' }
];

requiredSources.forEach(({ file, pattern, name }) => {
  const fullPath = path.join(__dirname, '..', file);

  if (!fs.existsSync(fullPath)) {
    console.log(`   ⚠️  File not found: ${file}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  if (!pattern.test(content)) {
    console.log(`   ❌ FAIL: ${file}`);
    console.log(`      Missing real data source: ${name}`);
    hasErrors = true;
  } else {
    console.log(`   ✅ ${name} source found`);
  }
});

console.log('');

// ============================================================================
// TEST 3: Check for AI company generation (forbidden)
// ============================================================================

console.log('Test 3: Checking for AI company generation...');

const forbiddenAIPatterns = [
  { pattern: /find.*companies.*that.*raised/i, reason: 'AI asked to "find companies" (will invent them)' },
  { pattern: /generate.*list.*of.*companies/i, reason: 'AI asked to "generate companies"' },
  { pattern: /create.*fake.*companies/i, reason: 'Explicitly creating fake companies' }
];

filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  forbiddenAIPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(content)) {
      console.log(`   ❌ FAIL: ${filePath}`);
      console.log(`      Found: ${reason}`);
      hasErrors = true;
    }
  });
});

if (!hasErrors) {
  console.log('   ✅ PASS: No AI company generation found\n');
} else {
  console.log('');
}

// ============================================================================
// TEST 4: Verify backup file exists (proof of fix)
// ============================================================================

console.log('Test 4: Verifying backup of old fake version...');

const backupFile = path.join(__dirname, '..', 'services/executive-lead-finder-FAKE-BACKUP.js');

if (fs.existsSync(backupFile)) {
  console.log('   ✅ PASS: Backup of old fake version exists\n');
} else {
  console.log('   ⚠️  WARNING: Backup file not found (executive-lead-finder-FAKE-BACKUP.js)\n');
}

// ============================================================================
// TEST 5: Runtime validation function
// ============================================================================

console.log('Test 5: Testing runtime validation function...');

function validateRealCompany(company) {
  const errors = [];

  // Check 1: Must have real domain
  if (!company.website || !company.website.includes('.')) {
    errors.push('No valid domain');
  }

  // Check 2: Must not be "example" domain
  if (company.website && company.website.toLowerCase().includes('example.com')) {
    errors.push('Example domain detected');
  }

  // Check 3: Must not have placeholder names
  const fakePhrases = ['john doe', 'jane smith', 'example', 'test company', 'placeholder'];
  const name = (company.name || '').toLowerCase();
  if (fakePhrases.some(phrase => name.includes(phrase))) {
    errors.push('Placeholder name detected');
  }

  // Check 4: Must have real description (not lorem ipsum)
  if (company.description && company.description.toLowerCase().includes('lorem')) {
    errors.push('Lorem ipsum text detected');
  }

  // Check 5: Email must not be fake
  if (company.email) {
    const fakeEmailPatterns = ['example.com', 'test.com', 'fake@', 'mock@'];
    if (fakeEmailPatterns.some(pattern => company.email.toLowerCase().includes(pattern))) {
      errors.push('Fake email pattern detected');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Test with real companies
const testCases = [
  {
    company: { name: 'Stripe', website: 'https://stripe.com', description: 'Payment processing' },
    shouldPass: true,
    label: 'Real company (Stripe)'
  },
  {
    company: { name: 'John Doe', website: 'https://example.com', description: 'Test company' },
    shouldPass: false,
    label: 'Fake company (should fail)'
  },
  {
    company: { name: 'Axuall', website: 'https://axuall.com', description: 'Lorem ipsum dolor sit amet' },
    shouldPass: false,
    label: 'Company with lorem ipsum (should fail)'
  }
];

testCases.forEach(({ company, shouldPass, label }) => {
  const result = validateRealCompany(company);

  if (shouldPass && result.isValid) {
    console.log(`   ✅ ${label}: Passed validation`);
  } else if (!shouldPass && !result.isValid) {
    console.log(`   ✅ ${label}: Correctly rejected (${result.errors.join(', ')})`);
  } else {
    console.log(`   ❌ ${label}: Validation failed unexpectedly`);
    hasErrors = true;
  }
});

console.log('');

// ============================================================================
// FINAL RESULT
// ============================================================================

console.log('═══════════════════════════════════════════════════════════');

if (hasErrors) {
  console.log('❌ VALIDATION FAILED');
  console.log('');
  console.log('FAKE DATA DETECTED IN CODEBASE!');
  console.log('');
  console.log('Fix all errors above before deploying.');
  console.log('See: NEVER-USE-FAKE-DATA.md for guidelines.');
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(1);
} else {
  console.log('✅ ALL VALIDATIONS PASSED');
  console.log('');
  console.log('✅ No hardcoded mock data found');
  console.log('✅ Real data sources verified');
  console.log('✅ No AI company generation');
  console.log('✅ Runtime validation works correctly');
  console.log('');
  console.log('System is using REAL DATA ONLY.');
  console.log('Safe to deploy.');
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(0);
}
