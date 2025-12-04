// Direct SQL insert test
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testDirectInsert() {
  console.log('\n🚀 Testing Direct SQL Insert for Lead Generation\n');

  try {
    // Step 1: Generate leads with Claude
    console.log('🤖 Asking Claude for leads...');

    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Generate 3 fictional but realistic B2B leads for a strategic consultant targeting $5M-50M revenue companies.

Return ONLY a JSON array with this exact structure:
[
  {
    "company": "Company Name",
    "industry": "Industry",
    "painPoint": "Main challenge",
    "fitScore": 8
  }
]`
      }]
    });

    const responseText = message.content[0].text;
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const leads = JSON.parse(jsonMatch[0]);

    console.log(`✅ Generated ${leads.length} leads\n`);

    // Step 2: Insert using raw SQL
    for (const lead of leads) {
      console.log(`📝 Inserting: ${lead.company}`);

      const { data, error } = await supabase.rpc('exec_sql', {
        query: `
          INSERT INTO discovered_opportunities (
            source,
            title,
            description,
            business_area,
            fit_score,
            status,
            metadata
          ) VALUES (
            'ai-generated',
            '${lead.company.replace(/'/g, "''")}',
            '${lead.painPoint.replace(/'/g, "''")}',
            '${lead.industry.replace(/'/g, "''")}',
            ${lead.fitScore},
            'new',
            '${JSON.stringify(lead).replace(/'/g, "''")}'::jsonb
          ) RETURNING id;
        `
      });

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);

        // Try alternative: direct REST API
        console.log('   🔄 Trying REST API...');

        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/discovered_opportunities`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            source: 'ai-generated',
            title: lead.company,
            description: lead.painPoint,
            business_area: lead.industry,
            fit_score: lead.fitScore,
            status: 'new',
            metadata: lead
          })
        });

        const result = await response.json();

        if (response.ok) {
          console.log(`   ✅ Saved via REST API`);
        } else {
          console.log(`   ❌ REST API failed:`, result);
        }
      } else {
        console.log(`   ✅ Saved via RPC`);
      }
    }

    console.log('\n✅ Test complete!');
    console.log('\n📊 View in Supabase:');
    console.log('https://supabase.com/dashboard/project/bixudsnkdeafczzqfvdq/editor/29605\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testDirectInsert();
