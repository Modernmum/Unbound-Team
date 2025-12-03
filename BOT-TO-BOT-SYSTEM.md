# 🤖↔️🤖 Bot-to-Bot Communication System

**Multi-Agent AI Network for Collaborative Intelligence**

---

## What Is This?

A complete **bot-to-bot communication system** that allows multiple AI agents to:
- **Talk to each other** (send messages, requests, queries)
- **Work together** (coordinate on complex tasks)
- **Share knowledge** (learn from each other)
- **Make collective decisions** (voting and consensus)

This turns isolated AI bots into a **collaborative AI network**.

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    AGENT NETWORK HUB                        │
│                   (Your Unbound System)                     │
└────────────────────────────────────────────────────────────┘
           ↓               ↓               ↓
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  BOT #1  │    │  BOT #2  │    │  BOT #3  │
    │          │    │          │    │          │
    │ Unbound  │    │Your Sales│    │ Your CRM │
    │Autonomous│◄───┤   Bot    │◄───┤   Bot    │
    │  Agent   │    │          │    │          │
    └──────────┘    └──────────┘    └──────────┘
         │                │                │
         └────────────────┴────────────────┘
                     Messages
                   Coordination
                  Knowledge Sharing
```

All bots register with the **Agent Network Hub** (your Unbound system), then they can communicate with each other.

---

## Files Created

```
backend/services/agent-network.js
  └─ Core bot network coordinator (650+ lines)

backend/api/bot-message.js
  └─ Receive messages from other bots

backend/api/bot-register.js
  └─ Register new bots in the network

backend/api/bot-health.js
  └─ Health check endpoint

backend/api/bot-network-status.js
  └─ Get network status and stats

supabase-bot-network-schema.sql
  └─ Database schema for bot network

.env.example
  └─ Security keys configuration
```

---

## How It Works

### 1. **Bot Registration**

Any AI bot can join your network:

```bash
# External bot registers with your system
curl -X POST https://unboundteam-three.vercel.app/api/bot-register \
  -H "X-Master-Key: your-master-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales AI Bot",
    "type": "sales-bot",
    "capabilities": ["lead-scoring", "email-outreach", "follow-up"],
    "apiEndpoint": "https://sales-bot.com/api",
    "apiKey": "sales-bot-secret-key"
  }'
```

**Response:**
```json
{
  "success": true,
  "botId": "bot-1733184000-abc123",
  "bot": {
    "id": "bot-1733184000-abc123",
    "name": "Sales AI Bot",
    "status": "active",
    "capabilities": ["lead-scoring", "email-outreach", "follow-up"]
  }
}
```

Now this bot is part of your network!

---

### 2. **Bot-to-Bot Messaging**

Bots can send messages to each other:

```javascript
// Sales Bot asks Unbound Bot for help
const agentNetwork = require('./services/agent-network');

await agentNetwork.sendMessage({
  from: 'sales-bot-id',
  to: 'unbound-autonomous-agent',
  type: 'request',
  payload: {
    task: 'generate 20 high-quality leads',
    context: {
      tenantId: 'client-123',
      targetIndustry: 'SaaS founders',
      minScore: 8
    }
  }
});
```

**Unbound Bot receives this and responds:**
```json
{
  "success": true,
  "answer": "Leads generated",
  "data": {
    "leadsGenerated": 20,
    "leads": [...]
  }
}
```

---

### 3. **Multi-Bot Coordination**

Coordinate multiple bots to work on a complex task together:

```javascript
await agentNetwork.coordinateBots({
  goal: 'Launch new marketing campaign',
  tasks: [
    {
      description: 'Generate 50 leads',
      requiredCapability: 'lead-generation'
    },
    {
      description: 'Create email sequence',
      requiredCapability: 'email-marketing'
    },
    {
      description: 'Design landing page',
      requiredCapability: 'landing-pages'
    },
    {
      description: 'Set up ad campaigns',
      requiredCapability: 'advertising'
    }
  ]
});
```

**The network automatically:**
- Finds the best bot for each task
- Assigns tasks to bots
- Tracks progress
- Coordinates dependencies

---

### 4. **Knowledge Sharing**

Bots share what they learn with the network:

```javascript
// Unbound Bot learns something useful
await agentNetwork.shareKnowledge(
  'unbound-autonomous-agent',
  {
    topic: 'lead-generation',
    content: {
      insight: 'LinkedIn posts on Thursdays get 3x more engagement',
      data: { engagementRate: 0.15, bestDay: 'Thursday' }
    },
    summary: 'Thursday LinkedIn posts = 3x engagement',
    tags: ['lead-generation', 'linkedin', 'timing']
  }
);

