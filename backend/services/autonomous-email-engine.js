/**
 * Autonomous Email Engine
 *
 * The brain that makes email outreach 100% autonomous:
 * - Receives and processes email events (opens, clicks, replies, bounces)
 * - Runs follow-up sequences automatically
 * - Handles reply classification and auto-response
 * - Moves leads through the booking funnel
 * - Tracks everything for optimization
 */

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const crypto = require('crypto');
const AIConversationHandler = require('./ai-conversation-handler');
const AutoBooking = require('./auto-booking');

class AutonomousEmailEngine {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'maggie@maggieforbesstrategies.com';
    this.senderName = process.env.SENDER_NAME || 'Maggie Forbes';
    this.webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Initialize sub-services
    this.conversationHandler = new AIConversationHandler();
    this.autoBooking = new AutoBooking();

    // Tracking base URL (your production domain)
    this.trackingBaseUrl = process.env.TRACKING_BASE_URL || 'https://web-production-486cb.up.railway.app';

    // Calendly link for booking
    this.calendlyLink = process.env.CALENDLY_LINK || 'https://calendly.com/maggieforbes/discovery';

    // Follow-up sequence configuration (in hours)
    this.defaultSequence = [
      { delay: 72, type: 'follow_up_1', subject: 'Quick follow-up' },      // 3 days
      { delay: 168, type: 'follow_up_2', subject: 'One more thought' },    // 7 days
      { delay: 336, type: 'follow_up_final', subject: 'Last note' }        // 14 days
    ];

