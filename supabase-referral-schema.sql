-- Referral Tracking System Database Schema
-- Supports word-of-mouth growth and blogger partnerships

-- Referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true,
  total_signups INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0
);

CREATE INDEX idx_referral_codes_code ON referral_codes(referral_code);
CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);

-- Referrals table (tracks who referred who)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,
  referee_id TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'signed_up', -- signed_up, converted, churned
  referred_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  referee_email TEXT,
  first_purchase_amount NUMERIC(10,2),
  lifetime_value NUMERIC(10,2) DEFAULT 0,
  metadata JSONB
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON referrals(referee_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- User credits table (tracks referral rewards)
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL, -- referral_signup, referral_conversion, recurring_commission, blog_post, signup_bonus
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_user_credits_user ON user_credits(user_id);
CREATE INDEX idx_user_credits_type ON user_credits(type);

-- Blogger partnerships table
CREATE TABLE IF NOT EXISTS blogger_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  blog_url TEXT NOT NULL,
  audience_size INTEGER,
  niche TEXT,
  status TEXT DEFAULT 'active', -- active, paused, terminated
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  total_posts INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_commission NUMERIC(10,2) DEFAULT 0,
  metadata JSONB
);

CREATE INDEX idx_blogger_partnerships_user ON blogger_partnerships(user_id);
CREATE INDEX idx_blogger_partnerships_status ON blogger_partnerships(status);

-- Blog posts table (tracks blog posts about Unbound.team)
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blogger_id TEXT NOT NULL,
  post_url TEXT NOT NULL,
  post_title TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  bonus_paid NUMERIC(10,2) DEFAULT 0,
  metadata JSONB
);

CREATE INDEX idx_blog_posts_blogger ON blog_posts(blogger_id);

-- Web mentions table (tracks mentions of Unbound.team across the web)
CREATE TABLE IF NOT EXISTS web_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  source_type TEXT, -- blog, forum, social, news
  mention_text TEXT,
  sentiment TEXT, -- positive, neutral, negative
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  author TEXT,
  reach_estimate INTEGER,
  contacted BOOLEAN DEFAULT false,
  metadata JSONB
);

CREATE INDEX idx_web_mentions_type ON web_mentions(source_type);
CREATE INDEX idx_web_mentions_sentiment ON web_mentions(sentiment);
CREATE INDEX idx_web_mentions_discovered ON web_mentions(discovered_at);

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_title TEXT,
  testimonial_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  problem_solved TEXT,
  results_achieved TEXT,
  approved BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_testimonials_user ON testimonials(user_id);
CREATE INDEX idx_testimonials_approved ON testimonials(approved);
CREATE INDEX idx_testimonials_featured ON testimonials(featured);

-- Case studies table
CREATE TABLE IF NOT EXISTS case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  industry TEXT,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  results TEXT NOT NULL,
  metrics JSONB, -- {revenue_increase: 150, time_saved: 20, leads_generated: 100}
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  metadata JSONB
);

CREATE INDEX idx_case_studies_user ON case_studies(user_id);
CREATE INDEX idx_case_studies_published ON case_studies(published);

-- Functions

-- Increment blogger post count
CREATE OR REPLACE FUNCTION increment_blogger_posts(blogger_user_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE blogger_partnerships
  SET total_posts = total_posts + 1
  WHERE user_id = blogger_user_id;
END;
$$ LANGUAGE plpgsql;

-- Get user total credits
CREATE OR REPLACE FUNCTION get_user_total_credits(user_id_param TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount) FROM user_credits WHERE user_id = user_id_param),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- Calculate viral coefficient
CREATE OR REPLACE FUNCTION calculate_viral_coefficient()
RETURNS NUMERIC AS $$
DECLARE
  total_users INTEGER;
  total_conversions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM referral_codes;

  SELECT COUNT(*) INTO total_conversions
  FROM referrals
  WHERE status = 'converted';

  IF total_users = 0 THEN
    RETURN 0;
  END IF;

  RETURN total_conversions::NUMERIC / total_users::NUMERIC;
END;
$$ LANGUAGE plpgsql;

-- Outreach campaigns table
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche TEXT NOT NULL,
  blog_url TEXT NOT NULL,
  blog_title TEXT,
  contact_email TEXT,
  email_subject TEXT,
  email_body TEXT,
  status TEXT DEFAULT 'ready', -- ready, sent, interested, not_interested, partnership_started, no_response
  fit_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  response_notes TEXT,
  metadata JSONB
);

CREATE INDEX idx_outreach_campaigns_status ON outreach_campaigns(status);
CREATE INDEX idx_outreach_campaigns_niche ON outreach_campaigns(niche);
CREATE INDEX idx_outreach_campaigns_score ON outreach_campaigns(fit_score);

-- Testimonial requests table
CREATE TABLE IF NOT EXISTS testimonial_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- pending, completed, expired
  context JSONB,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_testimonial_requests_user ON testimonial_requests(user_id);
CREATE INDEX idx_testimonial_requests_status ON testimonial_requests(status);

-- Audience analysis table
CREATE TABLE IF NOT EXISTS audience_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,
  sources JSONB,
  interests JSONB,
  similar_audiences_count INTEGER DEFAULT 0,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_audience_analysis_referrer ON audience_analysis(referrer_id);

-- Discovered opportunities table
CREATE TABLE IF NOT EXISTS discovered_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  url TEXT,
  title TEXT,
  text TEXT,
  referrer_id TEXT,
  discovered_via TEXT, -- rss, forum, blog_comment, audience_analysis
  fit_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  engaged BOOLEAN DEFAULT false,
  metadata JSONB
);

CREATE INDEX idx_discovered_opportunities_referrer ON discovered_opportunities(referrer_id);
CREATE INDEX idx_discovered_opportunities_discovered_via ON discovered_opportunities(discovered_via);
CREATE INDEX idx_discovered_opportunities_engaged ON discovered_opportunities(engaged);

-- Case study conversions table
CREATE TABLE IF NOT EXISTS case_study_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_study_id UUID NOT NULL,
  converted_user_id TEXT NOT NULL,
  converted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_case_study_conversions_case_study ON case_study_conversions(case_study_id);

-- Solution results table (for tracking user solutions)
CREATE TABLE IF NOT EXISTS solution_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  solution_type TEXT NOT NULL, -- lead-generation, content-creation, market-research, etc.
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
  completed_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE INDEX idx_solution_results_user ON solution_results(user_id);
CREATE INDEX idx_solution_results_status ON solution_results(status);

-- Profiles table (user profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  title TEXT,
  company TEXT,
  industry TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Additional functions for case studies
CREATE OR REPLACE FUNCTION increment_case_study_views(case_study_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE case_studies
  SET views = views + 1
  WHERE id = case_study_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_case_study_conversions(case_study_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE case_studies
  SET conversions = conversions + 1
  WHERE id = case_study_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE referral_codes IS 'Unique referral codes for each user';
COMMENT ON TABLE referrals IS 'Tracks who referred who and conversion status';
COMMENT ON TABLE user_credits IS 'Tracks credits earned from referrals and bonuses';
COMMENT ON TABLE blogger_partnerships IS 'Tracks blogger partnerships for word-of-mouth growth';
COMMENT ON TABLE blog_posts IS 'Tracks blog posts mentioning Unbound.team';
COMMENT ON TABLE web_mentions IS 'Tracks mentions of Unbound.team across the web';
COMMENT ON TABLE testimonials IS 'User testimonials and reviews';
COMMENT ON TABLE case_studies IS 'Detailed case studies of successful users';
COMMENT ON TABLE outreach_campaigns IS 'Blogger outreach campaigns for partnerships';
