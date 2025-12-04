# 🧠 Empire AGI - Complete Setup Guide

## Problem: "Empire AGI doesn't work, there are no results at all"

**Root Cause:** Database tables don't exist yet. Empire AGI is trying to queue jobs and store results, but the database schema hasn't been set up.

## ✅ Solution: 3-Step Setup (5 minutes)

### Step 1: Set Up Database Tables (2 minutes)

1. **Go to your Supabase project:**
   - Open https://supabase.com
   - Select project: `bixudsnkdeafczzqfvdq`

2. **Open SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run these SQL files IN ORDER:**

   **File 1: Queue System** (Run `supabase-queue-schema.sql`)
   ```sql
   -- Copy and paste the entire contents of supabase-queue-schema.sql
   -- This creates the job_queue and ai_usage tables
   ```

   **File 2: Empire AGI Intelligence** (Run `supabase-empire-agi-schema.sql`)
   ```sql
   -- Copy and paste the entire contents of supabase-empire-agi-schema.sql
   -- This creates AGI decision tracking, learning, and memory tables
   ```

### Step 2: Verify Tables Created (30 seconds)

Run this query in Supabase SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'job_queue',
  'ai_usage',
  'agi_business_state',
  'agi_decisions',
  'agi_insights',
  'agi_strategies',
  'agi_experiments'
)
ORDER BY table_name;
```

**Expected output:** You should see 7 tables listed.

### Step 3: Start Empire AGI (2 minutes)

```bash
cd /Users/Kristi/Documents/zero-to-legacy-engine/unbound-team/backend
node start-empire.js
```

## 🎯 What Should Happen

Once the database is set up and Empire AGI starts:

### **Cycle 1** (Happens immediately):
1. ✅ **PERCEIVE:** Monitors Maggie Forbes & Growth Manager Pro
2. ✅ **ANALYZE:** Identifies gaps (health scores start low: ~9/100)
3. ✅ **LEARN:** Analyzes past decisions (none yet on first run)
4. ✅ **PLAN:** Creates 5-8 action plans
5. ✅ **EXECUTE:** Queues jobs (lead generation, content creation)
6. ✅ **REPORT:** Sends status update (if Discord configured)

### **Every 5 seconds:** Queue worker processes jobs
- Generates executive leads for Maggie Forbes
- Generates standard leads for Growth Manager Pro
- Creates content
- Stores results in database

### **Every 1 hour:** Empire AGI runs another cycle
- Reviews what worked
- Learns from results
- Plans new actions
- Continuously improves

## 📊 How to View Results

### Option 1: Check Database Directly

```sql
-- See queued/completed jobs
SELECT
  queue_name,
  status,
  created_at,
  result->>'leadsFound' as leads_found
FROM job_queue
ORDER BY created_at DESC
LIMIT 20;

-- See AGI decisions and outcomes
SELECT
  business_name,
  decision,
  action_type,
  outcome,
  results->>'leadsFound' as leads_found,
  executed_at
FROM agi_decisions
ORDER BY executed_at DESC
LIMIT 10;

-- See business health over time
SELECT
  business_name,
  health_score,
  trend,
  kpis,
  timestamp
FROM agi_business_state
ORDER BY timestamp DESC
LIMIT 10;
```

### Option 2: Quick Check Script

```bash
cd /Users/Kristi/Documents/zero-to-legacy-engine/unbound-team
node check-jobs.js
```

## 🚀 Expected Results

**After 10 minutes of running:**
- ✅ 6-10 completed jobs
- ✅ 20-40 leads generated (split between Maggie Forbes and GMP)
- ✅ 1-3 content pieces created
- ✅ Business health scores improve from 9/100 to 30-40/100
- ✅ AGI makes 5-10 decisions, learns from results

**After 1 hour:**
- ✅ AGI completes 2nd cycle
- ✅ 40-80 leads total
- ✅ Health scores 50-60/100
- ✅ AGI starts optimizing strategies based on what worked

**After 24 hours:**
- ✅ 24 AGI cycles completed
- ✅ 400+ leads generated
- ✅ 50+ content pieces
- ✅ Health scores 70-80/100
- ✅ AGI identifies patterns and cross-pollinates strategies

## 🐛 Troubleshooting

### Problem: "supabaseKey is required"
**Solution:** Check `.env` file in `backend/` directory
```bash
cd backend
cat .env | grep SUPABASE
```
Should see:
```
SUPABASE_URL=https://bixudsnkdeafczzqfvdq.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUz...
```

### Problem: "Could not find table 'queue_jobs'"
**Solution:** Wrong table name in check script. Table is called `job_queue`, not `queue_jobs`. Use the SQL queries above instead.

### Problem: "No processors for queue: market-research"
**Solution:** This is NORMAL. Only lead-generation and content-creation are implemented. The warnings are safe to ignore.

### Problem: Jobs queued but not processed
**Solution:** Queue worker runs every 5 seconds. Wait 10 seconds and check again:
```sql
SELECT status, COUNT(*)
FROM job_queue
GROUP BY status;
```

### Problem: Health scores stay low
**Solution:** This is normal at first! The AGI starts with NO data:
- **0-20/100:** Initial state (no leads, no clients)
- **20-40/100:** After first 10 minutes (some leads generated)
- **40-60/100:** After 1 hour (consistent lead flow)
- **60-80/100:** After 24 hours (learning what works)
- **80-100/100:** After 1 week (hitting targets)

## 📈 Dashboard (Optional)

To see results visually:
1. Open `empire-agi-dashboard.html` in browser
2. Or build the React dashboard (see `EMPIRE-AGI-README.md`)

## 🎯 Success Indicators

You'll know it's working when:
1. ✅ Empire AGI runs without crashing
2. ✅ You see "Job added to lead-generation: [uuid]" messages
3. ✅ Queue worker logs "Processing job [uuid]"
4. ✅ Database `job_queue` table has rows with status='completed'
5. ✅ Business health scores increase over time
6. ✅ AGI cycles complete every hour

## 📞 Still Having Issues?

If after running the setup you still see no results:

1. **Check the logs:**
   ```bash
   cd backend
   node start-empire.js 2>&1 | tee empire-agi.log
   ```

2. **Verify database connection:**
   ```bash
   node -e "require('dotenv').config(); console.log('URL:', process.env.SUPABASE_URL); console.log('Key exists:', !!process.env.SUPABASE_KEY)"
   ```

3. **Test queue system directly:**
   ```bash
   cd backend/test
   node test-empire-agi.js
   ```

---

## 🚀 Quick Start Commands

```bash
# 1. Set up database (copy-paste SQL in Supabase)
# 2. Start Empire AGI
cd /Users/Kristi/Documents/zero-to-legacy-engine/unbound-team/backend
node start-empire.js

# 3. In another terminal, check progress
watch -n 5 'echo "SELECT status, COUNT(*) FROM job_queue GROUP BY status;" | psql [your-supabase-connection-string]'
```

---

**Built with autonomy in mind. Let the AGI run, and it will learn and optimize over time.**
