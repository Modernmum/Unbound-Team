/**
 * Outreach Brain - Logical Thinking & Memory Layer
 *
 * This service provides intelligent decision-making for outreach:
 * 1. Analyzes lead context to determine the right messaging angle
 * 2. Validates personalization hooks before using them
 * 3. Stores and retrieves patterns that work
 * 4. Learns from feedback (opens, replies, meetings)
 */

const { createClient } = require('@supabase/supabase-js');

class OutreachBrain {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // In-memory pattern cache (loaded from DB on init)
    this.patterns = {
      successfulHooks: [],
      failedApproaches: [],
      industryAngles: {},
      tenureAngles: {}
    };

    // Tenure thresholds for messaging angles
    this.TENURE_THRESHOLDS = {
      EARLY_GROWTH: 5,      // < 5 years: scaling, systems building
      MID_GROWTH: 10,       // 5-10 years: leadership layer, reducing dependency
      MATURE: 15,           // 10-15 years: preparing for transition
      SUCCESSION: 20,       // 15-20 years: active succession planning
      EXIT_READY: 25        // 20+ years: exit optimization, legacy
    };
  }

  /**
   * Analyze a lead and determine the best messaging strategy
   */
  analyzeLeadContext(lead) {
    const analysis = {
      tenure: this.analyzeTenure(lead),
      industry: this.analyzeIndustry(lead),
      companyType: this.analyzeCompanyType(lead),
      founderStage: null,
      recommendedAngle: null,
      painPoints: [],
      warnings: []
    };

    // Determine founder stage based on tenure
    analysis.founderStage = this.determineFounderStage(analysis.tenure.years);

    // Recommend messaging angle
    analysis.recommendedAngle = this.recommendAngle(analysis);

    // Identify likely pain points
    analysis.painPoints = this.identifyPainPoints(analysis);

    return analysis;
  }

  /**
   * Analyze tenure from research data
   */
  analyzeTenure(lead) {
    const research = lead.lead_research || {};
    const background = research.company_background || '';

    // Try to extract years in business
    let years = null;
    let confidence = 'low';

    // Pattern: "X years" or "X+ years"
    const yearsMatch = background.match(/(\d+)\+?\s*years?/i);
    if (yearsMatch) {
      years = parseInt(yearsMatch[1]);
      confidence = 'medium';
    }

    // Pattern: "founded in YYYY" or "established in YYYY"
    const foundedMatch = background.match(/(?:founded|established|since)\s*(?:in\s*)?(\d{4})/i);
    if (foundedMatch) {
      years = 2025 - parseInt(foundedMatch[1]);
      confidence = 'high';
    }

    // Sanity check - flag suspicious values
    const warnings = [];
    if (years && years > 50) {
      warnings.push(`Suspicious tenure: ${years} years seems too long for founder-led`);
    }
    if (years && years < 2) {
      warnings.push(`Very new business: ${years} years - may not be ready for MFS services`);
    }

    return { years, confidence, warnings };
  }

  /**
   * Analyze industry from research and lead data
   */
  analyzeIndustry(lead) {
    const research = lead.lead_research || {};
    const background = (research.company_background || '').toLowerCase();
    const companyName = (lead.company_name || '').toLowerCase();

    // Industry detection patterns
    const industries = {
      'consulting': ['consulting', 'advisory', 'consultant', 'advisors'],
      'financial_services': ['investment', 'capital', 'wealth', 'financial', 'insurance', 'pe ', 'private equity'],
      'technology': ['software', 'tech', 'it services', 'saas', 'technology', 'digital'],
      'staffing': ['staffing', 'recruiting', 'recruitment', 'headhunt', 'talent'],
      'marketing': ['marketing', 'advertising', 'pr ', 'public relations', 'media', 'creative'],
      'professional_services': ['law', 'legal', 'accounting', 'cpa', 'architecture'],
      'healthcare': ['health', 'medical', 'pharma', 'biotech', 'clinical']
    };

    let detected = 'unknown';
    let confidence = 'low';

    for (const [industry, keywords] of Object.entries(industries)) {
      for (const keyword of keywords) {
        if (background.includes(keyword) || companyName.includes(keyword)) {
          detected = industry;
          confidence = 'medium';
          break;
        }
      }
      if (detected !== 'unknown') break;
    }

    return { detected, confidence };
  }

  /**
   * Analyze company type (solo, small team, established firm)
   */
  analyzeCompanyType(lead) {
    const research = lead.lead_research || {};
    const background = (research.company_background || '').toLowerCase();

    // Look for size indicators
    let type = 'unknown';
    let employees = null;

    const employeeMatch = background.match(/(\d+)\s*employees?/i);
    if (employeeMatch) {
      employees = parseInt(employeeMatch[1]);
      if (employees < 5) type = 'solo_practitioner';
      else if (employees < 20) type = 'small_firm';
      else if (employees < 100) type = 'mid_size';
      else type = 'established';
    }

    // Revenue indicators
    let revenue = null;
    const revenuePatterns = [
      { pattern: /\$(\d+)\s*million/i, multiplier: 1000000 },
      { pattern: /\$(\d+)M/i, multiplier: 1000000 },
      { pattern: /\$(\d+)\s*-\s*\$?(\d+)\s*million/i, multiplier: 1000000, range: true }
    ];

    for (const { pattern, multiplier, range } of revenuePatterns) {
      const match = background.match(pattern);
      if (match) {
        revenue = range
          ? (parseInt(match[1]) + parseInt(match[2])) / 2 * multiplier
          : parseInt(match[1]) * multiplier;
        break;
      }
    }

    return { type, employees, revenue };
  }

  /**
   * Determine founder stage based on tenure
   */
  determineFounderStage(years) {
    if (!years) return 'unknown';

    if (years < this.TENURE_THRESHOLDS.EARLY_GROWTH) {
      return 'early_growth';
    } else if (years < this.TENURE_THRESHOLDS.MID_GROWTH) {
      return 'mid_growth';
    } else if (years < this.TENURE_THRESHOLDS.MATURE) {
      return 'mature';
    } else if (years < this.TENURE_THRESHOLDS.SUCCESSION) {
      return 'succession';
    } else {
      return 'exit_ready';
    }
  }

  /**
   * Recommend the best messaging angle based on analysis
   */
  recommendAngle(analysis) {
    const { founderStage, industry, companyType } = analysis;

    // Stage-based primary angles
    const stageAngles = {
      'early_growth': {
        primary: 'scaling_systems',
        message: 'building infrastructure that scales',
        painPoint: 'doing everything yourself'
      },
      'mid_growth': {
        primary: 'leadership_layer',
        message: 'building a leadership team that can carry the weight',
        painPoint: 'being the bottleneck for every decision'
      },
      'mature': {
        primary: 'transition_prep',
        message: 'preparing the business to thrive without daily involvement',
        painPoint: 'the business still runs through you'
      },
      'succession': {
        primary: 'succession_planning',
        message: 'building a business that\'s ready for the next chapter',
        painPoint: 'no clear path to step back'
      },
      'exit_ready': {
        primary: 'exit_optimization',
        message: 'maximizing enterprise value for transition',
        painPoint: 'the business is valuable but not transferable'
      }
    };

    let angle = stageAngles[founderStage] || stageAngles['mid_growth'];

    // Industry-specific adjustments
    if (industry.detected === 'financial_services') {
      // PE/investment folks think in terms of enterprise value
      angle.businessContext = 'enterprise value and transferability';
    } else if (industry.detected === 'consulting') {
      // Consultants understand the relationship dependency problem
      angle.businessContext = 'systematizing client relationships';
    } else if (industry.detected === 'staffing') {
      // Staffing is all about pipeline
      angle.businessContext = 'building predictable pipeline';
    }

    return angle;
  }

  /**
   * Identify likely pain points based on analysis
   */
  identifyPainPoints(analysis) {
    const painPoints = [];
    const { founderStage, industry, companyType } = analysis;

    // Universal founder pain points
    if (founderStage === 'early_growth' || founderStage === 'mid_growth') {
      painPoints.push('founder still involved in daily operations');
      painPoints.push('team needs founder in the room to deliver');
    }

    if (founderStage === 'mature' || founderStage === 'succession') {
      painPoints.push('no clear succession plan');
      painPoints.push('business value tied to founder relationships');
    }

    if (founderStage === 'exit_ready') {
      painPoints.push('business not attractive to buyers without founder');
      painPoints.push('legacy and transition concerns');
    }

    // Industry-specific pain points
    if (industry.detected === 'consulting' || industry.detected === 'professional_services') {
      painPoints.push('revenue depends on personal relationships');
      painPoints.push('no systematic business development');
    }

    if (industry.detected === 'staffing') {
      painPoints.push('feast or famine pipeline');
      painPoints.push('key placements depend on founder network');
    }

    return painPoints;
  }

  /**
   * Validate a personalization hook - is it usable?
   */
  validateHook(hook) {
    if (!hook || hook.length < 20) {
      return { valid: false, reason: 'Hook too short' };
    }

    // Check for broken/incomplete hooks
    const brokenPatterns = [
      /^that\s+recognized/i,           // "that recognized competitors..."
      /^that\s+founded/i,              // "that founded recently..."
      /^that\s+award/i,                // "that award by..."
      /^that\s+\d+\s*years/i,          // "that 30 years of..."
      /^\d+\s*years\s+of/i,            // "30 years of industry..."
      /^recognized\s+competitors/i,
      /^\[?\d+\]?\s*$/,                // Just citation numbers
      /^[^a-zA-Z]*$/                   // No actual letters
    ];

    for (const pattern of brokenPatterns) {
      if (pattern.test(hook.trim())) {
        return { valid: false, reason: 'Hook appears malformed or incomplete' };
      }
    }

    // Check for citation artifacts
    if (/\[\d+\]/.test(hook)) {
      return { valid: false, reason: 'Hook contains citation artifacts' };
    }

    // Check if it starts with a proper subject
    const goodStarts = [
      /^you've/i,
      /^your\s+/i,
      /^the\s+company/i,
      /^they've/i,
      /^recognized\s+for/i,
      /^awarded/i,
      /^featured/i,
      /^named/i,
      /^grew/i,
      /^built/i,
      /^founded/i,
      /^established/i
    ];

    const hasGoodStart = goodStarts.some(pattern => pattern.test(hook.trim()));

    if (!hasGoodStart && !hook.trim().match(/^[A-Z]/)) {
      return { valid: false, reason: 'Hook doesn\'t start properly' };
    }

    return { valid: true };
  }

  /**
   * Generate email content based on analysis
   */
  generateEmail(lead, analysis) {
    const firstName = lead.contact_name ? lead.contact_name.split(' ')[0] : '';
    const company = lead.company_name;
    const angle = analysis.recommendedAngle;
    const tenure = analysis.tenure;

    // Subject line
    let subject;
    if (tenure.years && tenure.years >= 15) {
      subject = firstName
        ? `${firstName} - thinking about what's next?`
        : `${company} - the next chapter`;
    } else {
      subject = firstName
        ? `${firstName} - a question about ${company}`
        : `${company} - growth without the chaos`;
    }

    // Build body
    let body = firstName ? `Hi ${firstName},\n\n` : `Hi,\n\n`;

    // Opening - tenure-aware
    if (tenure.years && tenure.confidence !== 'low') {
      if (tenure.years >= 20) {
        body += `${tenure.years} years building ${company}. That's a legacy worth protecting.\n\n`;
        body += `At this stage, the question often shifts from "how do I grow?" to "how do I transition without losing what I've built?"\n\n`;
      } else if (tenure.years >= 15) {
        body += `${tenure.years} years building ${company} - that's not luck, that's proof you've created something real.\n\n`;
        body += `Leaders at this stage often start thinking about the next chapter - whether that's stepping back, bringing in leadership, or preparing for an eventual transition.\n\n`;
      } else if (tenure.years >= 10) {
        body += `A decade building ${company} means you've figured out how to create value. The question now is whether the business can create that value without you in every room.\n\n`;
      } else {
        body += `Building ${company} takes real expertise and relentless execution.\n\n`;
        body += `My guess is you're at the point where ${angle.painPoint}.\n\n`;
      }
    } else {
      // No tenure data - use generic opener
      body += `I've been looking at what you're building at ${company}.\n\n`;
      body += `Leaders like you often hit a point where ${angle.painPoint}.\n\n`;
    }

    // Value proposition - stage appropriate
    body += `That's the gap I help established leaders close - ${angle.message}.\n\n`;

    // CTA
    if (tenure.years && tenure.years >= 20) {
      body += `If you're starting to think about what the next chapter looks like, I'd enjoy a conversation.\n\n`;
    } else if (tenure.years && tenure.years >= 15) {
      body += `If that resonates, I'd welcome a conversation about what options might look like for ${company}.\n\n`;
    } else {
      body += `If that resonates, I'd enjoy a conversation about what the next level could look like for ${company}.\n\n`;
    }

    body += `Best,\nMaggie Forbes\nMaggie Forbes Strategies`;

    return { subject, body, analysis };
  }

  /**
   * Record feedback for learning
   */
  async recordFeedback(leadId, emailId, feedbackType, details = {}) {
    const feedbackData = {
      lead_id: leadId,
      email_id: emailId,
      feedback_type: feedbackType, // 'sent', 'opened', 'clicked', 'replied', 'meeting_booked', 'unsubscribed'
      details: details,
      created_at: new Date().toISOString()
    };

    try {
      await this.supabase
        .from('outreach_feedback')
        .insert(feedbackData);

      // Update pattern memory based on feedback
      if (feedbackType === 'replied' || feedbackType === 'meeting_booked') {
        await this.reinforcePattern(leadId, emailId);
      }
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  }

  /**
   * Reinforce successful patterns
   */
  async reinforcePattern(leadId, emailId) {
    // TODO: Extract patterns from successful emails and store them
    // This would analyze what made the email work:
    // - Industry match
    // - Tenure-based angle
    // - Specific hook used
    // - Subject line style
    console.log(`Reinforcing patterns from successful email ${emailId} for lead ${leadId}`);
  }

  /**
   * Get recommended approach based on learned patterns
   */
  async getLearnedPatterns(industry, tenureRange) {
    // TODO: Query pattern memory for what's worked
    // Returns recommendations based on historical success
    return {
      recommendedAngles: [],
      avoidAngles: [],
      bestSubjectStyles: [],
      successRate: null
    };
  }
}

module.exports = OutreachBrain;