// Now all bots with 'lead-generation' capability are notified
// They can use this knowledge in their own work
```

---

### 5. **Collective Intelligence (Voting)**

Get consensus from multiple bots:

```javascript
const consensus = await agentNetwork.getConsensus(
  'Should we prioritize lead generation or content creation today?',
  ['unbound-bot', 'sales-bot', 'marketing-bot', 'analytics-bot']
);

console.log(consensus);
```

**Output:**
```json
{
  "question": "Should we prioritize lead generation or content creation?",
  "consensus": "lead-generation",
  "votes": 3,
  "total": 4,
  "agreement": 0.75,
  "details": [
    {
      "bot": "unbound-bot",
      "vote": "lead-generation",
      "confidence": 0.8,
      "reasoning": "Pipeline is weak, need leads urgently"
    },
    {
      "bot": "sales-bot",
      "vote": "lead-generation",
      "confidence": 0.9,
      "reasoning": "Sales team has no leads to follow up on"
    },
    {
      "bot": "marketing-bot",
      "vote": "content-creation",
      "confidence": 0.6,
      "reasoning": "Haven't published content in 10 days"
    },
    {
      "bot": "analytics-bot",
      "vote": "lead-generation",
      "confidence": 0.7,
      "reasoning": "Lead velocity down 40% this week"
    }
  ]
}
```

75% of bots agree: **focus on lead generation today**.

---

## Real-World Use Cases

### Use Case 1: Multi-Company Operations

**You have 3 AI systems:**
1. **Unbound Bot** (lead gen, content, research)
2. **GMP Bot** (growth marketing)
3. **Sales Bot** (CRM automation)

**Morning coordination:**
```javascript
// 6:00 AM - Bots coordinate for the day

// Unbound Bot generates leads
const leads = await unboundBot.generateLeads(50);

// Unbound Bot tells Sales Bot about new leads
await agentNetwork.sendMessage({
  from: 'unbound-bot',
  to: 'sales-bot',
  type: 'notification',
  payload: {
    type: 'new-leads',
    count: 50,
    leads: leads
  }
});

// Sales Bot scores the leads
const scored = await salesBot.scoreLeads(leads);

// Sales Bot tells GMP Bot to create nurture content
await agentNetwork.sendMessage({
  from: 'sales-bot',
  to: 'gmp-bot',
  type: 'request',
  payload: {
    task: 'create nurture email sequence',
    context: { audience: scored.topLeads }
  }
});

// GMP Bot creates emails and notifies everyone
const emails = await gmpBot.createEmails();
await agentNetwork.broadcast({
  from: 'gmp-bot',
  type: 'notification',
  payload: {
    type: 'emails-ready',
    count: 5,
    campaign: 'nurture-sequence'
  }
}, 'email-marketing');
```

**All 3 bots worked together autonomously!**

---

### Use Case 2: Request Help from Other Bots

**Your Unbound Bot needs help:**

```javascript
// Unbound Bot encounters a task it can't do
const result = await agentNetwork.requestHelp(
  'unbound-autonomous-agent',
  {
    task: 'Create Facebook ad campaign',
    capability: 'advertising',
    context: {
      budget: 1000,
      targetAudience: 'SaaS founders',
      goal: 'lead generation'
    },
    urgency: 'high'
  }
);

// Network finds all bots with 'advertising' capability
// They respond with their proposals
// You pick the best one
```

---

### Use Case 3: Collective Decision Making

**Multiple bots vote on strategy:**

```javascript
// Morning planning - get all bots' opinions
const decision = await agentNetwork.getConsensus(
  'What should be the priority for Maggie Forbes today?'
);

