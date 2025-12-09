# Unbound-Team Business Context & Architecture

**Last Updated:** December 9, 2025

---

## Business Model Overview

### What is Unbound-Team?

**Unbound-Team** is a B2B SaaS/Service company that builds **autonomous opportunity discovery and client acquisition systems** for other businesses.

**Core Value Proposition:**
- Discovers potential clients automatically (RSS feeds, forums, social media)
- Sends personalized outreach on behalf of the business
- Onboards new clients
- Delivers solutions to solve client problems
- Fully autonomous operation with human oversight

---

## Client Relationship Model

### Maggie Forbes Strategies - First Client (Pilot)

**Relationship:** Maggie Forbes Strategies is Unbound-Team's **first client** and **testing ground**.

**Why Maggie Forbes?**
- Proof of concept for the Unbound system
- Real-world validation of autonomous discovery & outreach
- Case study for future clients
- Revenue-generating pilot program

**What Unbound Does FOR Maggie Forbes:**
1. **Discovers opportunities** - Finds entrepreneurs/businesses with problems MFS can solve
2. **Automated outreach** - Sends personalized emails to prospects on behalf of MFS
3. **Client onboarding** - Manages the intake process for new MFS clients
4. **Problem solving** - Delivers solutions that fix client issues
5. **Full pipeline management** - From discovery → outreach → close → delivery

**Expected Outcome:**
- Maggie Forbes gets new clients automatically
- Unbound proves the system works
- Data/metrics show ROI and effectiveness
- Success stories for marketing to future Unbound clients

---

## System Architecture

### The Unbound Platform (Backend)

**What It Is:**
- Multi-tenant autonomous system
- Built to serve MULTIPLE businesses (not just Maggie Forbes)
- Scalable, white-label infrastructure

