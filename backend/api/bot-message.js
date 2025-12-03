// API Endpoint: Receive messages from other bots
// POST /api/bot-message

require('dotenv').config();
const agentNetwork = require('../services/agent-network');
const autonomousAgent = require('../services/autonomous-agent');

module.exports = async (req, res) => {
  try {
    // Authenticate the sending bot
    const botAuth = req.headers['x-bot-auth'];

    if (!botAuth || botAuth !== process.env.BOT_NETWORK_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized bot'
      });
    }

    const message = req.body;

    console.log(`\n📨 Received message from ${message.from}:`);
    console.log(`Type: ${message.type}`);
    console.log(`Payload:`, message.payload);

    // Process based on message type
    let response;

    switch (message.type) {
      case 'request':
        response = await handleRequest(message);
        break;

      case 'query':
        response = await handleQuery(message);
        break;

      case 'task-assignment':
        response = await handleTaskAssignment(message);
        break;

      case 'notification':
        response = await handleNotification(message);
        break;

      default:
        response = {
          success: false,
          error: `Unknown message type: ${message.type}`
        };
    }

    res.json(response);

  } catch (error) {
    console.error('Error processing bot message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

async function handleRequest(message) {
  const { task, context, urgency } = message.payload;

  console.log(`🤝 Processing help request: ${task}`);

  // Determine what the requesting bot needs
  if (task.includes('lead') || task.includes('generate leads')) {
    // They want leads generated
    const result = await autonomousAgent.generateLeads(
      context.tenantId || 'network-request',
      {
        targetIndustry: context.targetIndustry,
        count: context.count || 20,
        minScore: context.minScore || 7
      }
    );

    return {
      success: true,
      answer: 'Leads generated',
      data: {
        leadsGenerated: result.leads.length,
        leads: result.leads
      },
      botId: 'unbound-autonomous-agent'
    };
  }

  if (task.includes('content') || task.includes('create content')) {
    // They want content created
    const result = await autonomousAgent.createContent(
      context.tenantId || 'network-request',
      {
        topic: context.topic,
        type: context.type || 'blog',
        count: context.count || 1
      }
    );

    return {
      success: true,
      answer: 'Content created',
      data: {
        contentCreated: result.content.length,
        content: result.content
      },
      botId: 'unbound-autonomous-agent'
    };
  }

  if (task.includes('research') || task.includes('market')) {
    // They want market research
    const result = await autonomousAgent.researchMarket(
      context.tenantId || 'network-request',
      {
        focus: context.focus || 'competitive-analysis',
        industry: context.industry
      }
    );

    return {
      success: true,
      answer: 'Research completed',
      data: result,
      botId: 'unbound-autonomous-agent'
    };
  }

  // Default response
  return {
    success: false,
    answer: 'Unable to help with that task',
    botId: 'unbound-autonomous-agent'
  };
}

async function handleQuery(message) {
  const { question } = message.payload;

  console.log(`❓ Processing query: ${question}`);

  // Use AI to answer the question
  const answer = await autonomousAgent.answerQuestion(question);

  return {
    success: true,
    answer: answer.response,
    confidence: answer.confidence,
    reasoning: answer.reasoning,
    botId: 'unbound-autonomous-agent'
  };
}

async function handleTaskAssignment(message) {
  const { goal, task, deadline, dependencies } = message.payload;

  console.log(`📋 Task assigned: ${task}`);
  console.log(`Goal: ${goal}`);
  console.log(`Deadline: ${deadline}`);

  // Add task to autonomous agent's queue
  const result = await autonomousAgent.acceptTask({
    goal,
    task,
    deadline,
    dependencies,
    assignedBy: message.from
  });

  return {
    success: true,
    message: 'Task accepted and queued',
    taskId: result.taskId,
    estimatedCompletion: result.estimatedCompletion,
    botId: 'unbound-autonomous-agent'
  };
}

async function handleNotification(message) {
  const { type, topic, summary } = message.payload;

  console.log(`🔔 Notification: ${type}`);

  if (type === 'knowledge-shared') {
    console.log(`📚 New knowledge available: ${topic}`);

    // Store reference to this knowledge
    await autonomousAgent.noteKnowledge({
      topic,
      summary,
      source: message.from
    });
  }

  return {
    success: true,
    message: 'Notification received',
    botId: 'unbound-autonomous-agent'
  };
}
