// Vercel Serverless Function - Job Processor
// Processes pending jobs from the queue
// Can be triggered via cron or manually

const supabaseQueue = require('../backend/services/supabase-queue');
const leadScraper = require('../backend/services/lead-scraper');
const orchestrator = require('../backend/services/ai-orchestrator');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { queueName, limit = 1 } = req.body;

    if (!queueName) {
      return res.status(400).json({ error: 'queueName required' });
    }

    const processedJobs = [];

    // Process up to 'limit' jobs
    for (let i = 0; i < limit; i++) {
      const job = await supabaseQueue.getNextJob(queueName);

      if (!job) {
        break; // No more pending jobs
      }

      try {
        let result;

        // Route to appropriate processor
        switch (queueName) {
          case 'leadGeneration':
            result = await processLeadGeneration(job.job_data);
            break;

          case 'contentCreation':
            result = await processContentCreation(job.job_data);
            break;

          case 'marketResearch':
            result = await processMarketResearch(job.job_data);
            break;

          default:
            throw new Error(`Unknown queue: ${queueName}`);
        }

        await supabaseQueue.completeJob(job.id, result);
        processedJobs.push({ jobId: job.id, status: 'completed' });

      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        await supabaseQueue.failJob(job.id, error.message);
        processedJobs.push({ jobId: job.id, status: 'failed', error: error.message });
      }
    }

    return res.status(200).json({
      success: true,
      processed: processedJobs.length,
      jobs: processedJobs
    });

  } catch (error) {
    console.error('Job processing error:', error);
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Job Processors
async function processLeadGeneration(data) {
  const { targetIndustry, location, criteria } = data;

  const leads = await leadScraper.findLeads({
    targetIndustry,
    location,
    criteria: {
      ...criteria,
      count: criteria.count || 50,
      minScore: criteria.minScore || 6
    }
  });

  const csv = leadScraper.exportToCSV(leads);
  const json = leadScraper.exportToJSON(leads);

  return {
    success: true,
    leadsFound: leads.length,
    leads: leads,
    exports: {
      csv: csv,
      json: json
    },
    summary: {
      totalFound: leads.length,
      avgFitScore: leads.reduce((sum, l) => sum + (l.fitScore || 0), 0) / leads.length,
      sources: [...new Set(leads.map(l => l.source))]
    }
  };
}

async function processContentCreation(data) {
  const { topic, keywords, tone, wordCount } = data;

  // Research
  const research = await orchestrator.execute(
    'deep-research',
    `Research the topic: ${topic}. Keywords: ${keywords.join(', ')}.
    Provide key insights, statistics, and unique angles for a ${wordCount}-word blog post.`
  );

  // Outline
  const outline = await orchestrator.execute(
    'content-generation',
    `Create a detailed outline for a blog post about ${topic}.
    Keywords: ${keywords.join(', ')}
    Tone: ${tone}
    Length: ${wordCount} words

    Research: ${research.content}`
  );

  // Full content
  const content = await orchestrator.execute(
    'content-generation',
    `Write a complete ${wordCount}-word blog post:

    ${outline.content}

    Requirements:
    - Tone: ${tone}
    - Keywords: ${keywords.join(', ')}
    - SEO-optimized
    - Ready to publish`
  );

  return {
    success: true,
    content: content.content,
    research: research.content,
    outline: outline.content,
    wordCount: content.content.split(' ').length,
    totalCost: research.usage.cost + outline.usage.cost + content.usage.cost
  };
}

async function processMarketResearch(data) {
  const { idea, industry, competitors } = data;

  const analysis = await orchestrator.execute(
    'deep-research',
    `Conduct market research for:

    Idea: ${idea}
    Industry: ${industry}
    Competitors: ${competitors?.join(', ') || 'Unknown'}

    Provide:
    1. Market size estimate
    2. Target audience analysis
    3. Competitor analysis
    4. Market opportunity score (1-10)
    5. Recommendations
    6. Risks and challenges`
  );

  return {
    success: true,
    analysis: analysis.content,
    cost: analysis.usage
  };
}