// Execute the consensus decision
if (decision.consensus === 'lead-generation') {
  await autonomousAgent.generateLeads('maggie-forbes', 50);
} else if (decision.consensus === 'content-creation') {
  await autonomousAgent.createContent('maggie-forbes', 3);
}
```

---

## Setup Guide

### Step 1: Set Up Database

Run the SQL schema in Supabase:

```bash
# Copy and run in Supabase SQL Editor
cat supabase-bot-network-schema.sql
```

Creates tables:
- `agent_network` - Bot registry
- `bot_messages` - Message history
- `bot_coordination` - Coordination plans
- `shared_knowledge` - Knowledge base
- `bot_consensus` - Voting results

---

### Step 2: Configure Security Keys

```bash
# Copy example file
cp .env.example .env

# Generate secure keys
# Use: https://generate-random.org/api-key-generator

# Add to .env:
BOT_NETWORK_KEY=your-secure-random-key
MASTER_BOT_KEY=different-secure-random-key
```

**Key purposes:**
- `BOT_NETWORK_KEY` - Bots use this to authenticate messages
- `MASTER_BOT_KEY` - Only you have this, for registering new bots

---

### Step 3: Register Your First Bot

```javascript
const agentNetwork = require('./backend/services/agent-network');

// Register Unbound Autonomous Agent
await agentNetwork.registerBot({
  name: 'Unbound Autonomous Agent',
  type: 'autonomous-agent',
  capabilities: [
    'lead-generation',
    'content-creation',
    'market-research',
    'email-marketing',
    'landing-pages'
  ],
  apiEndpoint: 'https://unboundteam-three.vercel.app/api',
  apiKey: process.env.BOT_NETWORK_KEY
});

console.log('✅ Unbound Bot registered in network');
```

---

### Step 4: Connect External Bots

**From another system (your sales bot, CRM bot, etc.):**

```bash
# Register with Unbound Network
curl -X POST https://unboundteam-three.vercel.app/api/bot-register \
  -H "X-Master-Key: YOUR_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Sales Bot",
    "type": "sales-bot",
    "capabilities": ["lead-scoring", "crm-sync"],
    "apiEndpoint": "https://my-sales-bot.com/api",
    "apiKey": "my-bot-secret-key"
  }'
```

---

### Step 5: Send First Message

```javascript
// Sales Bot sends message to Unbound Bot
await fetch('https://unboundteam-three.vercel.app/api/bot-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Bot-Auth': 'BOT_NETWORK_KEY'
  },
  body: JSON.stringify({
    from: 'my-sales-bot',
    to: 'unbound-autonomous-agent',
    type: 'request',
    payload: {
      task: 'generate 10 leads',
      context: { industry: 'SaaS' }
    }
  })
});

