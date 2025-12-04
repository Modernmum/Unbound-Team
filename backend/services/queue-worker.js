// Queue Worker - Processes jobs from Supabase queue
const queue = require('./supabase-queue');
const executiveLeadFinder = require('./executive-lead-finder');
const leadScraper = require('./lead-scraper');

class QueueWorker {
  constructor() {
    this.isRunning = false;
    this.processors = {};
    this.setupProcessors();
  }

  setupProcessors() {
    // Lead Generation Processor
    this.processors['lead-generation'] = async (jobData) => {
      console.log('📊 Processing lead generation job...');

      try {
        const { business, targetIndustry, criteria } = jobData;
        const count = criteria?.count || 20;

        let leads = [];
        let leadSource = 'Unknown';

        // Use different lead finder based on business
        if (business === 'maggie-forbes') {
          // PREMIUM EXECUTIVE LEAD FINDER for Maggie Forbes
          console.log('   🎯 Using Executive Lead Finder for high-end consulting clients...');

          const executives = await executiveLeadFinder.findExecutives({
            targetIndustries: ['technology', 'healthcare', 'finance', 'saas', 'manufacturing'],
            targetTitles: ['CEO', 'VP', 'Chief', 'Director', 'President', 'Founder'],
            companySizeMin: 50,
            companySizeMax: 500,
            count: count
          });

          leads = executives;
          leadSource = 'Executive Lead Finder (Funding News, Hiring Data, Expansion Announcements)';

        } else {
          // STANDARD LEAD SCRAPER for other businesses (GMP, etc)
          console.log('   🔍 Using standard lead scraper...');

          const scrapedLeads = await leadScraper.findLeads({
            targetIndustry: targetIndustry || 'technology',
            location: criteria?.location,
            criteria: {
              ...criteria,
              count: count
            }
          });

          leads = scrapedLeads;
          leadSource = 'Lead Scraper (Reddit, Indie Forums, Directories)';
        }

        // Generate CSV export
        const csv = business === 'maggie-forbes'
          ? executiveLeadFinder.exportToCSV(leads)
          : leadScraper.exportToCSV(leads);

        // Generate detailed report
        const report = business === 'maggie-forbes'
          ? executiveLeadFinder.generateReport(leads)
          : null;

        return {
          success: true,
          leadsFound: leads.length,
          leads: leads,
          csv: csv,
          report: report,
          summary: {
            totalFound: leads.length,
            avgFitScore: leads.reduce((sum, l) => sum + (l.finalScore || l.fitScore || 0), 0) / leads.length,
            sources: [leadSource],
            business: business
          }
        };
      } catch (error) {
        console.error('Lead generation error:', error);
        throw error;
      }
    };

    // Add more processors as needed
    this.processors['content-creation'] = async (jobData) => {
      console.log('📝 Processing content creation job...');
      // Implement content creation
      return { success: true, message: 'Content created' };
    };
  }

  async processQueue(queueName) {
    if (!this.processors[queueName]) {
      console.log(`⚠️  No processor for queue: ${queueName}`);
      return;
    }

    try {
      const job = await queue.getNextJob(queueName);

      if (!job) {
        return; // No jobs to process
      }

      console.log(`🔄 Processing job ${job.id} from ${queueName}`);

      try {
        const result = await this.processors[queueName](job.job_data);
        await queue.completeJob(job.id, result);
        console.log(`✅ Job ${job.id} completed`);
      } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error.message);
        await queue.failJob(job.id, error.message);
      }
    } catch (error) {
      console.error(`Error processing ${queueName}:`, error.message);
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Worker already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Queue worker started');

    // Process queues every 5 seconds
    this.interval = setInterval(async () => {
      const queues = ['lead-generation', 'content-creation', 'market-research', 'landing-page', 'email-marketing'];

      for (const queueName of queues) {
        await this.processQueue(queueName);
      }
    }, 5000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.isRunning = false;
      console.log('⏹️  Queue worker stopped');
    }
  }
}

module.exports = new QueueWorker();
