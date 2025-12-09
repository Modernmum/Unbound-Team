# Database Setup Guide

## Quick Start

The database schema needs to be executed in Supabase to create all required tables with approval gates.

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `database-schema.sql`
5. Paste into the SQL Editor
6. Click **Run**

### Option 2: Automated Script (If you have environment variables set)

```bash
node setup-database.js
```

This requires:
- `SUPABASE_URL` environment variable
- `SUPABASE_SERVICE_KEY` environment variable

---

## What Gets Created

### Tables

#### 1. `market_gaps`
Stores identified market opportunities and research findings.

**Approval Gate:** `approved_for_outreach` must be TRUE before outreach can be sent.

```sql
id, created_at, opportunity_id, company_name, gap_type,
gap_description, solution_approach, confidence_score,
approved_for_outreach, approved_by, approved_at
```

#### 2. `outreach_campaigns`
Email outreach campaigns with manual approval required.

**Approval Gate:** `approved_for_sending` must be TRUE before email is sent.

```sql
id, created_at, gap_id, company_name, subject, body,
status, approved_for_sending, approved_by, sent_at
```

#### 3. `solution_deliveries`
Solution deliveries to prospects with manual approval.

**Approval Gate:** `approved_for_delivery` must be TRUE before solution is delivered.

```sql
id, created_at, campaign_id, company_name, solution_type,
solution_content, status, approved_for_delivery, delivered_at
```

#### 4. `system_settings`
Controls auto-send behavior (default: disabled).

```sql
id, setting_key, setting_value, updated_at
```

---

## Safety Controls

### Default Settings (All Disabled)

```sql
auto_outreach_enabled: false
auto_delivery_enabled: false
require_approval_for_outreach: true
require_approval_for_delivery: true
```

### Agent Behavior

By default, **NOTHING AUTO-SENDS**:

- 📝 **Gap Finder Agent**: Analyzes opportunities and stores research in `market_gaps` (status: draft)
- 📝 **Auto Outreach Agent**: Creates DRAFT emails in `outreach_campaigns` (awaiting approval)
- 📝 **Auto Delivery Agent**: Creates DRAFT solutions in `solution_deliveries` (awaiting approval)

### How to Approve Items

#### Approve a Market Gap for Outreach

```sql
UPDATE market_gaps
SET approved_for_outreach = true,
    approved_by = 'your_name',
    approved_at = NOW()
WHERE id = 'gap-uuid-here';
```

#### Approve an Outreach Campaign for Sending

```sql
UPDATE outreach_campaigns
SET approved_for_sending = true,
    approved_by = 'your_name',
    approved_at = NOW(),
    status = 'approved'
WHERE id = 'campaign-uuid-here';
```

#### Approve a Solution for Delivery

```sql
UPDATE solution_deliveries
SET approved_for_delivery = true,
    approved_by = 'your_name',
    approved_at = NOW(),
    status = 'approved'
WHERE id = 'delivery-uuid-here';
```

---

## Optional: Enable Auto-Sending

⚠️ **WARNING**: Only enable if you want the system to send automatically after approval!

### Enable Auto-Outreach (sends emails automatically after approval)

```sql
UPDATE system_settings
SET setting_value = '"true"'
WHERE setting_key = 'auto_outreach_enabled';
```

### Enable Auto-Delivery (delivers solutions automatically after approval)

```sql
UPDATE system_settings
SET setting_value = '"true"'
WHERE setting_key = 'auto_delivery_enabled';
```

---

## Verification

After running the schema, verify tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('market_gaps', 'outreach_campaigns', 'solution_deliveries', 'system_settings');
```

Check default settings:

```sql
SELECT * FROM system_settings;
```

---

## Troubleshooting

### Error: "relation already exists"

This means the tables are already created. You can:
- Ignore the error (schema is already set up)
- Drop and recreate:
  ```sql
  DROP TABLE IF EXISTS solution_deliveries CASCADE;
  DROP TABLE IF EXISTS outreach_campaigns CASCADE;
  DROP TABLE IF EXISTS market_gaps CASCADE;
  DROP TABLE IF EXISTS system_settings CASCADE;
  ```
  Then run the schema again.

### Error: "permission denied"

Make sure you're using the Supabase service role key, not the anon key.

---

## Next Steps

After database setup:
1. ✅ Tables created with approval gates
2. 🚀 Deploy agents to Railway (already done)
3. 📊 Monitor the dashboard to see discovered opportunities
4. ✋ Manually approve items before they send

**Nothing will auto-send without your explicit approval!**
