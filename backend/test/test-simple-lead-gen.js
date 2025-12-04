// Simple lead generation test for Maggie Forbes
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

async function generateLeads() {
  console.log('\n🚀 Maggie Forbes Lead Generation Test\n');

  try {
    // Step 1: Use Claude to find leads
    console.log('🤖 Asking Claude to find leads...');

    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a lead generation expert for Maggie Forbes, a strategic consultant for $5M-50M businesses.

Find 5 potential leads (fictional but realistic examples) that match this profile:
- Business revenue: $5M-50M
- Pain points: Scaling operations, strategic planning, market expansion
- Industries: SaaS, E-commerce, Professional Services

For each lead, provide:
1. Company name
2. Industry
3. Pain point
4. Fit score (1-10)
5. Why they're a good fit

Format as JSON array.`
      }]
    });

    const responseText = message.content[0].text;
    console.log('✅ Claude responded\n');

    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('Response:', responseText);
      throw new Error('No JSON found in response');
    }

    const leads = JSON.parse(jsonMatch[0]);
    console.log(`📊 Found ${leads.length} leads:\n`);

    // Step 2: Save to Supabase
    for (const lead of leads) {
      console.log(`  • ${lead.company || lead.Company || lead.name || 'Unknown'}`);

      const { data, error } = await supabase
        .from('discovered_opportunities')
        .insert({
          source: 'ai-generated-test',
          title: lead.company || lead.Company || lead.name,
          description: lead.pain_point || lead.painPoint || lead.description,
          business_area: lead.industry || lead.Industry,
          fit_score: lead.fit_score || lead.fitScore || 8,
          metadata: lead,
          status: 'new'
        });

      if (error) {
        console.error(`    ❌ Error saving: ${error.message}`);
      } else {
        console.log(`    ✅ Saved to database`);
      }
    }

    console.log('\n✅ Lead generation test complete!');
    console.log('\n📊 Check Supabase dashboard:');
    console.log('https://supabase.com/dashboard/project/bixudsnkdeafczzqfvdq/editor');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
  }
}

generateLeads();
