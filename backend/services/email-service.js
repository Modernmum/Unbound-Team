// ============================================================================
// EMAIL SERVICE - Resend Integration
// ============================================================================
// Handles all email sending for matchmaking introductions
// Uses Resend API for reliable email delivery
// ============================================================================

const axios = require('axios');

class EmailService {
  constructor() {
    this.resendApiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'intro@maggieforbes.com';
    this.apiUrl = 'https://api.resend.com/emails';
  }

  // ============================================================================
  // MAIN: Send Introduction Email
  // ============================================================================

  async sendIntroduction(params) {
    const {
      needPerson,      // { name, email, company, problem }
      providerPerson,  // { name, email, company, expertise }
      matchReasoning,  // Why this is a good match
      matchId          // For tracking
    } = params;

    console.log(`📧 Sending introduction: ${needPerson.name} ↔ ${providerPerson.name}`);

    // Generate email content
    const { subject, htmlBody, textBody } = this.generateIntroEmail(
      needPerson,
      providerPerson,
      matchReasoning
    );

    // Send via Resend
    const result = await this.sendEmail({
      to: [needPerson.email, providerPerson.email],
      from: this.fromEmail,
      subject: subject,
      html: htmlBody,
      text: textBody,
      tags: [
        { name: 'type', value: 'introduction' },
        { name: 'match_id', value: matchId }
      ]
    });

    return result;
  }

  // ============================================================================
  // GENERATE: Warm Introduction Email Template
  // ============================================================================

  generateIntroEmail(needPerson, providerPerson, matchReasoning) {
    const subject = `Introduction: ${needPerson.name} ↔ ${providerPerson.name}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    .intro-box {
      background: #f5f5f5;
      padding: 20px;
      border-left: 4px solid #000;
      margin: 20px 0;
    }
    .person {
      margin: 15px 0;
      padding: 15px;
      background: white;
      border-radius: 8px;
    }
    .person-name {
      font-weight: 600;
      font-size: 16px;
      color: #000;
    }
    .person-company {
      color: #666;
      font-size: 14px;
    }
    .cta {
      background: #000;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      display: inline-block;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Introduction from Maggie Forbes Strategies</h2>
  </div>

  <p>Hi ${needPerson.name} and ${providerPerson.name},</p>

  <p>I'm making this introduction because I think you should meet.</p>

  <div class="intro-box">
    <p><strong>Why this connection:</strong></p>
    <p>${matchReasoning}</p>
  </div>

  <div class="person">
    <div class="person-name">${needPerson.name}</div>
    <div class="person-company">${needPerson.company || ''}</div>
    <p>${needPerson.problem || ''}</p>
  </div>

  <div class="person">
    <div class="person-name">${providerPerson.name}</div>
    <div class="person-company">${providerPerson.company || ''}</div>
    <p>${providerPerson.expertise || ''}</p>
  </div>

  <p><strong>Next steps:</strong></p>
  <p>I'll leave it to you both to take it from here. Feel free to reply-all to this email or connect directly.</p>

  <p>${needPerson.name}, feel free to reach out to ${providerPerson.name} at ${providerPerson.email}</p>
  <p>${providerPerson.name}, you can reach ${needPerson.name} at ${needPerson.email}</p>

  <p>Best of luck with the conversation!</p>

  <div class="footer">
    <p>Maggie Forbes Strategies</p>
    <p>Connecting companies with solutions since 2025</p>
  </div>
</body>
</html>
    `.trim();

    const textBody = `
Hi ${needPerson.name} and ${providerPerson.name},

I'm making this introduction because I think you should meet.

WHY THIS CONNECTION:
${matchReasoning}

${needPerson.name} - ${needPerson.company || ''}
${needPerson.problem || ''}

${providerPerson.name} - ${providerPerson.company || ''}
${providerPerson.expertise || ''}

NEXT STEPS:
I'll leave it to you both to take it from here. Feel free to reply-all to this email or connect directly.

${needPerson.name}, feel free to reach out to ${providerPerson.name} at ${providerPerson.email}
${providerPerson.name}, you can reach ${needPerson.name} at ${needPerson.email}

Best of luck with the conversation!

---
Maggie Forbes Strategies
Connecting companies with solutions since 2025
    `.trim();

    return { subject, htmlBody, textBody };
  }

