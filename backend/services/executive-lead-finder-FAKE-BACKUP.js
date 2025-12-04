// ============================================
// EXECUTIVE LEAD FINDER - Premium Leads for Maggie Forbes
// ============================================
// Finds C-suite executives, VPs, and high-level decision makers
// who need high-end business consulting ($10K+ engagements)

const axios = require('axios');
const cheerio = require('cheerio');
const orchestrator = require('./ai-orchestrator');

class ExecutiveLeadFinder {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (compatible; MaggieForbesBot/1.0)';
  }

  // ============================================================================
  // MAIN EXECUTIVE SEARCH
  // ============================================================================

  async findExecutives(params = {}) {
    const {
      targetIndustries = ['technology', 'healthcare', 'finance', 'saas'],
      targetTitles = ['CEO', 'VP', 'Chief', 'Director', 'President', 'Founder'],
      companySizeMin = 50,
      companySizeMax = 500,
      count = 20
    } = params;

    console.log('🎯 Finding premium executive leads for Maggie Forbes...');
    console.log(`   Industries: ${targetIndustries.join(', ')}`);
    console.log(`   Company size: ${companySizeMin}-${companySizeMax} employees`);

    const leads = [];

    // Step 1: Find companies in growth/change phases (most likely to need consulting)
    const growthCompanies = await this.findGrowthCompanies(targetIndustries);
    console.log(`   ✓ Found ${growthCompanies.length} high-growth companies`);

    // Step 2: Identify decision makers at those companies
    for (const company of growthCompanies.slice(0, count)) {
      const executives = await this.findCompanyExecutives(company);
      leads.push(...executives);
    }

    // Step 3: Enrich with AI - identify pain points and consulting needs
    const enrichedLeads = await this.enrichExecutives(leads);

    // Step 4: Score and prioritize
    const scoredLeads = await this.scoreExecutiveLeads(enrichedLeads);

    // Step 5: Generate personalized outreach strategies
    const finalLeads = await this.generateOutreachStrategies(scoredLeads);

    console.log(`✅ Found ${finalLeads.length} qualified executive leads`);

    return finalLeads.slice(0, count);
  }

  // ============================================================================
  // FIND HIGH-GROWTH COMPANIES (Signals they need consulting)
  // ============================================================================

  async findGrowthCompanies(industries) {
    console.log('🚀 Searching for high-growth companies...');

    const companies = [];

    // Signal 1: Recent funding announcements
    const fundedCompanies = await this.scrapeFundingNews(industries);
    companies.push(...fundedCompanies);

    // Signal 2: Hiring rapidly (growth pain points)
    const hiringCompanies = await this.scrapeJobPostings(industries);
    companies.push(...hiringCompanies);

    // Signal 3: Recent expansion announcements
    const expandingCompanies = await this.scrapeExpansionNews(industries);
    companies.push(...expandingCompanies);

    // Signal 4: Tech companies on Product Hunt/Hacker News
    const techCompanies = await this.scrapeTechLaunches(industries);
    companies.push(...techCompanies);

    // Deduplicate by company name
    const unique = Array.from(
      new Map(companies.map(c => [c.name.toLowerCase(), c])).values()
    );

    return unique;
  }

  // ============================================================================
  // SCRAPE FUNDING NEWS (Companies just raised money = need strategy help)
  // ============================================================================

  async scrapeFundingNews(industries) {
    console.log('   💰 Checking funding announcements...');

    try {
      // Use AI to search recent funding news
      const prompt = `Search for companies that recently raised funding in these industries: ${industries.join(', ')}.

Focus on Series A-C rounds ($5M-$50M) in the last 3 months.

For each company, provide:
1. Company name
2. Industry
3. Funding amount
4. What they do (1 sentence)
5. Why they might need business consulting (growth challenges, scaling, strategy)
6. Website URL

Format as JSON array: [{ name, industry, fundingAmount, description, consultingNeed, website }]

Return 10 companies.`;

      const result = await orchestrator.execute('research', prompt);

      try {
        const companies = JSON.parse(result.content);
        return companies.map(c => ({
          ...c,
          growthSignal: 'recent_funding',
          urgency: 'high',
          estimatedBudget: '$10K-50K'
        }));
      } catch (error) {
        console.log('   ⚠️  Could not parse funding data');
        return [];
      }

    } catch (error) {
      console.error('   Error fetching funding news:', error.message);
      return [];
    }
  }

  // ============================================================================
  // SCRAPE JOB POSTINGS (Rapid hiring = need ops/scaling help)
  // ============================================================================

  async scrapeJobPostings(industries) {
    console.log('   👔 Checking job postings...');

    try {
      // Use AI to identify companies hiring rapidly
      const prompt = `Find companies actively hiring in these industries: ${industries.join(', ')}.

Look for companies with 10+ open positions, especially in leadership/management roles.

For each company, provide:
1. Company name
2. Industry
3. Number of open positions
4. Key roles hiring for
5. What this suggests about their growth challenges
6. Website URL

Format as JSON array: [{ name, industry, openPositions, keyRoles, growthChallenge, website }]

Return 10 companies.`;

      const result = await orchestrator.execute('research', prompt);

      try {
        const companies = JSON.parse(result.content);
        return companies.map(c => ({
          name: c.name,
          industry: c.industry,
          description: `Rapidly hiring: ${c.openPositions} positions`,
          consultingNeed: `Scaling team and operations - ${c.growthChallenge}`,
          website: c.website,
          growthSignal: 'rapid_hiring',
          urgency: 'medium',
          estimatedBudget: '$15K-40K'
        }));
      } catch (error) {
        console.log('   ⚠️  Could not parse hiring data');
        return [];
      }

    } catch (error) {
      console.error('   Error fetching job postings:', error.message);
      return [];
    }
  }

  // ============================================================================
  // SCRAPE EXPANSION NEWS (New offices, markets = need strategic guidance)
  // ============================================================================

  async scrapeExpansionNews(industries) {
    console.log('   🌍 Checking expansion announcements...');

    try {
      const prompt = `Find companies recently announcing expansion in these industries: ${industries.join(', ')}.

Look for:
- Opening new offices/locations
- Entering new markets
- Launching new product lines
- International expansion

For each company, provide:
1. Company name
2. Industry
3. Type of expansion
4. Strategic challenges this creates
5. Website URL

Format as JSON array: [{ name, industry, expansionType, challenges, website }]

Return 8 companies.`;

      const result = await orchestrator.execute('research', prompt);

      try {
        const companies = JSON.parse(result.content);
        return companies.map(c => ({
          name: c.name,
          industry: c.industry,
          description: `Expanding: ${c.expansionType}`,
          consultingNeed: `Strategic planning and execution - ${c.challenges}`,
          website: c.website,
          growthSignal: 'expansion',
          urgency: 'high',
          estimatedBudget: '$20K-60K'
        }));
      } catch (error) {
        console.log('   ⚠️  Could not parse expansion data');
        return [];
      }

    } catch (error) {
      console.error('   Error fetching expansion news:', error.message);
      return [];
    }
  }

  // ============================================================================
  // SCRAPE TECH LAUNCHES (New products = need go-to-market strategy)
  // ============================================================================

  async scrapeTechLaunches(industries) {
    console.log('   🚀 Checking Product Hunt and tech launches...');

    const companies = [];

    try {
      // Scrape Product Hunt for recent launches
      const url = 'https://www.producthunt.com/';
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent }
      });

      const $ = cheerio.load(response.data);

      // Note: This is a simplified scraper - Product Hunt's actual structure may vary
      // In production, you'd want to use their API or more robust scraping

      // For now, use AI to research recent tech launches
      const prompt = `List 10 recently launched tech products/companies from Product Hunt or similar platforms.

Focus on B2B SaaS, enterprise software, and tech tools.

For each, provide:
1. Company name
2. What they do (1 sentence)
3. Stage (new launch, early traction, growing)
4. Why they need business consulting (GTM strategy, scaling, positioning)
5. Website URL

Format as JSON array: [{ name, description, stage, consultingNeed, website }]`;

      const result = await orchestrator.execute('research', prompt);

      try {
        const launches = JSON.parse(result.content);
        companies.push(...launches.map(c => ({
          name: c.name,
          industry: 'technology',
          description: c.description,
          consultingNeed: c.consultingNeed,
          website: c.website,
          growthSignal: 'new_launch',
          urgency: 'medium',
          estimatedBudget: '$8K-25K'
        })));
      } catch (error) {
        console.log('   ⚠️  Could not parse launch data');
      }

    } catch (error) {
      console.error('   Error fetching tech launches:', error.message);
    }

    return companies;
  }

  // ============================================================================
  // FIND EXECUTIVES AT COMPANY
  // ============================================================================

  async findCompanyExecutives(company) {
    console.log(`   👤 Finding executives at ${company.name}...`);

    try {
      const prompt = `Research the company: ${company.name}
Website: ${company.website}
Industry: ${company.industry}
Description: ${company.description}

Find the top 2-3 decision makers who would make consulting hiring decisions:
- CEO/Founder
- COO/VP Operations
- Chief Strategy Officer
- Head of Growth

For each executive, provide:
1. Name
2. Title
3. LinkedIn URL (if findable)
4. Email pattern guess (firstname@company.com, etc)
5. Their likely pain points based on company stage

Format as JSON array: [{ name, title, linkedIn, emailPattern, painPoints }]`;

      const result = await orchestrator.execute('research', prompt, { maxTokens: 500 });

      try {
        const executives = JSON.parse(result.content);

        return executives.map(exec => ({
          // Executive info
          executiveName: exec.name,
          title: exec.title,
          linkedIn: exec.linkedIn,
          emailPattern: exec.emailPattern,

          // Company info
          company: company.name,
          companyWebsite: company.website,
          industry: company.industry,

          // Consulting opportunity
          consultingNeed: company.consultingNeed,
          growthSignal: company.growthSignal,
          urgency: company.urgency,
          estimatedBudget: company.estimatedBudget,

          // Initial pain points
          painPoints: exec.painPoints,

          // Source tracking
          source: 'AI Executive Research',
          foundAt: new Date().toISOString()
        }));

      } catch (error) {
        console.log(`   ⚠️  Could not parse executives for ${company.name}`);
        return [];
      }

    } catch (error) {
      console.error(`   Error finding executives:`, error.message);
      return [];
    }
  }

  // ============================================================================
  // ENRICH EXECUTIVES WITH DEEP AI ANALYSIS
  // ============================================================================

  async enrichExecutives(leads) {
    console.log('🤖 Enriching executive leads with AI...');

    const enrichedLeads = [];

    for (const lead of leads) {
      try {
        const prompt = `Analyze this executive as a potential high-end consulting client:

Executive: ${lead.executiveName} - ${lead.title}
Company: ${lead.company} (${lead.industry})
Growth Signal: ${lead.growthSignal}
Initial Need: ${lead.consultingNeed}

Tasks:
1. Identify top 3 specific pain points they're likely facing
2. Estimate their budget authority ($10K, $25K, $50K+)
3. Rate urgency (low/medium/high/critical)
4. Suggest best approach angle (efficiency, growth, strategy, operations, leadership)
5. Draft a 1-sentence value proposition specific to their situation
6. Rate fit score for Maggie Forbes (1-10, considering high-end consulting focus)

Format as JSON: {
  painPoints: [string, string, string],
  budgetAuthority: string,
  urgency: string,
  approachAngle: string,
  valueProposition: string,
  fitScore: number
}`;

        const result = await orchestrator.execute('quick-task', prompt, { maxTokens: 400 });

        try {
          const enrichment = JSON.parse(result.content);

          enrichedLeads.push({
            ...lead,
            painPoints: enrichment.painPoints,
            budgetAuthority: enrichment.budgetAuthority,
            urgency: enrichment.urgency,
            approachAngle: enrichment.approachAngle,
            valueProposition: enrichment.valueProposition,
            fitScore: enrichment.fitScore
          });
        } catch (parseError) {
          // Keep original lead if AI enrichment fails
          enrichedLeads.push({ ...lead, fitScore: 5 });
        }

      } catch (error) {
        console.error('   Error enriching executive:', error.message);
        enrichedLeads.push({ ...lead, fitScore: 5 });
      }
    }

    return enrichedLeads;
  }

  // ============================================================================
  // SCORE EXECUTIVE LEADS
  // ============================================================================

  async scoreExecutiveLeads(leads) {
    console.log('📊 Scoring executive leads...');

    // Multi-factor scoring
    const scoredLeads = leads.map(lead => {
      let totalScore = lead.fitScore || 5;

      // Boost score based on growth signals
      const signalBoost = {
        'recent_funding': 2,
        'rapid_hiring': 1.5,
        'expansion': 2,
        'new_launch': 1
      };
      totalScore += signalBoost[lead.growthSignal] || 0;

      // Boost for urgency
      const urgencyBoost = {
        'critical': 2,
        'high': 1.5,
        'medium': 1,
        'low': 0
      };
      totalScore += urgencyBoost[lead.urgency] || 0;

      // Boost for budget authority
      if (lead.budgetAuthority?.includes('$50K+')) totalScore += 2;
      else if (lead.budgetAuthority?.includes('$25K')) totalScore += 1;

      // Cap at 10
      totalScore = Math.min(totalScore, 10);

      return {
        ...lead,
        finalScore: Number(totalScore.toFixed(1))
      };
    });

    // Sort by score descending
    return scoredLeads.sort((a, b) => b.finalScore - a.finalScore);
  }

  // ============================================================================
  // GENERATE PERSONALIZED OUTREACH STRATEGIES
  // ============================================================================

  async generateOutreachStrategies(leads) {
    console.log('✍️  Generating personalized outreach strategies...');

    const strategizedLeads = [];

    for (const lead of leads) {
      try {
        const prompt = `Create a personalized outreach strategy for this executive:

Executive: ${lead.executiveName} - ${lead.title} at ${lead.company}
Pain Points: ${lead.painPoints?.join(', ')}
Value Prop: ${lead.valueProposition}
Approach Angle: ${lead.approachAngle}

Generate:
1. Best initial contact method (LinkedIn, email, introduction)
2. Opening line that references their specific situation
3. Call-to-action (20-min strategy call, framework share, case study)
4. Follow-up timing (3 days, 1 week, etc.)
5. Objection handler (too busy, already have consultant, etc.)

Format as JSON: {
  contactMethod: string,
  openingLine: string,
  callToAction: string,
  followUpTiming: string,
  objectionHandler: string
}`;

        const result = await orchestrator.execute('quick-task', prompt, { maxTokens: 300 });

        try {
          const strategy = JSON.parse(result.content);

          strategizedLeads.push({
            ...lead,
            outreachStrategy: strategy
          });
        } catch (parseError) {
          // Keep lead without strategy if parsing fails
          strategizedLeads.push(lead);
        }

      } catch (error) {
        console.error('   Error generating strategy:', error.message);
        strategizedLeads.push(lead);
      }
    }

    return strategizedLeads;
  }

  // ============================================================================
  // EXPORT HELPERS
  // ============================================================================

  exportToCSV(leads) {
    const headers = [
      'Executive Name',
      'Title',
      'Company',
      'Industry',
      'Growth Signal',
      'Fit Score',
      'Urgency',
      'Budget Authority',
      'Pain Points',
      'Value Proposition',
      'Outreach Method',
      'Opening Line',
      'LinkedIn',
      'Email Pattern',
      'Website'
    ];

    const rows = leads.map(lead => [
      lead.executiveName,
      lead.title,
      lead.company,
      lead.industry,
      lead.growthSignal,
      lead.finalScore || lead.fitScore,
      lead.urgency,
      lead.budgetAuthority,
      Array.isArray(lead.painPoints) ? lead.painPoints.join('; ') : lead.painPoints,
      lead.valueProposition || '',
      lead.outreachStrategy?.contactMethod || '',
      lead.outreachStrategy?.openingLine || '',
      lead.linkedIn || '',
      lead.emailPattern || '',
      lead.companyWebsite || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csv;
  }

  exportToJSON(leads) {
    return JSON.stringify(leads, null, 2);
  }

  // Generate detailed lead report
  generateReport(leads) {
    const avgScore = leads.reduce((sum, l) => sum + (l.finalScore || l.fitScore || 0), 0) / leads.length;

    const byIndustry = leads.reduce((acc, l) => {
      acc[l.industry] = (acc[l.industry] || 0) + 1;
      return acc;
    }, {});

    const byUrgency = leads.reduce((acc, l) => {
      acc[l.urgency] = (acc[l.urgency] || 0) + 1;
      return acc;
    }, {});

    return {
      summary: {
        totalLeads: leads.length,
        averageScore: avgScore.toFixed(1),
        highPriority: leads.filter(l => (l.finalScore || l.fitScore) >= 8).length,
        mediumPriority: leads.filter(l => (l.finalScore || l.fitScore) >= 6 && (l.finalScore || l.fitScore) < 8).length
      },
      breakdown: {
        byIndustry,
        byUrgency,
        byGrowthSignal: leads.reduce((acc, l) => {
          acc[l.growthSignal] = (acc[l.growthSignal] || 0) + 1;
          return acc;
        }, {})
      },
      topLeads: leads.slice(0, 5).map(l => ({
        executive: `${l.executiveName} - ${l.title}`,
        company: l.company,
        score: l.finalScore || l.fitScore,
        reason: l.valueProposition
      }))
    };
  }
}

module.exports = new ExecutiveLeadFinder();
