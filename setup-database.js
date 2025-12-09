#!/usr/bin/env node

/**
 * Database Setup Script
 *
 * This script executes the database-schema.sql file in Supabase
 * to create all required tables with approval gates.
 *
 * Usage:
 *   node setup-database.js
 *
 * Requirements:
 *   - SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_KEY environment variable (admin key)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🔧 Setting up Unbound.Team database...\n');

  // Check for required environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: Missing required environment variables');
    console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
    console.error('\n   You can find these in your Supabase project settings:');
    console.error('   https://app.supabase.com/project/[your-project]/settings/api');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'database-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Reading database-schema.sql...');
    console.log(`   Found ${schema.split('\n').length} lines of SQL\n`);

    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`🔨 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 60).replace(/\n/g, ' ');

      try {
        // Execute via Supabase REST API
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          // If exec_sql doesn't exist, we'll need to use the SQL editor
          console.log('⚠️  Note: Direct SQL execution requires the Supabase SQL Editor');
          console.log('   Please execute database-schema.sql manually in Supabase:\n');
          console.log('   1. Go to https://app.supabase.com/project/[your-project]/sql');
          console.log('   2. Copy and paste the contents of database-schema.sql');
          console.log('   3. Click "Run"\n');
          process.exit(1);
        }

        successCount++;
        console.log(`✅ ${i + 1}/${statements.length}: ${preview}...`);
      } catch (err) {
        errorCount++;
        console.error(`❌ ${i + 1}/${statements.length}: ${preview}...`);
        console.error(`   Error: ${err.message}\n`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Database Setup Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (errorCount === 0) {
      console.log('✨ Database setup complete!\n');
      console.log('📋 Tables created:');
      console.log('   • market_gaps - Identified opportunities');
      console.log('   • outreach_campaigns - Email outreach (with approval gates)');
      console.log('   • solution_deliveries - Solution delivery (with approval gates)');
      console.log('   • system_settings - Auto-send controls\n');
      console.log('🔒 Safety Controls:');
      console.log('   • auto_outreach_enabled: FALSE (manual approval required)');
      console.log('   • auto_delivery_enabled: FALSE (manual approval required)\n');
      console.log('✋ Nothing will auto-send without your explicit approval!\n');
    } else {
      console.log('⚠️  Some errors occurred. Please review the output above.\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('\n💡 Manual Setup Instructions:');
    console.error('   1. Open Supabase SQL Editor: https://app.supabase.com/project/[your-project]/sql');
    console.error('   2. Copy the contents of database-schema.sql');
    console.error('   3. Paste into the SQL Editor');
    console.error('   4. Click "Run"\n');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
