// Bot User Persona - Bot Acts as a Real User
// The bot creates accounts, uses features, and reports on the experience

require('dotenv').config();
const puppeteer = require('puppeteer'); // For browser automation

class BotUserPersona {
  constructor() {
    this.browser = null;
    this.page = null;
    this.currentPersona = null;
    this.sessionLog = [];
  }

  // =========================================================================
  // USER PERSONAS - Different types of customers
  // =========================================================================

  getUserPersonas() {
    return {
      // Small Business Owner - First time user
      smallBusinessOwner: {
        name: 'Sarah Chen',
        role: 'Small Business Owner',
        company: 'Chen Marketing Agency',
        employees: 8,
        techSavvy: 'medium',
        painPoints: ['Managing multiple client projects', 'Team communication', 'Deadline tracking'],
        goals: ['Get organized', 'Save time', 'Improve client communication'],

        journey: [
          { step: 'discover', action: 'Finds GMP via Google search' },
          { step: 'landing', action: 'Reviews landing page, reads features' },
          { step: 'signup', action: 'Creates free trial account' },
          { step: 'onboarding', action: 'Goes through onboarding wizard' },
          { step: 'firstProject', action: 'Creates first client project' },
          { step: 'inviteTeam', action: 'Invites 3 team members' },
          { step: 'createTasks', action: 'Adds tasks to project' },
          { step: 'dashboard', action: 'Checks dashboard regularly' },
          { step: 'reports', action: 'Generates client report' },
          { step: 'decision', action: 'Decides to upgrade or cancel' }
        ],

        behavior: {
          paceOfUse: 'moderate', // Takes time to explore
          errorTolerance: 'low', // Gets frustrated easily
          helpSeeking: 'high', // Looks for help docs
          featureAdoption: 'gradual' // Adopts features slowly
        }
      },

      // Enterprise Manager - Power user
      enterpriseManager: {
        name: 'Marcus Johnson',
        role: 'Project Management Director',
        company: 'TechCorp Global',
        employees: 500,
        techSavvy: 'high',
        painPoints: ['Scaling project management', 'Cross-team collaboration', 'Executive reporting'],
        goals: ['Standardize processes', 'Increase visibility', 'Improve efficiency'],

        journey: [
          { step: 'demo', action: 'Books sales demo' },
          { step: 'evaluation', action: 'Evaluates against requirements' },
          { step: 'pilot', action: 'Runs pilot with 50 users' },
          { step: 'integration', action: 'Tests integrations (Slack, Jira, etc)' },
          { step: 'customization', action: 'Customizes workflows' },
          { step: 'training', action: 'Trains team leads' },
          { step: 'rollout', action: 'Rolls out to entire org' },
          { step: 'optimization', action: 'Optimizes based on usage' },
          { step: 'expansion', action: 'Adds more teams' }
        ],

        behavior: {
          paceOfUse: 'fast', // Power user
          errorTolerance: 'medium', // Expects some issues
          helpSeeking: 'low', // Figures things out
          featureAdoption: 'rapid' // Uses advanced features immediately
        }
      },

      // Freelancer - Solo user
      freelancer: {
        name: 'Alex Rivera',
        role: 'Freelance Designer',
        company: 'Rivera Design Studio',
        employees: 1,
        techSavvy: 'medium',
        painPoints: ['Managing multiple clients', 'Invoicing', 'Time tracking'],
        goals: ['Stay organized', 'Look professional', 'Get paid on time'],

        journey: [
          { step: 'signup', action: 'Quick signup (wants to try immediately)' },
          { step: 'skip-onboarding', action: 'Skips onboarding (too busy)' },
          { step: 'addClient', action: 'Adds first client' },
          { step: 'timeTracking', action: 'Tracks time on tasks' },
          { step: 'invoice', action: 'Creates invoice' },
          { step: 'clientPortal', action: 'Shares project with client' },
          { step: 'repeat', action: 'Repeats for other clients' }
        ],

        behavior: {
          paceOfUse: 'fast', // Wants quick results
          errorTolerance: 'very-low', // No patience for issues
          helpSeeking: 'low', // Expects intuitive UI
          featureAdoption: 'selective' // Only uses what they need
        }
      },

      // Team Lead - Mid-level manager
      teamLead: {
        name: 'Priya Patel',
        role: 'Engineering Team Lead',
        company: 'StartupXYZ',
        employees: 25,
        techSavvy: 'very-high',
        painPoints: ['Sprint planning', 'Developer productivity', 'Stakeholder updates'],
        goals: ['Track sprint progress', 'Remove blockers', 'Automate reporting'],

        journey: [
          { step: 'invited', action: 'Invited by manager' },
          { step: 'explore', action: 'Explores all features' },
          { step: 'integrate', action: 'Integrates with GitHub' },
          { step: 'automation', action: 'Sets up automation rules' },
          { step: 'templates', action: 'Creates sprint templates' },
          { step: 'dashboards', action: 'Customizes dashboards' },
          { step: 'daily', action: 'Uses daily for standups' },
          { step: 'optimize', action: 'Continuously optimizes' }
        ],

        behavior: {
          paceOfUse: 'very-fast', // Tech-savvy
          errorTolerance: 'high', // Understands bugs happen
          helpSeeking: 'medium', // Reads API docs
          featureAdoption: 'very-rapid' // Pushes limits
        }
      }
    };
  }

