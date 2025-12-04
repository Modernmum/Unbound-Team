// ============================================================================
// MATCHMAKING SERVICE - The $100K/Month Arbitrage Engine
// ============================================================================
// Discovers needs → Finds solutions → Makes intros → Tracks deals
// Business Model: $5-20K per successful match
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const orchestrator = require('./ai-orchestrator');
const emailService = require('./email-service');

class MatchmakingService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  // ============================================================================
  // STEP 1: Discover Needs (from RSS, forums, etc.)
  // ============================================================================

  async discoverNeed(params) {
    const {
      source,          // 'RSS', 'Reddit', 'Indie Hackers', 'Manual'
      sourceUrl,
      rawContent,      // Original text/post
      personName,
      personEmail,
      companyName
    } = params;

    console.log(`🔍 Discovering need from ${source}...`);

    // Use AI to analyze the need
    const analysis = await this.analyzeNeedWithAI(rawContent);

    // Store in database
    const { data, error } = await this.supabase
      .from('discovered_needs')
      .insert({
        source,
        source_url: sourceUrl,
        problem_description: analysis.problemDescription,
        business_area: analysis.businessArea,
        urgency: analysis.urgency,
        person_name: personName,
        person_email: personEmail,
        company_name: companyName,
        company_size: analysis.companySize,
        industry: analysis.industry,
        ai_summary: analysis.summary,
        tags: analysis.tags,
        status: 'discovered'
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing need:', error);
      throw error;
    }

    console.log(`✅ Need discovered: ${data.id}`);

    // Automatically try to find matches
    await this.findMatchesForNeed(data.id);

    return data;
  }

  // ============================================================================
  // AI: Analyze need/problem
  // ============================================================================

  async analyzeNeedWithAI(rawContent) {
    const prompt = `Analyze this business need/problem and extract key information:

Content:
"${rawContent}"

Extract:
1. Problem description (1-2 sentences, clear and actionable)
2. Business area (marketing, sales, product, operations, fundraising, hiring, etc.)
3. Urgency level (urgent, high, medium, low)
4. Company size if mentioned (solo, 2-10, 10-50, 50-500, 500+)
5. Industry if mentioned
6. Summary (2-3 sentences)
7. Tags (3-5 keywords)

Respond with JSON:
{
  "problemDescription": "...",
  "businessArea": "...",
  "urgency": "...",
  "companySize": "...",
  "industry": "...",
  "summary": "...",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const result = await orchestrator.execute('quick-task', prompt, { maxTokens: 500 });

    try {
      return JSON.parse(result.content);
    } catch (e) {
      // Fallback if AI doesn't return valid JSON
      return {
        problemDescription: rawContent.substring(0, 200),
        businessArea: 'general',
        urgency: 'medium',
        companySize: 'unknown',
        industry: 'unknown',
        summary: rawContent.substring(0, 300),
        tags: []
      };
    }
  }

  // ============================================================================
  // STEP 2: Add Solution Provider
  // ============================================================================

  async addProvider(params) {
    const {
      name,
      email,
      company,
      title,
      expertiseAreas,   // ['marketing', 'growth', 'b2b']
      industries,       // ['saas', 'fintech']
      availability = 'available',
      source,
      profileUrl
    } = params;

    console.log(`👤 Adding solution provider: ${name}...`);

    const { data, error } = await this.supabase
      .from('solution_providers')
      .insert({
        name,
        email,
        company,
        title,
        expertise_areas: expertiseAreas,
        industries: industries,
        availability,
        source,
        profile_url: profileUrl,
        successful_intros: 0,
        total_intros: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding provider:', error);
      throw error;
    }

    console.log(`✅ Provider added: ${data.id}`);
    return data;
  }

  // ============================================================================
  // STEP 3: Find Matches (AI-powered matching)
  // ============================================================================

  async findMatchesForNeed(needId) {
    console.log(`🎯 Finding matches for need: ${needId}...`);

    // Get the need
    const { data: need, error: needError } = await this.supabase
      .from('discovered_needs')
      .select('*')
      .eq('id', needId)
      .single();

    if (needError || !need) {
      console.error('Need not found:', needError);
      return [];
    }

    // Get available providers in related areas
    const { data: providers, error: providersError } = await this.supabase
      .from('solution_providers')
      .select('*')
      .eq('availability', 'available');

    if (providersError || !providers || providers.length === 0) {
      console.log('⚠️  No available providers found');
      return [];
    }

    console.log(`   Found ${providers.length} available providers`);

    // Use AI to score each provider
    const matches = [];

    for (const provider of providers) {
      const score = await this.scoreMatch(need, provider);

      if (score.fitScore >= 6) { // Only good matches
        // Store match in database
        const { data: match } = await this.supabase
          .from('matches')
          .insert({
            need_id: needId,
            provider_id: provider.id,
            fit_score: score.fitScore,
            ai_reasoning: score.reasoning,
            status: 'potential'
          })
          .select()
          .single();

        matches.push(match);
      }
    }

    console.log(`✅ Found ${matches.length} potential matches (fit score >= 6)`);

    // Auto-approve best match if score is 9+
    const bestMatch = matches.sort((a, b) => b.fit_score - a.fit_score)[0];
    if (bestMatch && bestMatch.fit_score >= 9) {
      console.log(`🌟 Auto-approving best match (${bestMatch.fit_score}/10)`);
      await this.approveMatch(bestMatch.id);
    }

    return matches;
  }

  // ============================================================================
  // AI: Score match between need and provider
  // ============================================================================

  async scoreMatch(need, provider) {
    const prompt = `Score how well this solution provider matches this business need:

NEED:
- Problem: ${need.problem_description}
- Business Area: ${need.business_area}
- Industry: ${need.industry}
- Company Size: ${need.company_size}
- Urgency: ${need.urgency}

PROVIDER:
- Name: ${provider.name}
- Title: ${provider.title}
- Expertise: ${provider.expertise_areas?.join(', ') || 'N/A'}
- Industries: ${provider.industries?.join(', ') || 'N/A'}

Score this match from 1-10 (where 10 is perfect fit).
Explain why this is or isn't a good match.

Respond with JSON:
{
  "fitScore": 8.5,
  "reasoning": "Detailed explanation of why this is a good/bad match..."
}`;

    const result = await orchestrator.execute('quick-task', prompt, { maxTokens: 300 });

    try {
      const parsed = JSON.parse(result.content);
      return {
        fitScore: parsed.fitScore || 5,
        reasoning: parsed.reasoning || 'AI analysis unavailable'
      };
    } catch (e) {
      return {
        fitScore: 5,
        reasoning: 'Unable to score match'
      };
    }
  }

  // ============================================================================
  // STEP 4: Approve Match (manually or auto)
  // ============================================================================

  async approveMatch(matchId) {
    console.log(`✅ Approving match: ${matchId}...`);

    const { data, error } = await this.supabase
      .from('matches')
      .update({ status: 'approved' })
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      console.error('Error approving match:', error);
      throw error;
    }

    return data;
  }

  // ============================================================================
  // STEP 5: Send Introduction
  // ============================================================================

  async sendIntroduction(matchId) {
    console.log(`📧 Sending introduction for match: ${matchId}...`);

    // Get match details with full need and provider info
    const { data: match, error: matchError } = await this.supabase
      .from('matches')
      .select(`
        *,
        need:discovered_needs(*),
        provider:solution_providers(*)
      `)
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('Match not found:', matchError);
      throw new Error('Match not found');
    }

    if (match.status !== 'approved') {
      throw new Error('Match must be approved before sending introduction');
    }

    // Send intro email
    const emailResult = await emailService.sendIntroduction({
      needPerson: {
        name: match.need.person_name,
        email: match.need.person_email,
        company: match.need.company_name,
        problem: match.need.problem_description
      },
      providerPerson: {
        name: match.provider.name,
        email: match.provider.email,
        company: match.provider.company,
        expertise: match.provider.title
      },
      matchReasoning: match.ai_reasoning,
      matchId: matchId
    });

    if (!emailResult.success) {
      throw new Error(`Failed to send email: ${emailResult.error}`);
    }

    // Store introduction in database
    const { data: intro } = await this.supabase
      .from('introductions')
      .insert({
        match_id: matchId,
        to_addresses: [match.need.person_email, match.provider.email],
        from_address: process.env.RESEND_FROM_EMAIL,
        subject: emailResult.subject,
        body_html: '', // Would store full HTML
        resend_id: emailResult.resendId,
        sent_at: emailResult.sentAt,
        status: 'sent'
      })
      .select()
      .single();

    // Update match status
    await this.supabase
      .from('matches')
      .update({
        status: 'introduced',
        intro_sent_at: new Date()
      })
      .eq('id', matchId);

    // Update provider stats
    await this.supabase
      .from('solution_providers')
      .update({ total_intros: match.provider.total_intros + 1 })
      .eq('id', match.provider.id);

    console.log(`✅ Introduction sent! Resend ID: ${emailResult.resendId}`);

    return intro;
  }

  // ============================================================================
  // STEP 6: Track Deal Closed
  // ============================================================================

  async markDealClosed(matchId, dealValue, finderFee) {
    console.log(`💰 Marking deal closed: ${matchId} - $${dealValue}...`);

    // Update match
    await this.supabase
      .from('matches')
      .update({
        status: 'deal_closed',
        deal_closed_at: new Date(),
        deal_value: dealValue,
        finder_fee: finderFee
      })
      .eq('id', matchId);

    // Create payment record
    const { data: payment } = await this.supabase
      .from('payments')
      .insert({
        match_id: matchId,
        amount: finderFee,
        payment_type: 'finder_fee',
        status: 'expected',
        expected_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      })
      .select()
      .single();

    // Update provider success stats
    const { data: match } = await this.supabase
      .from('matches')
      .select('provider_id, provider:solution_providers(successful_intros)')
      .eq('id', matchId)
      .single();

    if (match) {
      await this.supabase
        .from('solution_providers')
        .update({
          successful_intros: (match.provider.successful_intros || 0) + 1
        })
        .eq('id', match.provider_id);
    }

    console.log(`✅ Deal closed! Expected payment: $${finderFee}`);

    return payment;
  }

  // ============================================================================
  // STATS: Get matchmaking statistics
  // ============================================================================

  async getStats() {
    const { data, error } = await this.supabase.rpc('get_matchmaking_stats');

    if (error) {
      console.error('Error getting stats:', error);
      return null;
    }

    return data;
  }

  // ============================================================================
  // QUERY: Get all potential matches (for review)
  // ============================================================================

  async getPotentialMatches(minFitScore = 7) {
    const { data, error } = await this.supabase
      .from('matches')
      .select(`
        *,
        need:discovered_needs(*),
        provider:solution_providers(*)
      `)
      .eq('status', 'potential')
      .gte('fit_score', minFitScore)
      .order('fit_score', { ascending: false });

    if (error) {
      console.error('Error getting matches:', error);
      return [];
    }

    return data;
  }

  // ============================================================================
  // QUERY: Get recent introductions
  // ============================================================================

  async getRecentIntroductions(limit = 20) {
    const { data, error } = await this.supabase
      .from('introductions')
      .select(`
        *,
        match:matches(
          *,
          need:discovered_needs(*),
          provider:solution_providers(*)
        )
      `)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting introductions:', error);
      return [];
    }

    return data;
  }

  // ============================================================================
  // QUERY: Get revenue tracking
  // ============================================================================

  async getRevenueTracking() {
    const { data, error } = await this.supabase.rpc('calculate_total_revenue');

    if (error) {
      console.error('Error calculating revenue:', error);
      return null;
    }

    return data[0];
  }
}

module.exports = new MatchmakingService();
