#!/usr/bin/env node
/**
 * Automatic Railway Environment Variable Sync
 * Reads .env file and syncs to Railway via CLI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Railway Environment Sync\n');

// Read .env file
const envPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

const variables = {};
let count = 0;

// Parse .env file
for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (!key || valueParts.length === 0) continue;

    let value = valueParts.join('=').trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
    }

    variables[key.trim()] = value;
    count++;
}

console.log(`📋 Found ${count} environment variables\n`);

// Key variables that MUST be set
const criticalVars = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'SUPABASE_SERVICE_KEY',
    'ANTHROPIC_API_KEY'
];

console.log('🔑 Critical Variables:');
for (const key of criticalVars) {
    if (variables[key]) {
        const preview = variables[key].substring(0, 20) + '...';
        console.log(`   ✅ ${key} = ${preview}`);
    } else {
        console.log(`   ❌ ${key} = MISSING`);
    }
}

console.log('\n📝 All Variables:');
for (const [key, value] of Object.entries(variables)) {
    const preview = value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`   ${key} = ${preview}`);
}

console.log('\n' + '='.repeat(70));
console.log('COPY AND PASTE THESE COMMANDS INTO YOUR TERMINAL:');
console.log('='.repeat(70) + '\n');

// Generate railway CLI commands
console.log('# Navigate to project directory');
console.log(`cd ${__dirname}\n`);

console.log('# Set critical variables on Railway');
for (const key of criticalVars) {
    if (variables[key]) {
        // Escape single quotes in value
        const escapedValue = variables[key].replace(/'/g, "'\\''");
        console.log(`railway variables set ${key}='${escapedValue}'`);
    }
}

console.log('\n# Optional: Set all other variables');
for (const [key, value] of Object.entries(variables)) {
    if (!criticalVars.includes(key)) {
        const escapedValue = value.replace(/'/g, "'\\''");
        console.log(`railway variables set ${key}='${escapedValue}'`);
    }
}

console.log('\n# Redeploy');
console.log('railway up --detach');

console.log('\n' + '='.repeat(70));
console.log('\n✅ Copy the commands above and run them in your terminal!');
console.log('   Or run: node sync-env-to-railway.js | bash\n');