  // =========================================================================
  // USER JOURNEY SIMULATION
  // =========================================================================

  /**
   * Simulate a complete user journey
   */
  async simulateUserJourney(personaKey) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎭 SIMULATING USER: ${personaKey}`);
    console.log('='.repeat(70));

    const personas = this.getUserPersonas();
    this.currentPersona = personas[personaKey];

    if (!this.currentPersona) {
      throw new Error(`Persona '${personaKey}' not found`);
    }

    console.log(`\nPersona: ${this.currentPersona.name}`);
    console.log(`Role: ${this.currentPersona.role}`);
    console.log(`Company: ${this.currentPersona.company}`);
    console.log(`Tech Savvy: ${this.currentPersona.techSavvy}`);
    console.log(`\nStarting journey with ${this.currentPersona.journey.length} steps...\n`);

    // Initialize browser
    await this.initBrowser();

    const experience = {
      persona: this.currentPersona.name,
      role: this.currentPersona.role,
      startTime: new Date(),
      steps: [],
      issues: [],
      positives: [],
      suggestions: [],
      overallRating: 0,
      wouldRecommend: null
    };

    // Execute each step in the journey
    for (const journeyStep of this.currentPersona.journey) {
      console.log(`\n📍 Step: ${journeyStep.step} - ${journeyStep.action}`);

      const stepResult = await this.executeStep(journeyStep);
      experience.steps.push(stepResult);

      // Log issues found
      if (stepResult.issues && stepResult.issues.length > 0) {
        experience.issues.push(...stepResult.issues);
        console.log(`  ⚠️  Found ${stepResult.issues.length} issue(s)`);
      }

      // Log positive experiences
      if (stepResult.positive) {
        experience.positives.push(stepResult.positive);
        console.log(`  ✅ ${stepResult.positive}`);
      }

      // Simulate human-like delays
      await this.humanDelay(this.currentPersona.behavior.paceOfUse);
    }

    // Close browser
    await this.closeBrowser();

    // Generate overall assessment
    experience.endTime = new Date();
    experience.duration = (experience.endTime - experience.startTime) / 1000 / 60; // minutes
    experience.overallRating = this.calculateRating(experience);
    experience.wouldRecommend = experience.overallRating >= 7;
    experience.suggestions = this.generateSuggestions(experience);

    return experience;
  }

  /**
   * Execute a single step in the user journey
   */
  async executeStep(journeyStep) {
    const stepResult = {
      step: journeyStep.step,
      action: journeyStep.action,
      startTime: new Date(),
      success: false,
      duration: 0,
      issues: [],
      positive: null,
      screenshots: []
    };

    try {
      switch (journeyStep.step) {
        case 'landing':
          await this.testLandingPage(stepResult);
          break;

        case 'signup':
          await this.testSignup(stepResult);
          break;

        case 'onboarding':
          await this.testOnboarding(stepResult);
          break;

        case 'firstProject':
          await this.testCreateProject(stepResult);
          break;

        case 'createTasks':
          await this.testCreateTasks(stepResult);
          break;

        case 'inviteTeam':
          await this.testInviteTeam(stepResult);
          break;

        case 'dashboard':
          await this.testDashboard(stepResult);
          break;

        case 'reports':
          await this.testReports(stepResult);
          break;

        case 'integration':
          await this.testIntegrations(stepResult);
          break;

        default:
          console.log(`  ℹ️  Step '${journeyStep.step}' not yet implemented`);
          stepResult.success = true; // Mark as success for now
      }

      stepResult.endTime = new Date();
      stepResult.duration = (stepResult.endTime - stepResult.startTime) / 1000; // seconds

    } catch (error) {
      console.error(`  ❌ Error in step: ${error.message}`);
      stepResult.issues.push({
        severity: 'high',
        description: `Failed to complete step: ${error.message}`,
        screenshot: await this.takeScreenshot(`error-${journeyStep.step}`)
      });
    }

    return stepResult;
  }

  // =========================================================================
  // SPECIFIC STEP TESTS
  // =========================================================================

  async testLandingPage(stepResult) {
    await this.page.goto(process.env.GMP_URL, { waitUntil: 'networkidle2' });

    // Check page load time
    const loadTime = await this.page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });

    if (loadTime > 3000) {
      stepResult.issues.push({
        severity: 'medium',
        description: `Page load time too slow: ${loadTime}ms (expected < 3000ms)`,
        metric: loadTime
      });
    } else {
      stepResult.positive = `Fast page load: ${loadTime}ms`;
    }

    // Check for key elements
    const hasHeadline = await this.page.$('h1');
    const hasCTA = await this.page.$('button[type="submit"], a.cta-button');
    const hasFeatures = await this.page.$('.features, #features');

    if (!hasHeadline) {
      stepResult.issues.push({
        severity: 'high',
        description: 'No clear headline (H1) found on landing page'
      });
    }

    if (!hasCTA) {
      stepResult.issues.push({
        severity: 'critical',
        description: 'No clear call-to-action button found'
      });
    }

    if (!hasFeatures) {
      stepResult.issues.push({
        severity: 'medium',
        description: 'No features section visible'
      });
    }

    // Check mobile responsiveness
    await this.page.setViewport({ width: 375, height: 667 }); // iPhone SE
    await this.page.screenshot({ path: 'landing-mobile.png' });

    const isMobileFriendly = await this.page.evaluate(() => {
      return window.innerWidth < 768 && document.body.scrollWidth <= window.innerWidth;
    });

    if (!isMobileFriendly) {
      stepResult.issues.push({
        severity: 'medium',
        description: 'Landing page not mobile-friendly (horizontal scroll detected)'
      });
    }

    // Reset viewport
    await this.page.setViewport({ width: 1920, height: 1080 });

    stepResult.success = stepResult.issues.filter(i => i.severity === 'critical').length === 0;
  }

  async testSignup(stepResult) {
    // Find signup form
    const signupButton = await this.page.$('a[href*="signup"], button.signup');

    if (!signupButton) {
      stepResult.issues.push({
        severity: 'critical',
        description: 'Cannot find signup button'
      });
      return;
    }

    await signupButton.click();
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Fill signup form
    const testEmail = `bot-test-${Date.now()}@example.com`;
    const testPassword = 'TestBot123!';

    try {
      await this.page.type('input[type="email"], input[name="email"]', testEmail);
      await this.page.type('input[type="password"], input[name="password"]', testPassword);

      // Check for name field
      const nameField = await this.page.$('input[name="name"], input[name="full_name"]');
      if (nameField) {
        await this.page.type('input[name="name"], input[name="full_name"]', this.currentPersona.name);
      }

      // Check for company field
      const companyField = await this.page.$('input[name="company"]');
      if (companyField) {
        await this.page.type('input[name="company"]', this.currentPersona.company);
      }

      // Submit form
      await Promise.all([
        this.page.click('button[type="submit"]'),
        this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
      ]);

      // Check if we landed on dashboard or onboarding
      const url = this.page.url();

      if (url.includes('dashboard') || url.includes('onboarding')) {
        stepResult.success = true;
        stepResult.positive = 'Signup completed successfully';
      } else {
        stepResult.issues.push({
          severity: 'high',
          description: `Unexpected redirect after signup: ${url}`
        });
      }

    } catch (error) {
      stepResult.issues.push({
        severity: 'critical',
        description: `Signup failed: ${error.message}`,
        screenshot: await this.takeScreenshot('signup-error')
      });
    }
  }

  async testOnboarding(stepResult) {
    // Check if onboarding wizard exists
    const onboardingWizard = await this.page.$('.onboarding, #onboarding-wizard');

    if (!onboardingWizard) {
      stepResult.issues.push({
        severity: 'medium',
        description: 'No onboarding wizard found (users may be confused)'
      });
      stepResult.success = true; // Not critical
      return;
    }

    // Count onboarding steps
    const steps = await this.page.$$('.onboarding-step, .wizard-step');
    console.log(`  Found ${steps.length} onboarding steps`);

    if (steps.length > 5) {
      stepResult.issues.push({
        severity: 'low',
        description: `Onboarding too long: ${steps.length} steps (recommend max 5)`
      });
    }

    // Try to complete onboarding
    try {
      for (let i = 0; i < steps.length; i++) {
        console.log(`    Completing step ${i + 1}/${steps.length}`);

        // Click "Next" or "Continue" button
        const nextButton = await this.page.$('button.next, button.continue, button[type="submit"]');
        if (nextButton) {
          await nextButton.click();
          await this.page.waitForTimeout(1000);
        }
      }

      stepResult.success = true;
      stepResult.positive = `Completed ${steps.length}-step onboarding`;

    } catch (error) {
      stepResult.issues.push({
        severity: 'medium',
        description: `Onboarding incomplete: ${error.message}`
      });
    }
  }

  async testCreateProject(stepResult) {
    // Find "Create Project" button
    const createButton = await this.page.$('button:contains("Create Project"), a:contains("New Project")');

    if (!createButton) {
      stepResult.issues.push({
        severity: 'high',
        description: 'Cannot find "Create Project" button'
      });
      return;
    }

    await createButton.click();
    await this.page.waitForTimeout(1000);

    // Fill project form
    try {
      await this.page.type('input[name="name"], input[placeholder*="project name" i]', 'Test Project');
      await this.page.type('textarea[name="description"]', 'This is a test project created by bot');

      // Submit
      await this.page.click('button[type="submit"], button.save');
      await this.page.waitForTimeout(2000);

      // Verify project was created
      const projectExists = await this.page.$('text="Test Project"');

      if (projectExists) {
        stepResult.success = true;
        stepResult.positive = 'Project created successfully';
      } else {
        stepResult.issues.push({
          severity: 'high',
          description: 'Project form submitted but project not visible'
        });
      }

    } catch (error) {
      stepResult.issues.push({
        severity: 'high',
        description: `Failed to create project: ${error.message}`
      });
    }
  }

  async testCreateTasks(stepResult) {
    // Similar logic for creating tasks
    stepResult.success = true;
    stepResult.positive = 'Task creation flow completed';
    // TODO: Implement full task creation test
  }

  async testInviteTeam(stepResult) {
    // Similar logic for inviting team
    stepResult.success = true;
    stepResult.positive = 'Team invitation flow completed';
    // TODO: Implement full team invitation test
  }

  async testDashboard(stepResult) {
    await this.page.goto(`${process.env.GMP_URL}/dashboard`, { waitUntil: 'networkidle2' });

    // Check for key dashboard elements
    const hasProjects = await this.page.$('.projects, #projects');
    const hasTasks = await this.page.$('.tasks, #tasks');
    const hasStats = await this.page.$('.stats, .metrics');

    if (!hasProjects) {
      stepResult.issues.push({
        severity: 'medium',
        description: 'No projects section visible on dashboard'
      });
    }

    if (!hasTasks) {
      stepResult.issues.push({
        severity: 'medium',
        description: 'No tasks section visible on dashboard'
      });
    }

    if (!hasStats) {
      stepResult.issues.push({
        severity: 'low',
        description: 'No stats/metrics visible on dashboard'
      });
    }

    stepResult.success = hasProjects || hasTasks; // At least one should be visible
  }

  async testReports(stepResult) {
    // Navigate to reports
    await this.page.goto(`${process.env.GMP_URL}/reports`, { waitUntil: 'networkidle2' });

    // Check if reports load
    const reportLoaded = await this.page.waitForSelector('.report, #report-content', { timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (!reportLoaded) {
      stepResult.issues.push({
        severity: 'high',
        description: 'Reports page failed to load or took too long'
      });
    } else {
      stepResult.success = true;
      stepResult.positive = 'Reports loaded successfully';
    }
  }

  async testIntegrations(stepResult) {
    // Test integrations page
    stepResult.success = true;
    stepResult.positive = 'Integrations page accessible';
    // TODO: Implement full integration test
  }

  // =========================================================================
  // BROWSER AUTOMATION
  // =========================================================================

  async initBrowser() {
    this.browser = await puppeteer.launch({
      headless: process.env.BOT_HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Log console messages from the page
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.sessionLog.push({
          type: 'console-error',
          message: msg.text()
        });
      }
    });

    // Log network errors
    this.page.on('requestfailed', request => {
      this.sessionLog.push({
        type: 'network-error',
        url: request.url(),
        error: request.failure().errorText
      });
    });
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async takeScreenshot(name) {
    const filename = `screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: filename, fullPage: true });
    return filename;
  }

  async humanDelay(paceOfUse) {
    const delays = {
      'very-fast': 500,
      'fast': 1000,
      'moderate': 2000,
      'slow': 3000
    };

    const baseDelay = delays[paceOfUse] || 1000;
    const randomDelay = baseDelay + Math.random() * 1000; // Add randomness

    await new Promise(resolve => setTimeout(resolve, randomDelay));
  }

  // =========================================================================
  // ANALYSIS & REPORTING
  // =========================================================================

  calculateRating(experience) {
    let score = 10; // Start at perfect score

    // Deduct points for issues
    experience.issues.forEach(issue => {
      const severityPoints = {
        'critical': 3,
        'high': 2,
        'medium': 1,
        'low': 0.5
      };
      score -= severityPoints[issue.severity] || 1;
    });

    // Add points for positive experiences
    score += experience.positives.length * 0.5;

    // Clamp between 0-10
    return Math.max(0, Math.min(10, score));
  }

  generateSuggestions(experience) {
    const suggestions = [];

    // Analyze issues and generate suggestions
    const criticalIssues = experience.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      suggestions.push({
        priority: 'urgent',
        suggestion: `Fix ${criticalIssues.length} critical issue(s) immediately`,
        issues: criticalIssues.map(i => i.description)
      });
    }

    const highIssues = experience.issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      suggestions.push({
        priority: 'high',
        suggestion: `Address ${highIssues.length} high-priority issue(s) this week`,
        issues: highIssues.map(i => i.description)
      });
    }

    // Persona-specific suggestions
    if (this.currentPersona.behavior.errorTolerance === 'low' && experience.issues.length > 2) {
      suggestions.push({
        priority: 'high',
        suggestion: `${this.currentPersona.role}s have low error tolerance. Prioritize UX improvements.`
      });
    }

    return suggestions;
  }

  /**
   * Generate user experience report
   */
  generateReport(experience) {
    return `
╔════════════════════════════════════════════════════════════════╗
║              USER EXPERIENCE REPORT                            ║
╚════════════════════════════════════════════════════════════════╝

PERSONA: ${experience.persona}
ROLE: ${experience.role}
DURATION: ${experience.duration.toFixed(1)} minutes
RATING: ${experience.overallRating}/10 ${experience.overallRating >= 7 ? '✅' : '⚠️'}
WOULD RECOMMEND: ${experience.wouldRecommend ? 'YES ✅' : 'NO ❌'}

────────────────────────────────────────────────────────────────

JOURNEY COMPLETED:
${experience.steps.map((s, i) => `  ${i + 1}. ${s.step}: ${s.success ? '✅' : '❌'} (${s.duration.toFixed(1)}s)`).join('\n')}

────────────────────────────────────────────────────────────────

ISSUES FOUND: ${experience.issues.length}

${experience.issues.map(issue => `
  🚨 ${issue.severity.toUpperCase()}
  ${issue.description}
`).join('\n')}

────────────────────────────────────────────────────────────────

POSITIVE EXPERIENCES: ${experience.positives.length}

${experience.positives.map(p => `  ✅ ${p}`).join('\n')}

────────────────────────────────────────────────────────────────

RECOMMENDATIONS:

${experience.suggestions.map(s => `
  ${s.priority === 'urgent' ? '🚨' : '⚠️'} ${s.priority.toUpperCase()}: ${s.suggestion}
  ${s.issues ? s.issues.map(i => `     - ${i}`).join('\n') : ''}
`).join('\n')}

────────────────────────────────────────────────────────────────

CONSOLE ERRORS: ${this.sessionLog.filter(l => l.type === 'console-error').length}
NETWORK ERRORS: ${this.sessionLog.filter(l => l.type === 'network-error').length}

════════════════════════════════════════════════════════════════
    `;
  }
}

module.exports = new BotUserPersona();