    // Track running state
    this.running = false;
    this.stats = {
      emailsSent: 0,
      repliesProcessed: 0,
      bookingsTriggered: 0,
      followUpsSent: 0
    };
  }

  // ============================================
  // WEBHOOK HANDLING
  // ============================================

  /**
   * Verify Resend webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      console.warn('⚠️ RESEND_WEBHOOK_SECRET not set - skipping verification');
      return true;
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  /**
   * Process incoming webhook from Resend
   */
  async processWebhook(event) {
    console.log(`\n📬 Email Event: ${event.type}`);

    try {
      switch (event.type) {
        case 'email.sent':
          await this.handleEmailSent(event.data);
          break;

        case 'email.delivered':
          await this.handleEmailDelivered(event.data);
          break;

        case 'email.opened':
          await this.handleEmailOpened(event.data);
          break;

        case 'email.clicked':
          await this.handleEmailClicked(event.data);
          break;

        case 'email.bounced':
          await this.handleEmailBounced(event.data);
          break;

        case 'email.complained':
          await this.handleEmailComplained(event.data);
          break;

        case 'email.delivery_delayed':
          await this.handleDeliveryDelayed(event.data);
          break;

        default:
          console.log(`   Unknown event type: ${event.type}`);
      }

      return { processed: true, type: event.type };

    } catch (error) {
      console.error(`❌ Error processing webhook:`, error);
      throw error;
    }
  }

  /**
   * Handle email sent event
   */
  async handleEmailSent(data) {
    const { email_id, to, subject } = data;
    console.log(`   📤 Sent to ${to}: "${subject}"`);

    // Find campaign by recipient email
    const campaign = await this.findCampaignByEmail(to);
    if (campaign) {
      await this.updateCampaign(campaign.id, {
        resend_email_id: email_id,
        sent_at: new Date().toISOString(),
        status: 'sent'
      });
    }
  }

  /**
   * Handle email delivered event
   */
  async handleEmailDelivered(data) {
    const { email_id, to } = data;
    console.log(`   ✅ Delivered to ${to}`);

    const campaign = await this.findCampaignByEmail(to);
    if (campaign) {
      await this.updateCampaign(campaign.id, {
        delivered_at: new Date().toISOString()
      });
    }
  }

  /**
   * Handle email opened event
   */
  async handleEmailOpened(data) {
    const { email_id, to } = data;
    console.log(`   👁️ Opened by ${to}`);

    const campaign = await this.findCampaignByEmail(to);
    if (campaign) {
      // Only update first open
      if (!campaign.opened_at) {
        await this.updateCampaign(campaign.id, {
          opened_at: new Date().toISOString(),
          open_count: (campaign.open_count || 0) + 1
        });

        // Log engagement
        await this.logEngagement(campaign.id, 'open', { email_id });
      } else {
        // Increment open count for subsequent opens
        await this.updateCampaign(campaign.id, {
          open_count: (campaign.open_count || 0) + 1
        });
      }
    }
  }

  /**
   * Handle email clicked event
   */
  async handleEmailClicked(data) {
    const { email_id, to, link } = data;
    console.log(`   🖱️ Click by ${to}: ${link}`);

    const campaign = await this.findCampaignByEmail(to);
    if (campaign) {
      await this.updateCampaign(campaign.id, {
        clicked_at: new Date().toISOString(),
        click_count: (campaign.click_count || 0) + 1
      });

      await this.logEngagement(campaign.id, 'click', { email_id, link });

      // If they clicked the calendar link, mark as hot lead
      if (link && link.includes('calendly')) {
        await this.updateCampaign(campaign.id, {
          status: 'booking',
          calendly_clicked_at: new Date().toISOString()
        });
        console.log(`   🔥 Hot lead! Clicked Calendly link`);
      }
    }
  }

  /**
   * Handle email bounced event
   */
  async handleEmailBounced(data) {
    const { email_id, to, bounce } = data;
    console.log(`   ❌ Bounced: ${to} - ${bounce?.message || 'Unknown reason'}`);

    const campaign = await this.findCampaignByEmail(to);
    if (campaign) {
      await this.updateCampaign(campaign.id, {
        status: 'bounced',
        bounced_at: new Date().toISOString(),
        bounce_reason: bounce?.message || 'Unknown'
      });

      // Add to bounce list to prevent future sends
      await this.addToBounceList(to, bounce?.message);
    }
  }

  /**
   * Handle spam complaint
   */
  async handleEmailComplained(data) {
    const { email_id, to } = data;
    console.log(`   🚫 Spam complaint from ${to}`);

    const campaign = await this.findCampaignByEmail(to);
    if (campaign) {
      await this.updateCampaign(campaign.id, {
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        unsubscribe_reason: 'spam_complaint'
      });
    }

    // Add to unsubscribe list
    await this.addToUnsubscribeList(to, 'spam_complaint');
  }

  /**
   * Handle delivery delay
   */
  async handleDeliveryDelayed(data) {
    const { email_id, to } = data;
    console.log(`   ⏳ Delivery delayed to ${to}`);

    const campaign = await this.findCampaignByEmail(to);
    if (campaign) {
      await this.logEngagement(campaign.id, 'delivery_delayed', { email_id });
    }
  }

  // ============================================
  // REPLY HANDLING (INBOUND EMAIL PROCESSING)
  // ============================================

  /**
   * Process an incoming email reply
   * This is called when we receive a reply via webhook or inbox monitoring
   */
  async processIncomingReply(inboundEmail) {
    const { from, to, subject, text, html, headers } = inboundEmail;

    console.log(`\n📨 INCOMING REPLY from ${from}`);
    console.log(`   Subject: ${subject}`);

    try {
      // Extract sender email
      const senderEmail = this.extractEmail(from);

      // Find the campaign this is replying to
      const campaign = await this.findCampaignByEmail(senderEmail);

      if (!campaign) {
        console.log(`   ⚠️ No campaign found for ${senderEmail}`);
        return { processed: false, reason: 'no_campaign_found' };
      }

      console.log(`   Found campaign: ${campaign.id} (${campaign.company_name})`);

      // Clean the reply text (remove quoted content)
      const cleanedReply = this.cleanReplyText(text || this.htmlToText(html));

      // Update campaign with reply timestamp
      await this.updateCampaign(campaign.id, {
        replied_at: new Date().toISOString(),
        status: 'replied',
        last_reply_text: cleanedReply
      });

      // Process with AI conversation handler
      const result = await this.conversationHandler.handleReply(
        campaign.id,
        cleanedReply,
        { from: senderEmail, subject, receivedAt: new Date().toISOString() }
      );

      this.stats.repliesProcessed++;

      // Take action based on classification
      await this.handleClassifiedReply(campaign, result);

      return {
        processed: true,
        campaignId: campaign.id,
        classification: result.classification,
        action: result.action
      };

    } catch (error) {
      console.error('❌ Error processing reply:', error);
      throw error;
    }
  }

  /**
   * Handle a classified reply - take appropriate action
   */
  async handleClassifiedReply(campaign, classificationResult) {
    const { classification, response, action } = classificationResult;

    console.log(`   Intent: ${classification.intent}`);
    console.log(`   Action: ${action}`);

    switch (action) {
      case 'send_response_and_monitor':
      case 'send_response_and_nurture':
        // Send AI-generated response
        if (response) {
          await this.sendFollowUpEmail(campaign, response, 'reply_response');
        }
        break;

      case 'send_calendar_link':
        // Send booking email with Calendly link
        await this.sendBookingEmail(campaign);
        this.stats.bookingsTriggered++;
        break;

      case 'mark_closed':
        // Already marked as closed_lost in conversation handler
        console.log(`   Lead closed: ${campaign.company_name}`);
        break;

      case 'remove_from_list':
        await this.addToUnsubscribeList(campaign.recipient_email, 'requested');
        break;

      case 'wait_and_retry':
        // OOO - schedule retry for later
        await this.scheduleRetry(campaign.id, 72); // Retry in 3 days
        break;

      case 'flag_for_human_review':
        await this.flagForReview(campaign.id, 'unclear_reply');
        break;
    }
  }

  // ============================================
  // FOLLOW-UP SEQUENCER
  // ============================================

  /**
   * Run the follow-up sequence processor
   * Should be called periodically (e.g., every hour)
   */
  async processFollowUpQueue() {
    console.log('\n⏰ Processing follow-up queue...');

    try {
      // Get campaigns that need follow-ups
      const { data: campaigns, error } = await this.supabase
        .from('outreach_campaigns')
        .select('*')
        .in('status', ['sent', 'follow_up_1', 'follow_up_2'])
        .is('replied_at', null)
        .is('bounced_at', null)
        .is('unsubscribed_at', null);

      if (error) throw error;

      let followUpsSent = 0;

      for (const campaign of campaigns || []) {
        const shouldFollowUp = await this.shouldSendFollowUp(campaign);

        if (shouldFollowUp) {
          await this.sendNextFollowUp(campaign);
          followUpsSent++;

          // Rate limit: 10 seconds between follow-ups
          await this.delay(10000);
        }
      }

      console.log(`✅ Follow-ups processed: ${followUpsSent} sent`);
      this.stats.followUpsSent += followUpsSent;

      return followUpsSent;

    } catch (error) {
      console.error('❌ Error processing follow-ups:', error);
      throw error;
    }
  }

  /**
   * Check if we should send a follow-up for this campaign
   */
  async shouldSendFollowUp(campaign) {
    const now = new Date();
    const sentAt = new Date(campaign.sent_at || campaign.created_at);
    const hoursSinceSent = (now - sentAt) / (1000 * 60 * 60);

    // Get current position in sequence
    const currentStep = this.getCurrentSequenceStep(campaign.status);
    const nextStep = this.defaultSequence[currentStep];

    if (!nextStep) {
      // Sequence complete
      return false;
    }

    // Check if enough time has passed
    const lastFollowUp = campaign.last_followup_at
      ? new Date(campaign.last_followup_at)
      : sentAt;
    const hoursSinceLastTouch = (now - lastFollowUp) / (1000 * 60 * 60);

    // Calculate hours needed for next step
    const hoursNeeded = currentStep === 0
      ? nextStep.delay
      : nextStep.delay - (this.defaultSequence[currentStep - 1]?.delay || 0);

    return hoursSinceLastTouch >= hoursNeeded;
  }

  /**
   * Get current sequence step from status
   */
  getCurrentSequenceStep(status) {
    switch (status) {
      case 'sent': return 0;
      case 'follow_up_1': return 1;
      case 'follow_up_2': return 2;
      default: return 3; // Sequence complete
    }
  }

  /**
   * Send the next follow-up in the sequence
   */
  async sendNextFollowUp(campaign) {
    const currentStep = this.getCurrentSequenceStep(campaign.status);
    const nextStep = this.defaultSequence[currentStep];

    if (!nextStep) return;

    console.log(`   📧 Sending ${nextStep.type} to ${campaign.company_name}`);

    // Generate follow-up content
    const followUpContent = await this.generateFollowUpEmail(campaign, nextStep);

    // Send the email
    await this.sendEmail(
      campaign.recipient_email,
      followUpContent.subject,
      followUpContent.body,
      campaign.id
    );

    // Update campaign status
    await this.updateCampaign(campaign.id, {
      status: nextStep.type,
      last_followup_at: new Date().toISOString(),
      followup_count: (campaign.followup_count || 0) + 1
    });

    // Store in conversation history
    await this.storeOutgoingEmail(campaign.id, followUpContent, nextStep.type);
  }

  /**
   * Generate follow-up email content
   */
  async generateFollowUpEmail(campaign, step) {
    const firstName = campaign.contact_name
      ? campaign.contact_name.split(' ')[0]
      : '';
    const company = campaign.company_name;

    // Different follow-up templates based on step
    const templates = {
      follow_up_1: {
        subject: `${firstName || company} - quick follow-up`,
        body: `Hi${firstName ? ' ' + firstName : ''},

I wanted to circle back on my previous note about ${company}.

I know things get busy, so I'll keep this brief: if you're still thinking about how to reduce your dependency on the business while maintaining growth, I'd love to chat.

Even a 15-minute call could be valuable to explore if there's a fit.

${this.calendlyLink}

Best,
${this.senderName}`
      },

      follow_up_2: {
        subject: `One more thought for ${company}`,
        body: `Hi${firstName ? ' ' + firstName : ''},

I've been thinking about ${company} and wanted to share one quick observation.

Many founders at your stage have built something valuable but find themselves as the bottleneck for key decisions. The business works, but it can't scale without you.

If that resonates, I've helped several businesses like yours build the leadership layer and systems to grow without adding chaos.

Worth a quick conversation?

${this.calendlyLink}

${this.senderName}`
      },

      follow_up_final: {
        subject: `Last note - ${company}`,
        body: `Hi${firstName ? ' ' + firstName : ''},

I'll keep this short - this will be my last follow-up.

If building a business that can thrive without your daily involvement isn't a priority right now, I completely understand.

But if it is something you're thinking about, even down the road, I'm happy to be a resource.

Either way, I wish you continued success with ${company}.

Best,
${this.senderName}

P.S. My calendar is always open if you want to chat: ${this.calendlyLink}`
      }
    };

    return templates[step.type] || templates.follow_up_1;
  }

  // ============================================
  // EMAIL SENDING WITH TRACKING
  // ============================================

  /**
   * Send an email with tracking
   */
  async sendEmail(to, subject, body, campaignId = null) {
    // Check if on unsubscribe/bounce list
    const isBlocked = await this.isEmailBlocked(to);
    if (isBlocked) {
      console.log(`   ⚠️ Email blocked (unsubscribed/bounced): ${to}`);
      return { sent: false, reason: 'blocked' };
    }

    // Add tracking pixel and wrap links
    const trackedBody = this.addTracking(body, campaignId);

    // Add unsubscribe header
    const unsubscribeUrl = `${this.trackingBaseUrl}/api/unsubscribe/${encodeURIComponent(to)}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.senderName} <${this.fromEmail}>`,
        to: to,
        subject: subject,
        text: body, // Plain text version
        html: trackedBody.replace(/\n/g, '<br>'),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      });

      if (error) {
        console.error(`   ❌ Send failed: ${error.message}`);
        return { sent: false, error: error.message };
      }

      console.log(`   ✅ Email sent: ${data.id}`);
      this.stats.emailsSent++;

      return { sent: true, emailId: data.id };

    } catch (error) {
      console.error(`   ❌ Send error:`, error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Send booking email with Calendly link
   */
  async sendBookingEmail(campaign) {
    const firstName = campaign.contact_name
      ? campaign.contact_name.split(' ')[0]
      : '';

    const subject = `Let's find a time to chat, ${firstName || campaign.company_name}`;

    const body = `Hi${firstName ? ' ' + firstName : ''},

Great to hear back from you! I'd love to learn more about what you're building at ${campaign.company_name}.

Here's my calendar - pick any time that works for you:

${this.calendlyLink}

The call will be quick (15-20 minutes) and focused on understanding your specific situation.

Looking forward to it!

${this.senderName}`;

    await this.sendEmail(campaign.recipient_email, subject, body, campaign.id);

    await this.updateCampaign(campaign.id, {
      status: 'booking_sent',
      booking_email_sent_at: new Date().toISOString()
    });
  }

  /**
   * Send a follow-up response to a reply
   */
  async sendFollowUpEmail(campaign, responseText, type) {
    // Replace calendar link placeholder if present
    const body = responseText.replace('[CALENDAR_LINK]', this.calendlyLink);

    const subject = `Re: ${campaign.subject || campaign.company_name}`;

    await this.sendEmail(campaign.recipient_email, subject, body, campaign.id);

    await this.storeOutgoingEmail(campaign.id, { subject, body }, type);
  }

  /**
   * Add tracking to email body
   */
  addTracking(body, campaignId) {
    if (!campaignId) return body;

    // Add tracking pixel at the end
    const trackingPixel = `<img src="${this.trackingBaseUrl}/api/track/open/${campaignId}" width="1" height="1" style="display:none;" alt="" />`;

    // Wrap links for click tracking (except calendly - we track that via webhook)
    const trackedBody = body.replace(
      /(https?:\/\/[^\s<>"]+)/g,
      (match) => {
        // Don't wrap tracking URLs or Calendly (we want direct booking)
        if (match.includes('/api/track') || match.includes('calendly')) {
          return match;
        }
        return `${this.trackingBaseUrl}/api/track/click/${campaignId}?url=${encodeURIComponent(match)}`;
      }
    );

    return trackedBody + trackingPixel;
  }

  // ============================================
  // TRACKING ENDPOINTS HANDLERS
  // ============================================

  /**
   * Handle open tracking pixel request
   */
  async trackOpen(campaignId) {
    console.log(`👁️ Open tracked: ${campaignId}`);

    const { data: campaign } = await this.supabase
      .from('outreach_campaigns')
      .select('opened_at, open_count')
      .eq('id', campaignId)
      .single();

    if (campaign) {
      const updates = { open_count: (campaign.open_count || 0) + 1 };
      if (!campaign.opened_at) {
        updates.opened_at = new Date().toISOString();
      }
      await this.updateCampaign(campaignId, updates);
      await this.logEngagement(campaignId, 'open', { source: 'pixel' });
    }

    // Return 1x1 transparent GIF
    return Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  }

  /**
   * Handle click tracking and redirect
   */
  async trackClick(campaignId, targetUrl) {
    console.log(`🖱️ Click tracked: ${campaignId} -> ${targetUrl}`);

    const { data: campaign } = await this.supabase
      .from('outreach_campaigns')
      .select('clicked_at, click_count')
      .eq('id', campaignId)
      .single();

    if (campaign) {
      const updates = { click_count: (campaign.click_count || 0) + 1 };
      if (!campaign.clicked_at) {
        updates.clicked_at = new Date().toISOString();
      }
      await this.updateCampaign(campaignId, updates);
      await this.logEngagement(campaignId, 'click', { url: targetUrl });
    }

    return targetUrl;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Find campaign by recipient email
   */
  async findCampaignByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await this.supabase
      .from('outreach_campaigns')
      .select('*')
      .eq('recipient_email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding campaign:', error);
    }

    return data;
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId, updates) {
    const { error } = await this.supabase
      .from('outreach_campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', campaignId);

    if (error) {
      console.error('Error updating campaign:', error);
    }
  }

  /**
   * Log engagement event
   */
  async logEngagement(campaignId, eventType, metadata = {}) {
    await this.supabase
      .from('email_engagement')
      .insert({
        campaign_id: campaignId,
        event_type: eventType,
        metadata: metadata,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Store outgoing email in conversation history
   */
  async storeOutgoingEmail(campaignId, email, type) {
    await this.supabase
      .from('email_conversations')
      .insert({
        campaign_id: campaignId,
        direction: 'outgoing',
        message_type: type,
        subject: email.subject,
        message_content: email.body,
        sent_at: new Date().toISOString()
      });
  }

  /**
   * Check if email is blocked
   */
  async isEmailBlocked(email) {
    const { data } = await this.supabase
      .from('email_blocklist')
      .select('id')
      .eq('email', email.toLowerCase())
      .limit(1);

    return data && data.length > 0;
  }

  /**
   * Add to bounce list
   */
  async addToBounceList(email, reason) {
    await this.supabase
      .from('email_blocklist')
      .upsert({
        email: email.toLowerCase(),
        reason: 'bounce',
        details: reason,
        created_at: new Date().toISOString()
      }, { onConflict: 'email' });
  }

  /**
   * Add to unsubscribe list
   */
  async addToUnsubscribeList(email, reason) {
    await this.supabase
      .from('email_blocklist')
      .upsert({
        email: email.toLowerCase(),
        reason: 'unsubscribe',
        details: reason,
        created_at: new Date().toISOString()
      }, { onConflict: 'email' });
  }

  /**
   * Schedule a retry
   */
  async scheduleRetry(campaignId, hoursDelay) {
    const retryAt = new Date(Date.now() + hoursDelay * 60 * 60 * 1000);

    await this.updateCampaign(campaignId, {
      retry_scheduled_at: retryAt.toISOString(),
      status: 'retry_scheduled'
    });
  }

  /**
   * Flag for human review
   */
  async flagForReview(campaignId, reason) {
    await this.updateCampaign(campaignId, {
      needs_review: true,
      review_reason: reason,
      flagged_at: new Date().toISOString()
    });
  }

  /**
   * Extract email from "Name <email>" format
   */
  extractEmail(fromString) {
    const match = fromString.match(/<([^>]+)>/);
    return match ? match[1].toLowerCase() : fromString.toLowerCase();
  }

  /**
   * Clean reply text (remove quoted content)
   */
  cleanReplyText(text) {
    if (!text) return '';

    // Remove common reply patterns
    const patterns = [
      /On .* wrote:/gi,
      /From:.*\nSent:.*\nTo:.*\nSubject:.*/gi,
      /_{5,}/g,
      /-{5,}/g,
      />{1,}.*/gm,
      /\n\n>.*$/s
    ];

    let cleaned = text;
    for (const pattern of patterns) {
      const match = cleaned.search(pattern);
      if (match > 0) {
        cleaned = cleaned.substring(0, match);
      }
    }

    return cleaned.trim();
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // STATISTICS & MONITORING
  // ============================================

  /**
   * Get engine stats
   */
  getStats() {
    return {
      ...this.stats,
      running: this.running
    };
  }

  /**
   * Get comprehensive email analytics
   */
  async getAnalytics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: campaigns } = await this.supabase
      .from('outreach_campaigns')
      .select('*')
      .gte('created_at', since);

    if (!campaigns) return null;

    const total = campaigns.length;
    const sent = campaigns.filter(c => c.sent_at).length;
    const delivered = campaigns.filter(c => c.delivered_at).length;
    const opened = campaigns.filter(c => c.opened_at).length;
    const clicked = campaigns.filter(c => c.clicked_at).length;
    const replied = campaigns.filter(c => c.replied_at).length;
    const booked = campaigns.filter(c => c.status === 'meeting_scheduled').length;
    const bounced = campaigns.filter(c => c.bounced_at).length;

    return {
      period: `${days} days`,
      total,
      sent,
      delivered,
      opened,
      clicked,
      replied,
      booked,
      bounced,
      rates: {
        deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) + '%' : '0%',
        openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(1) + '%' : '0%',
        clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) + '%' : '0%',
        replyRate: delivered > 0 ? ((replied / delivered) * 100).toFixed(1) + '%' : '0%',
        bookingRate: replied > 0 ? ((booked / replied) * 100).toFixed(1) + '%' : '0%',
        bounceRate: sent > 0 ? ((bounced / sent) * 100).toFixed(1) + '%' : '0%'
      }
    };
  }

  // ============================================
  // AUTONOMOUS RUNNER
  // ============================================

  /**
   * Start the autonomous email engine
   */
  async start() {
    console.log('\n🚀 AUTONOMOUS EMAIL ENGINE STARTING...');
    console.log('=' .repeat(50));
    this.running = true;

    // Process follow-ups immediately
    await this.processFollowUpQueue();

    // Then run every hour
    this.followUpInterval = setInterval(async () => {
      if (this.running) {
        await this.processFollowUpQueue();
      }
    }, 60 * 60 * 1000); // Every hour

    console.log('✅ Engine started - processing follow-ups every hour');
    console.log('=' .repeat(50));
  }

  /**
   * Stop the engine
   */
  stop() {
    console.log('\n🛑 AUTONOMOUS EMAIL ENGINE STOPPING...');
    this.running = false;

    if (this.followUpInterval) {
      clearInterval(this.followUpInterval);
    }

    console.log('Final stats:', this.getStats());
  }
}

module.exports = AutonomousEmailEngine;
