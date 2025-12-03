// Agent Network - Bot-to-Bot Communication System
// Allows multiple AI agents to communicate, coordinate, and collaborate

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class AgentNetwork {
  constructor() {
    // Registry of all connected bots
    this.connectedBots = new Map();

    // Message queue for bot-to-bot communication
    this.messageQueue = [];

    // Collaboration history
    this.collaborationLog = [];
  }

  // =========================================================================
  // BOT REGISTRATION
  // =========================================================================

  /**
   * Register a new bot in the network
   * @param {Object} botInfo - Bot information
   * @returns {Object} Registration result
   */
  async registerBot(botInfo) {
    const bot = {
      id: botInfo.id || this.generateBotId(),
      name: botInfo.name,
      type: botInfo.type, // 'autonomous-agent', 'sales-bot', 'analytics-bot', etc.
      capabilities: botInfo.capabilities || [],
      apiEndpoint: botInfo.apiEndpoint,
      apiKey: botInfo.apiKey,
      status: 'active',
      registeredAt: new Date(),
      lastSeen: new Date()
    };

    // Store in memory
    this.connectedBots.set(bot.id, bot);

    // Store in database
    const { data, error } = await supabase
      .from('agent_network')
      .upsert({
        bot_id: bot.id,
        bot_info: bot,
        status: 'active',
        registered_at: bot.registeredAt
      });

    if (error) {
      console.error('Failed to register bot:', error);
      return { success: false, error };
    }

    console.log(`✅ Bot registered: ${bot.name} (${bot.type})`);

    return { success: true, bot };
  }

  /**
   * Unregister a bot from the network
   */
  async unregisterBot(botId) {
    this.connectedBots.delete(botId);

    await supabase
      .from('agent_network')
      .update({ status: 'inactive' })
      .eq('bot_id', botId);

    console.log(`❌ Bot unregistered: ${botId}`);
  }

  /**
   * Get all active bots in the network
   */
  async getActiveBots() {
    return Array.from(this.connectedBots.values()).filter(
      bot => bot.status === 'active'
    );
  }

  /**
   * Find bots by capability
   */
  async findBotsByCapability(capability) {
    const bots = await this.getActiveBots();
    return bots.filter(bot => bot.capabilities.includes(capability));
  }

  // =========================================================================
  // BOT-TO-BOT MESSAGING
  // =========================================================================

  /**
   * Send message from one bot to another
   * @param {Object} message - Message object
   */
  async sendMessage(message) {
    const msg = {
      id: this.generateMessageId(),
      from: message.from,
      to: message.to,
      type: message.type, // 'request', 'response', 'notification', 'query'
      payload: message.payload,
      timestamp: new Date(),
      status: 'pending'
    };

    // Add to queue
    this.messageQueue.push(msg);

    // Store in database
    await supabase.from('bot_messages').insert({
      message_id: msg.id,
      from_bot: msg.from,
      to_bot: msg.to,
      message_type: msg.type,
      payload: msg.payload,
      created_at: msg.timestamp
    });

    // Deliver message
    const result = await this.deliverMessage(msg);

    return result;
  }

  /**
   * Deliver message to target bot
   */
  async deliverMessage(message) {
    const targetBot = this.connectedBots.get(message.to);

    if (!targetBot) {
      console.error(`Bot not found: ${message.to}`);
      return { success: false, error: 'Bot not found' };
    }

    try {
      // Call target bot's API endpoint
      const response = await fetch(`${targetBot.apiEndpoint}/bot-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Auth': targetBot.apiKey
        },
        body: JSON.stringify(message)
      });

      const result = await response.json();

      // Update message status
      message.status = 'delivered';

      console.log(`📨 Message delivered: ${message.from} → ${message.to}`);

      return { success: true, result };

    } catch (error) {
      console.error('Failed to deliver message:', error);
      message.status = 'failed';
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast message to all bots with specific capability
   */
  async broadcast(message, capability) {
    const targetBots = await this.findBotsByCapability(capability);

    const results = await Promise.all(
      targetBots.map(bot =>
        this.sendMessage({
          ...message,
          to: bot.id
        })
      )
    );

    return results;
  }

  // =========================================================================
  // BOT COLLABORATION
  // =========================================================================

  /**
   * Request help from other bots
   * @param {string} requestingBot - ID of bot making request
   * @param {Object} request - What help is needed
   */
  async requestHelp(requestingBot, request) {
    console.log(`\n🤝 ${requestingBot} requesting help:`, request.task);

    // Find bots that can help
    const capableBots = await this.findBotsByCapability(request.capability);

    if (capableBots.length === 0) {
      return {
        success: false,
        error: `No bots found with capability: ${request.capability}`
      };
    }

    // Ask each capable bot
    const responses = await Promise.all(
      capableBots.map(async bot => {
        const response = await this.sendMessage({
          from: requestingBot,
          to: bot.id,
          type: 'request',
          payload: {
            task: request.task,
            context: request.context,
            urgency: request.urgency || 'normal'
          }
        });

        return {
          bot: bot.id,
          botName: bot.name,
          response: response.result
        };
      })
    );

    // Log collaboration
    this.collaborationLog.push({
      requestingBot,
      task: request.task,
      respondingBots: responses.map(r => r.bot),
      timestamp: new Date()
    });

    console.log(`✅ Received ${responses.length} responses`);

    return { success: true, responses };
  }

  /**
   * Coordinate multiple bots to work together
   * @param {Object} coordination - Coordination plan
   */
  async coordinateBots(coordination) {
    console.log(`\n🎯 Coordinating bots for: ${coordination.goal}`);

    const { goal, tasks, bots } = coordination;

    // Assign tasks to bots
    const assignments = [];

    for (const task of tasks) {
      // Find best bot for this task
      const assignedBot = await this.findBestBot(task.requiredCapability);

      if (assignedBot) {
        assignments.push({
          bot: assignedBot.id,
          task: task.description,
          capability: task.requiredCapability
        });

        // Send task to bot
        await this.sendMessage({
          from: 'coordinator',
          to: assignedBot.id,
          type: 'task-assignment',
          payload: {
            goal,
            task: task.description,
            deadline: task.deadline,
            dependencies: task.dependencies || []
          }
        });
      }
    }

    // Store coordination plan
    await supabase.from('bot_coordination').insert({
      goal,
      assignments,
      status: 'in-progress',
      created_at: new Date()
    });

    return { success: true, assignments };
  }

  /**
   * Find the best bot for a specific task
   */
  async findBestBot(capability) {
    const capableBots = await this.findBotsByCapability(capability);

    if (capableBots.length === 0) return null;

    // For now, return the first capable bot
    // TODO: Add scoring based on past performance
    return capableBots[0];
  }

  // =========================================================================
  // CONSENSUS & VOTING
  // =========================================================================

  /**
   * Get consensus from multiple bots
   * @param {string} question - Question to ask
   * @param {Array} botIds - Bots to ask (or all if not specified)
   */
  async getConsensus(question, botIds = null) {
    console.log(`\n🗳️  Getting consensus: ${question}`);

    const targetBots = botIds
      ? botIds.map(id => this.connectedBots.get(id)).filter(Boolean)
      : await this.getActiveBots();

    // Ask each bot for their opinion
    const votes = await Promise.all(
      targetBots.map(async bot => {
        const response = await this.sendMessage({
          from: 'consensus-coordinator',
          to: bot.id,
          type: 'query',
          payload: { question }
        });

        return {
          bot: bot.id,
          vote: response.result?.answer,
          confidence: response.result?.confidence || 0.5,
          reasoning: response.result?.reasoning
        };
      })
    );

    // Analyze votes
    const voteCounts = {};
    votes.forEach(v => {
      voteCounts[v.vote] = (voteCounts[v.vote] || 0) + 1;
    });

    const consensus = Object.entries(voteCounts)
      .sort((a, b) => b[1] - a[1])[0];

    console.log(`✅ Consensus reached: ${consensus[0]} (${consensus[1]}/${votes.length} votes)`);

    return {
      question,
      consensus: consensus[0],
      votes: consensus[1],
      total: votes.length,
      agreement: consensus[1] / votes.length,
      details: votes
    };
  }

  // =========================================================================
  // KNOWLEDGE SHARING
  // =========================================================================

  /**
   * Share knowledge between bots
   * @param {string} fromBot - Bot sharing knowledge
   * @param {Object} knowledge - Knowledge to share
   */
  async shareKnowledge(fromBot, knowledge) {
    console.log(`\n📚 ${fromBot} sharing knowledge: ${knowledge.topic}`);

    // Store in shared knowledge base
    await supabase.from('shared_knowledge').insert({
      source_bot: fromBot,
      topic: knowledge.topic,
      content: knowledge.content,
      tags: knowledge.tags || [],
      created_at: new Date()
    });

    // Notify relevant bots
    const interestedBots = await this.findBotsByCapability(knowledge.topic);

    await this.broadcast(
      {
        from: fromBot,
        type: 'notification',
        payload: {
          type: 'knowledge-shared',
          topic: knowledge.topic,
          summary: knowledge.summary
        }
      },
      knowledge.topic
    );

    console.log(`✅ Knowledge shared with ${interestedBots.length} bots`);

    return { success: true, sharedWith: interestedBots.length };
  }

  /**
   * Query shared knowledge base
   */
  async queryKnowledge(topic, botId) {
    const { data, error } = await supabase
      .from('shared_knowledge')
      .select('*')
      .contains('tags', [topic])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to query knowledge:', error);
      return { success: false, error };
    }

    return { success: true, knowledge: data };
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  generateBotId() {
    return `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get network statistics
   */
  async getNetworkStats() {
    const activeBots = await this.getActiveBots();

    return {
      totalBots: this.connectedBots.size,
      activeBots: activeBots.length,
      messageQueue: this.messageQueue.length,
      collaborations: this.collaborationLog.length,
      capabilities: this.getAllCapabilities()
    };
  }

  getAllCapabilities() {
    const capabilities = new Set();
    this.connectedBots.forEach(bot => {
      bot.capabilities.forEach(cap => capabilities.add(cap));
    });
    return Array.from(capabilities);
  }

  /**
   * Health check for all bots
   */
  async healthCheck() {
    const bots = await this.getActiveBots();

    const results = await Promise.all(
      bots.map(async bot => {
        try {
          const response = await fetch(`${bot.apiEndpoint}/health`, {
            method: 'GET',
            headers: { 'X-Bot-Auth': bot.apiKey },
            timeout: 5000
          });

          return {
            bot: bot.id,
            name: bot.name,
            status: response.ok ? 'healthy' : 'unhealthy',
            responseTime: response.headers.get('X-Response-Time')
          };
        } catch (error) {
          return {
            bot: bot.id,
            name: bot.name,
            status: 'unreachable',
            error: error.message
          };
        }
      })
    );

    return results;
  }
}

// Singleton instance
const agentNetwork = new AgentNetwork();

module.exports = agentNetwork;
