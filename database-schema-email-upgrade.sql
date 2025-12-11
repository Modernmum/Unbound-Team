-- Autonomous Email Engine Database Upgrade
-- Run this to add the necessary columns and tables for full email automation

-- ============================================
-- UPGRADE OUTREACH_CAMPAIGNS TABLE
-- ============================================

-- Add tracking columns if they don't exist
ALTER TABLE outreach_campaigns
ADD COLUMN IF NOT EXISTS recipient_email TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS resend_email_id TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS calendly_clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bounce_reason TEXT,
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT,
ADD COLUMN IF NOT EXISTS last_reply_text TEXT,
ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS followup_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS booking_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retry_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS review_reason TEXT,
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status to include new values
COMMENT ON COLUMN outreach_campaigns.status IS 'Status: draft, sent, follow_up_1, follow_up_2, follow_up_final, replied, interested, booking, booking_sent, meeting_scheduled, bounced, unsubscribed, closed_lost, nurturing, retry_scheduled';

-- ============================================
-- EMAIL BLOCKLIST TABLE (Bounces + Unsubscribes)
-- ============================================

CREATE TABLE IF NOT EXISTS email_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  reason TEXT NOT NULL, -- 'bounce', 'unsubscribe', 'spam_complaint'
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocklist_email ON email_blocklist(email);

COMMENT ON TABLE email_blocklist IS 'Emails that should never receive outreach (bounces, unsubscribes, complaints)';

-- ============================================
-- EMAIL ENGAGEMENT TABLE (Event Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS email_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES outreach_campaigns(id),
  event_type TEXT NOT NULL, -- 'open', 'click', 'reply', 'bounce', 'unsubscribe', 'delivery_delayed'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_campaign ON email_engagement(campaign_id);
CREATE INDEX IF NOT EXISTS idx_engagement_type ON email_engagement(event_type);
CREATE INDEX IF NOT EXISTS idx_engagement_created ON email_engagement(created_at DESC);

COMMENT ON TABLE email_engagement IS 'Detailed tracking of all email engagement events';

-- ============================================
-- UPGRADE EMAIL_CONVERSATIONS TABLE
-- ============================================

-- Add columns for better conversation tracking
ALTER TABLE email_conversations
ADD COLUMN IF NOT EXISTS message_type TEXT, -- 'initial', 'follow_up_1', 'follow_up_2', 'follow_up_final', 'reply_response', 'booking_invitation'
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS in_reply_to UUID REFERENCES email_conversations(id);

-- ============================================
-- FOLLOW-UP SEQUENCES TABLE (Custom Sequences)
-- ============================================

CREATE TABLE IF NOT EXISTS followup_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  steps JSONB NOT NULL, -- Array of {delay_hours, type, subject_template}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default sequence
INSERT INTO followup_sequences (name, description, is_default, steps) VALUES
(
  'Default 3-Touch Sequence',
  'Standard follow-up: 3 days, 7 days, 14 days',
  true,
  '[
    {"delay_hours": 72, "type": "follow_up_1", "subject_template": "{firstName} - quick follow-up"},
    {"delay_hours": 168, "type": "follow_up_2", "subject_template": "One more thought for {company}"},
    {"delay_hours": 336, "type": "follow_up_final", "subject_template": "Last note - {company}"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE followup_sequences IS 'Configurable follow-up sequences for email automation';

-- ============================================
-- INDEXES FOR AUTONOMOUS EMAIL ENGINE
-- ============================================

-- For finding campaigns by recipient email
CREATE INDEX IF NOT EXISTS idx_campaigns_recipient ON outreach_campaigns(recipient_email);

-- For follow-up processing (campaigns needing follow-up)
CREATE INDEX IF NOT EXISTS idx_campaigns_followup ON outreach_campaigns(status, replied_at, bounced_at, unsubscribed_at);

-- For analytics
CREATE INDEX IF NOT EXISTS idx_campaigns_analytics ON outreach_campaigns(created_at, sent_at, opened_at, replied_at);

-- ============================================
-- HELPFUL VIEWS
-- ============================================

-- View for campaigns needing follow-up
CREATE OR REPLACE VIEW v_campaigns_pending_followup AS
SELECT *
FROM outreach_campaigns
WHERE status IN ('sent', 'follow_up_1', 'follow_up_2')
  AND replied_at IS NULL
  AND bounced_at IS NULL
  AND unsubscribed_at IS NULL;

-- View for email funnel metrics
CREATE OR REPLACE VIEW v_email_funnel AS
SELECT
  COUNT(*) as total_campaigns,
  COUNT(sent_at) as sent,
  COUNT(delivered_at) as delivered,
  COUNT(opened_at) as opened,
  COUNT(clicked_at) as clicked,
  COUNT(replied_at) as replied,
  COUNT(CASE WHEN status = 'meeting_scheduled' THEN 1 END) as meetings_booked,
  COUNT(bounced_at) as bounced,
  COUNT(unsubscribed_at) as unsubscribed
FROM outreach_campaigns
WHERE created_at > NOW() - INTERVAL '30 days';

COMMENT ON VIEW v_email_funnel IS 'Quick funnel metrics for the last 30 days';

-- ============================================
-- DONE
-- ============================================

SELECT 'Email engine database upgrade complete!' as status;