**Location:**
- Repository: `github.com/Modernmum/Unbound-Team`
- Backend: Railway (https://web-production-486cb.up.railway.app)
- Database: Supabase PostgreSQL

**Core Services:**
1. **Discovery Engine** - RSS feeds, forum scanning, social listening
2. **Opportunity Scoring** - AI-powered fit analysis (1-10 score)
3. **Auto Outreach** - Personalized email campaigns
4. **Auto Delivery** - Solution delivery automation
5. **Dashboard Control** - Client-branded command centers

### Client Implementation: Maggie Forbes Strategies

**Dashboard Branding:**
- Gold (#B8935F) and Navy (#1a2332) - MFS brand colors
- **"MFS × UT"** monogram - Shows partnership (Maggie Forbes Strategies × Unbound Team)
- Cormorant Garamond typography - MFS brand font
- "Powered by Unbound" attribution

**What Maggie Forbes Sees:**
- Branded dashboard with her visual identity
- Real-time opportunity feed (entrepreneurs needing help)
- Email campaign performance metrics
- Agent controls to start/stop automation
- Pipeline visualization (discovery → emails → meetings → deals)

**What Maggie Forbes Gets:**
- Automated client discovery
- Outreach done for her
- Pipeline full of qualified leads
- Solutions delivered to her clients
- Revenue growth without manual prospecting

---

## Separation of Systems

### Unbound-Team (The Product)
- **Type:** B2B SaaS/Service Platform
- **Purpose:** Build autonomous systems for other businesses
- **Deployment:** Independent (Railway + Supabase)
- **Clients:** Maggie Forbes Strategies (pilot), future clients
- **Branding:** White-label (adapts to client branding)

### Maggie Forbes Strategies (The Client)
- **Type:** Business consulting/strategy firm
- **Purpose:** Help entrepreneurs and businesses solve problems
- **Website:** maggieforbesstrategies.com (Vercel)
- **Relationship to Unbound:** CLIENT (uses Unbound's system)
- **Branding:** Gold/Navy, professional consulting aesthetic

### Key Distinction:
- **Maggie Forbes Strategies website** = Her public-facing business site
- **MFS Unbound Dashboard** = Her private client acquisition command center (powered by Unbound)
- **Unbound Backend** = The engine running behind multiple clients (Maggie Forbes + future clients)

---

## The Vision: Scaling to Multiple Clients

### Phase 1: Maggie Forbes Pilot (Current)
**Goal:** Prove the system works with one client
- ✅ Backend operational
- ✅ Discovery finding real opportunities
- ✅ Dashboard branded and functional
- 🔄 Testing outreach and delivery
- 📊 Collecting success metrics

**Success Metrics:**
- Number of opportunities discovered
- Email open/reply rates
- Clients acquired for Maggie Forbes
- Revenue generated
- Time saved vs. manual prospecting

### Phase 2: Client #2, #3, #4... (Future)
**Goal:** Replicate success for other businesses

**Process for Each New Client:**
1. **Onboard business** - Understand their ideal client profile
2. **Brand their dashboard** - Apply their colors, logo, fonts
3. **Configure discovery** - RSS feeds, forums, keywords for their niche
4. **Train AI** - Customize scoring and outreach for their voice
5. **Launch automation** - Activate agents to discover and reach out
6. **Monitor & optimize** - Track metrics, improve performance

**Multi-Tenant Architecture:**
- Each client gets their own database schema/partition
- Each client has branded dashboard
- Shared backend infrastructure serves all clients
- Client data is completely isolated

### Phase 3: Full Product Launch
**Goal:** Become the leading autonomous client acquisition platform

**Potential Clients:**
- Marketing agencies (like Maggie Forbes)
- SaaS companies
- Consultants
- Service providers
- Anyone who needs to find and acquire clients

**Revenue Model Options:**
- Monthly SaaS subscription
- Revenue share on acquired clients
- Setup fee + monthly retainer
- Enterprise licensing

---

## Technical Implementation Details

### How Client Branding Works

**Example: Maggie Forbes Dashboard**

```javascript
// Dashboard Configuration (per client)
const CLIENT_CONFIG = {
  name: "Maggie Forbes Strategies",
  branding: {
    primaryColor: "#B8935F",  // Gold
    secondaryColor: "#1a2332", // Navy
    font: "Cormorant Garamond",
    logo: "MFS × UT monogram"
  },
  discoveryConfig: {
    targetAudience: "entrepreneurs, small business owners",
    painPoints: ["marketing", "sales", "growth", "strategy"],
    industries: ["consulting", "coaching", "services"],
    sources: ["Indie Hackers", "r/Entrepreneur", "HubSpot Blog"]
  },
  outreachConfig: {
    fromName: "Maggie Forbes",
    fromEmail: "maggie@maggieforbesstrategies.com",
    tone: "professional, empathetic, solution-focused"
  }
}
```

**For Future Clients:**
Just swap the config - same backend, different branding and targeting.

### Database Schema (Multi-Tenant)

```sql
-- Each client gets their own records tagged with client_id
scored_opportunities
  - id
  - client_id  (e.g., "maggie-forbes", "client-2", "client-3")
  - opportunity_data
  - fit_score
  - created_at

outreach_campaigns
  - id
  - client_id
  - campaign_name
  - emails_sent
  - conversions

solution_deliveries
  - id
  - client_id
  - delivery_status
  - client_satisfaction
```

---

## Why This Architecture Matters

### For Maggie Forbes:
- Gets a powerful client acquisition system
- Doesn't have to build it herself
- Pays Unbound for the service
- Focuses on delivering value to HER clients
- Unbound handles the tech and automation

### For Unbound:
- Proves the business model works
- Gets testimonials and case studies from Maggie Forbes
- Refines the product based on real usage
- Builds a scalable platform that can serve 10, 100, 1000 clients
- Creates recurring revenue stream

### For Future Clients:
- Battle-tested system (proven with Maggie Forbes)
- Quick setup (white-label infrastructure ready)
- Lower risk (social proof from existing clients)
- Faster time to value (no need to build from scratch)

---

## Success Criteria

### For Maggie Forbes Pilot:
- [ ] System discovers 100+ qualified opportunities per month
- [ ] Outreach achieves 20%+ open rate, 5%+ reply rate
- [ ] Acquires 3-5 new clients for Maggie Forbes per month
- [ ] Saves Maggie 20+ hours per week on prospecting
- [ ] Generates measurable ROI (revenue > Unbound fees)

### For Unbound Business:
- [ ] Maggie Forbes renews contract (happy client)
- [ ] Document case study with metrics
- [ ] Onboard Client #2 using lessons learned
- [ ] Achieve 90%+ uptime and reliability
- [ ] Build reputation as trusted client acquisition partner

---

## Current Status (December 2025)

### ✅ Complete:
- Backend infrastructure (Railway + Supabase)
- Discovery engine (RSS + Forums)
- Opportunity scoring algorithm
- Agent architecture (Gap Finder, Auto Outreach, Auto Delivery)
- Maggie Forbes branded dashboard
- API endpoints for all core functions
- Production testing (100% pass rate)
- System independence verified

### 🔄 In Progress:
- Activating autonomous agents for live operation
- Collecting discovery metrics with real data
- Testing outreach campaigns
- Measuring conversion rates
- Optimizing scoring algorithms

### 📋 Next Steps:
1. Activate agents for Maggie Forbes
2. Run discovery 24/7 for 30 days
3. Send outreach campaigns and track results
4. Acquire first clients for Maggie Forbes
5. Document success metrics
6. Prepare for Client #2 onboarding

---

## Business Relationships Diagram

```
UNBOUND-TEAM (The Platform)
    │
    ├─ Client #1: Maggie Forbes Strategies
    │     │
    │     ├─ Dashboard: MFS × UT branded
    │     ├─ Target: Entrepreneurs needing help
    │     └─ Goal: Acquire clients for MFS
    │
    ├─ Client #2: [Future Business]
    │     │
    │     ├─ Dashboard: Their branding
    │     ├─ Target: Their ideal customers
    │     └─ Goal: Acquire clients for them
    │
    └─ Client #3+: [Future Expansion]
          └─ Same pattern, scaled infinitely
```

---

## Key Takeaways

1. **Unbound is the product, Maggie Forbes is the client**
2. **The system is built to serve MULTIPLE businesses**
3. **Maggie Forbes is the pilot/proof-of-concept**
4. **Success with MFS = ability to sell to others**
5. **The architecture is white-label and multi-tenant**
6. **Each client gets branded dashboards but shares infrastructure**
7. **The goal is to scale this to many businesses**

---

## Important Notes for Development

### When Building Features:
- ✅ Build for multi-tenant use (not just Maggie Forbes)
- ✅ Make branding configurable (colors, fonts, logos)
- ✅ Keep client data isolated (client_id on all records)
- ✅ Design for scale (handle 100+ clients eventually)

### When Communicating About the System:
- ✅ Unbound = The platform/business
- ✅ Maggie Forbes = The first client
- ✅ Dashboard branding = Client customization
- ✅ Backend = Shared infrastructure

### When Deploying:
- ✅ Unbound backend = Independent deployment (Railway)
- ✅ Client dashboards = Can be hosted anywhere
- ✅ Maggie Forbes website = Completely separate system
- ✅ No mixing of Unbound and client websites

---

*This context file should be referenced when making architectural decisions, planning features, or explaining the business model to others.*