// Unbound Bot receives it and generates leads!
```

---

## Network Status Dashboard

Check what's happening in your bot network:

```bash
curl https://unboundteam-three.vercel.app/api/bot-network-status?apiKey=YOUR_KEY
```

**Response:**
```json
{
  "success": true,
  "network": {
    "stats": {
      "totalBots": 5,
      "activeBots": 5,
      "messageQueue": 0,
      "collaborations": 12,
      "capabilities": [
        "lead-generation",
        "content-creation",
        "email-marketing",
        "advertising",
        "crm-sync"
      ]
    },
    "activeBots": [
      {
        "id": "unbound-autonomous-agent",
        "name": "Unbound Autonomous Agent",
        "type": "autonomous-agent",
        "status": "active",
        "lastSeen": "2025-12-02T14:30:00Z"
      },
      ...
    ],
    "health": [
      {
        "bot": "unbound-autonomous-agent",
        "status": "healthy",
        "responseTime": "45ms"
      },
      ...
    ]
  }
}
```

---

## Security Features

### 1. **Authentication**
- All bots must have valid API key
- Master key required to register new bots
- Each message authenticated with `X-Bot-Auth` header

### 2. **Authorization**
- Bots can only perform actions they have capabilities for
- Row-level security in Supabase
- Rate limiting (TODO: implement)

### 3. **Audit Trail**
- All messages logged
- All coordination plans stored
- All knowledge sharing tracked

### 4. **Health Monitoring**
- Regular health checks
- Automatic detection of stale/dead bots
- Performance metrics

---

## API Reference

### POST /api/bot-register
Register a new bot in the network.

**Headers:**
```
X-Master-Key: your-master-key
```

**Body:**
```json
{
  "name": "Bot Name",
  "type": "bot-type",
  "capabilities": ["cap1", "cap2"],
  "apiEndpoint": "https://bot.com/api",
  "apiKey": "bot-secret"
}
```

---

### POST /api/bot-message
Send/receive messages between bots.

**Headers:**
```
X-Bot-Auth: bot-network-key
```

**Body:**
```json
{
  "from": "sender-bot-id",
  "to": "receiver-bot-id",
  "type": "request|query|notification|task-assignment",
  "payload": {}
}
```

---

### GET /api/bot-health
Health check endpoint.

**Headers:**
```
X-Bot-Auth: bot-network-key
```

**Response:**
```json
{
  "botId": "unbound-autonomous-agent",
  "status": "healthy",
  "uptime": 86400,
  "capabilities": [...]
}
```

---

### GET /api/bot-network-status
Get full network status.

**Query:**
```
?apiKey=bot-network-key
```

**Response:**
```json
{
  "network": {
    "stats": {...},
    "activeBots": [...],
    "health": [...]
  }
}
```

---

## Example: Full Bot Network Setup

**Scenario:** You have 3 systems that need to work together.

### System 1: Unbound.team (Lead Gen + Content)
```javascript
// Register in network
await agentNetwork.registerBot({
  name: 'Unbound Bot',
  type: 'autonomous-agent',
  capabilities: ['lead-generation', 'content-creation'],
  apiEndpoint: 'https://unboundteam-three.vercel.app/api',
  apiKey: process.env.BOT_NETWORK_KEY
});
```

### System 2: Your CRM Bot
```javascript
// Register from CRM system
await fetch('https://unboundteam-three.vercel.app/api/bot-register', {
  method: 'POST',
  headers: {
    'X-Master-Key': 'YOUR_MASTER_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'CRM Bot',
    type: 'crm-bot',
    capabilities: ['lead-scoring', 'deal-tracking'],
    apiEndpoint: 'https://your-crm.com/api',
    apiKey: 'crm-bot-secret'
  })
});
```

### System 3: Your Email Marketing Bot
```javascript
// Register from email system
await fetch('https://unboundteam-three.vercel.app/api/bot-register', {
  method: 'POST',
  headers: {
    'X-Master-Key': 'YOUR_MASTER_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Email Bot',
    type: 'email-bot',
    capabilities: ['email-campaigns', 'automation'],
    apiEndpoint: 'https://your-email-system.com/api',
    apiKey: 'email-bot-secret'
  })
});
```

### Now They Work Together:

```javascript
// Morning workflow - all automated

// 1. Unbound Bot generates leads
const leads = await unboundBot.generateLeads(50);

// 2. Unbound Bot sends leads to CRM Bot
await agentNetwork.sendMessage({
  from: 'unbound-bot',
  to: 'crm-bot',
  type: 'notification',
  payload: { type: 'new-leads', leads }
});

// 3. CRM Bot scores leads and identifies top 10
const topLeads = await crmBot.scoreLeads(leads);

// 4. CRM Bot asks Email Bot to create campaign
await agentNetwork.sendMessage({
  from: 'crm-bot',
  to: 'email-bot',
  type: 'request',
  payload: {
    task: 'create-campaign',
    leads: topLeads
  }
});

// 5. Email Bot creates campaign automatically
await emailBot.createCampaign(topLeads);

// 6. Email Bot tells everyone it's done
await agentNetwork.broadcast({
  from: 'email-bot',
  type: 'notification',
  payload: {
    type: 'campaign-ready',
    leadCount: 10
  }
}, 'email-campaigns');
```

**All 3 systems coordinated automatically with ZERO human intervention!**

---

## Cost Considerations

**Running the bot network:**
- Message storage: ~$0.01/day (1000 messages)
- Database queries: Minimal (covered by Supabase free tier)
- API calls between bots: Free (your own infrastructure)

**Essentially free to run!**

---

## Next Steps

When you're ready to set this up:

1. **Run database schema** in Supabase
2. **Generate security keys** and add to `.env`
3. **Register Unbound Bot** in the network
4. **Test with a simple message** between two bots
5. **Connect your other AI systems** (GMP, CRM, etc.)
6. **Watch them collaborate autonomously!**

---

## Questions?

This is ready to deploy whenever you finish fixing GMP. The bot network will be waiting! 🚀

Let me know when you're ready and I'll help you:
- Connect your specific bots
- Set up coordination workflows
- Test the network
- Monitor bot communications
