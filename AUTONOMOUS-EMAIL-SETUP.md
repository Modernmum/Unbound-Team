# Autonomous Email Engine Setup Guide

This guide walks you through setting up the fully autonomous email system for Unbound.Team.

## What the Engine Does

The Autonomous Email Engine handles the complete email lifecycle:

1. **Sends personalized emails** with AI-generated content
2. **Tracks engagement** (opens, clicks) via tracking pixels
3. **Receives and processes replies** automatically
4. **Classifies intent** (interested, objection, not interested, etc.)
5. **Auto-responds** with AI-generated follow-ups
6. **Runs follow-up sequences** on custom timing
7. **Converts to bookings** by sending Calendly links to interested leads
8. **Handles compliance** (unsubscribes, bounces)

## Architecture

```
Lead Discovery → Research → Scoring → Initial Email
                                          ↓
                                   [Tracking Pixel]
                                          ↓
              ┌─────────────────────────────────────────────┐
              │           AUTONOMOUS EMAIL ENGINE           │
              │                                             │
              │  Opens → Log engagement                     │
              │  Clicks → Log + detect Calendly clicks      │
              │  Replies → Classify → Auto-respond          │
              │  No Reply → Follow-up sequence              │
              │  Interested → Send booking email            │
              │  Bounces → Add to blocklist                 │
              │  Unsubscribe → Remove from list             │
              └─────────────────────────────────────────────┘
                                          ↓
                              Meeting Scheduled → CRM
```

## Setup Steps

### 1. Run Database Migration

Run the SQL migration to add required tables and columns:

```bash
# In your Supabase dashboard SQL editor, run:
# /database-schema-email-upgrade.sql
```

Or via CLI:
```bash
psql -h your-supabase-host -U postgres -d postgres -f database-schema-email-upgrade.sql
```

### 2. Configure Environment Variables

Add these to your Railway environment (or `.env` for local):

```bash
# Required for email sending
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=maggie@yourdomain.com
SENDER_NAME=Maggie Forbes

# Required for tracking
TRACKING_BASE_URL=https://web-production-486cb.up.railway.app

# Required for booking
CALENDLY_LINK=https://calendly.com/your-calendar/discovery

# Optional but recommended
RESEND_WEBHOOK_SECRET=whsec_xxxxx
```

### 3. Configure Resend Webhooks