  // ============================================================================
  // SEND: Email via Resend API
  // ============================================================================

  async sendEmail({ to, from, subject, html, text, tags = [] }) {
    if (!this.resendApiKey || this.resendApiKey === 'your_resend_api_key_here') {
      console.error('❌ RESEND_API_KEY not configured');
      throw new Error('Resend API key not configured');
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          from: from || this.fromEmail,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
          text,
          tags
        },
        {
          headers: {
            'Authorization': `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Email sent via Resend: ${response.data.id}`);

      return {
        success: true,
        resendId: response.data.id,
        to,
        subject,
        sentAt: new Date()
      };

    } catch (error) {
      console.error('❌ Resend API error:', error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // ============================================================================
  // FOLLOW-UP: Send follow-up email after introduction
  // ============================================================================

  async sendFollowUp(params) {
    const {
      needPerson,
      providerPerson,
      introductionId,
      daysSinceIntro
    } = params;

    const subject = `Following up: ${needPerson.name} ↔ ${providerPerson.name}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <p>Hi ${needPerson.name} and ${providerPerson.name},</p>

  <p>I wanted to follow up on my introduction from ${daysSinceIntro} days ago.</p>

  <p>Have you had a chance to connect?</p>

  <p>If you haven't connected yet, no pressure - but if this is still relevant, I'd encourage you to reach out to each other.</p>

  <p>Let me know if I can help facilitate in any way.</p>

  <p>Best,<br>Maggie Forbes Strategies</p>
</body>
</html>
    `.trim();

    const textBody = `
Hi ${needPerson.name} and ${providerPerson.name},

I wanted to follow up on my introduction from ${daysSinceIntro} days ago.

Have you had a chance to connect?

If you haven't connected yet, no pressure - but if this is still relevant, I'd encourage you to reach out to each other.

Let me know if I can help facilitate in any way.

Best,
Maggie Forbes Strategies
    `.trim();

    return await this.sendEmail({
      to: [needPerson.email, providerPerson.email],
      from: this.fromEmail,
      subject,
      html: htmlBody,
      text: textBody,
      tags: [
        { name: 'type', value: 'follow_up' },
        { name: 'introduction_id', value: introductionId }
      ]
    });
  }

  // ============================================================================
  // NOTIFICATION: Internal notification when match is made
  // ============================================================================

  async sendInternalNotification(params) {
    const { matchId, needPerson, providerPerson, fitScore, expectedFee } = params;

    const subject = `💰 New Match: ${fitScore}/10 fit - $${expectedFee.toLocaleString()} potential`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<body>
  <h2>🎯 New Match Created</h2>

  <p><strong>Fit Score:</strong> ${fitScore}/10</p>
  <p><strong>Expected Fee:</strong> $${expectedFee.toLocaleString()}</p>

  <h3>Need:</h3>
  <p>${needPerson.name} (${needPerson.company})</p>
  <p>${needPerson.problem}</p>

  <h3>Provider:</h3>
  <p>${providerPerson.name} (${providerPerson.company})</p>
  <p>${providerPerson.expertise}</p>

  <p><a href="http://localhost:3001/admin/matches/${matchId}">View Match</a></p>
</body>
</html>
    `.trim();

    // Send to yourself (internal notification)
    return await this.sendEmail({
      to: this.fromEmail, // Send to yourself
      from: this.fromEmail,
      subject,
      html: htmlBody,
      tags: [
        { name: 'type', value: 'internal_notification' },
        { name: 'match_id', value: matchId }
      ]
    });
  }

  // ============================================================================
  // TEST: Send test email
  // ============================================================================

  async sendTestEmail(toEmail) {
    return await this.sendEmail({
      to: toEmail,
      from: this.fromEmail,
      subject: 'Test Email from Maggie Forbes Strategies',
      html: '<h1>Test Email</h1><p>If you received this, Resend is working!</p>',
      text: 'Test Email\n\nIf you received this, Resend is working!',
      tags: [{ name: 'type', value: 'test' }]
    });
  }
}

module.exports = new EmailService();