1. Go to [Resend Dashboard](https://resend.com/webhooks)
2. Click **Add Webhook**
3. Set the endpoint URL:
   ```
   https://web-production-486cb.up.railway.app/api/webhook/resend
   ```
4. Select events to receive:
   - `email.sent`
   - `email.delivered`
   - `email.opened`
   - `email.clicked`
   - `email.bounced`
   - `email.complained`
5. Copy the webhook secret to `RESEND_WEBHOOK_SECRET`

### 4. Configure Resend Inbound Emails (for replies)

1. In Resend Dashboard, go to **Domains**
2. Add/verify your domain
3. Set up inbound email forwarding to:
   ```
   https://web-production-486cb.up.railway.app/api/webhook/email-reply
   ```

### 5. Deploy

Push changes and deploy to Railway:

```bash
git add .
git commit -m "Add autonomous email engine"
git push
```

## API Endpoints

### Engine Control

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/email-engine/start` | POST | Start the engine |
| `/api/email-engine/stop` | POST | Stop the engine |
| `/api/email-engine/stats` | GET | Get current stats |
| `/api/email-engine/analytics` | GET | Get funnel analytics |

### Configuration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/email-engine/sequence` | GET | Get current follow-up sequence |
| `/api/email-engine/configure-sequence` | POST | Set custom sequence timing |
| `/api/email-engine/calendly-link` | POST | Update Calendly link |

### Manual Triggers

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/email-engine/process-followups` | POST | Manually run follow-up processor |
| `/api/email-engine/process-reply` | POST | Manually process a reply |

### Webhooks (automated)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhook/resend` | POST | Receives Resend events |
| `/api/webhook/email-reply` | POST | Receives inbound emails |

### Tracking (automated)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/track/open/:campaignId` | GET | Tracking pixel |
| `/api/track/click/:campaignId` | GET | Click tracking redirect |
| `/api/unsubscribe/:email` | GET/POST | Unsubscribe handler |

## Configuring Follow-up Timing

Default sequence (3 touches):
- **Day 3**: First follow-up
- **Day 7**: Second follow-up
- **Day 14**: Final follow-up

To customize:

```bash
curl -X POST https://web-production-486cb.up.railway.app/api/email-engine/configure-sequence \
  -H "Content-Type: application/json" \
  -d '{
    "sequence": [
      { "delay": 48, "type": "follow_up_1", "subject": "Quick follow-up" },
      { "delay": 120, "type": "follow_up_2", "subject": "One more thought" },
      { "delay": 240, "type": "follow_up_final", "subject": "Last note" }
    ]
  }'
```

Note: `delay` is in hours from the initial email send.

## How Replies Are Handled

When a reply comes in:

1. **Match to campaign** by sender email
2. **Clean reply text** (remove quoted content)
3. **Classify intent** using Claude AI:
   - `INTERESTED` → Send AI response + monitor
   - `READY_TO_BOOK` → Send Calendly link immediately
   - `OBJECTION` → Address concern + nurture
   - `NOT_INTERESTED` → Mark closed, stop sequence
   - `OUT_OF_OFFICE` → Schedule retry in 3 days
   - `UNSUBSCRIBE` → Add to blocklist
4. **Generate response** (if applicable) using Claude
5. **Send response** via Resend
6. **Update campaign status**

## Email Analytics

Get funnel metrics:

```bash
curl https://web-production-486cb.up.railway.app/api/email-engine/analytics?days=30
```

Response:
```json
{
  "success": true,
  "analytics": {
    "period": "30 days",
    "total": 100,
    "sent": 95,
    "delivered": 92,
    "opened": 45,
    "clicked": 12,
    "replied": 8,
    "booked": 3,
    "bounced": 3,
    "rates": {
      "deliveryRate": "96.8%",
      "openRate": "48.9%",
      "clickRate": "26.7%",
      "replyRate": "8.7%",
      "bookingRate": "37.5%",
      "bounceRate": "3.2%"
    }
  }
}
```

## Compliance

The engine automatically handles:

- **List-Unsubscribe header** in all emails
- **One-click unsubscribe** support
- **Bounce handling** (hard bounces blocked)
- **Spam complaint handling** (auto-unsubscribe)
- **Blocklist enforcement** (no emails to blocked addresses)

## Troubleshooting

### Emails not sending
1. Check `RESEND_API_KEY` is set
2. Verify domain is authenticated in Resend
3. Check `email_blocklist` table for blocked emails

### Replies not processing
1. Verify Resend inbound email is configured
2. Check webhook endpoint is accessible
3. Look for errors in Railway logs

### Follow-ups not sending
1. Engine must be running (`/api/email-engine/start`)
2. Campaign must have `recipient_email` set
3. Campaign status must be `sent`, `follow_up_1`, or `follow_up_2`
4. Campaign must not have `replied_at`, `bounced_at`, or `unsubscribed_at`

### Check engine status
```bash
curl https://web-production-486cb.up.railway.app/api/email-engine/stats
```

## Testing

### Test the full flow locally:

1. Start the server:
   ```bash
   cd backend && npm start
   ```

2. Simulate a reply:
   ```bash
   curl -X POST http://localhost:3000/api/email-engine/process-reply \
     -H "Content-Type: application/json" \
     -d '{
       "from": "test@example.com",
       "subject": "Re: Quick follow-up",
       "text": "This sounds interesting! Can you tell me more about how this works?"
     }'
   ```

3. Check the response shows the classification and action taken.

## Files

| File | Purpose |
|------|---------|
| `backend/services/autonomous-email-engine.js` | Main engine |
| `backend/services/ai-conversation-handler.js` | Reply classification & response |
| `backend/services/auto-booking.js` | Calendly integration |
| `backend/server.js` | API endpoints |
| `database-schema-email-upgrade.sql` | Database migration |

## Next Steps

After setup:

1. **Test with a real email** to yourself
2. **Verify tracking pixel** works (check `open_count` increases)
3. **Test reply processing** by replying to a test email
4. **Monitor the dashboard** for engagement metrics
5. **Adjust follow-up timing** based on your audience
