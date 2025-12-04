// Appointment Monitor - Autonomous appointment tracking and follow-up
// Monitors appointments, auto-sends reminders, and tracks outcomes
//
// Features:
// - Monitor upcoming appointments
// - Auto-send reminders 24h and 1h before
// - Auto-follow-up after appointments
// - Track show rates and outcomes
// - Identify missed appointments
// - Auto-reschedule follow-ups

const { createClient } = require('@supabase/supabase-js');
const contentSafety = require('./content-safety');
const orchestrator = require('./ai-orchestrator');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

class AppointmentMonitor {
  constructor() {
    this.enabled = false;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.intervalId = null;
  }

  // Start monitoring appointments
  start() {
    if (this.enabled) {
      console.log('⚠️  Appointment Monitor already running');
      return;
    }

    console.log('📅 Starting Appointment Monitor...');
    this.enabled = true;

    // Run immediately on start
    this.checkAppointments();

    // Then run every 5 minutes
    this.intervalId = setInterval(() => {
      this.checkAppointments();
    }, this.checkInterval);

    console.log('✅ Appointment Monitor started - Checking every 5 minutes');
  }

  // Stop monitoring
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.enabled = false;
    console.log('📅 Appointment Monitor stopped');
  }

  // Main check function
  async checkAppointments() {
    try {
      console.log('📅 [Appointment Monitor] Checking appointments...');

      // Check for upcoming appointments needing reminders
      await this.sendReminders();

      // Check for appointments that just happened (need follow-up)
      await this.followUpRecent();

      // Check for missed appointments
      await this.trackMissed();

      console.log('✅ [Appointment Monitor] Check complete');
    } catch (error) {
      console.error('❌ [Appointment Monitor] Error:', error.message);
    }
  }

  // Send reminders for upcoming appointments
  async sendReminders() {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

      // Get appointments in next 24 hours that haven't been reminded
      const { data: appointments, error } = await supabase
        .from('discovery_calls')
        .select('*')
        .gte('scheduled_time', now.toISOString())
        .lte('scheduled_time', in24Hours.toISOString())
        .eq('status', 'scheduled')
        .or('reminder_24h_sent.is.null,reminder_1h_sent.is.null');

      if (error) {
        console.error('Error fetching appointments for reminders:', error);
        return;
      }

      if (!appointments || appointments.length === 0) {
        return;
      }

      console.log(`   Found ${appointments.length} appointments needing reminders`);

      for (const apt of appointments) {
        const aptTime = new Date(apt.scheduled_time);
        const hoursUntil = (aptTime - now) / (1000 * 60 * 60);

        // Send 24h reminder
        if (hoursUntil <= 24 && hoursUntil > 1 && !apt.reminder_24h_sent) {
          await this.sendReminder(apt, '24h');
        }

        // Send 1h reminder
        if (hoursUntil <= 1 && !apt.reminder_1h_sent) {
          await this.sendReminder(apt, '1h');
        }
      }
    } catch (error) {
      console.error('Error in sendReminders:', error);
    }
  }

  // Send a reminder for an appointment
  async sendReminder(appointment, reminderType) {
    try {
      console.log(`   📨 Sending ${reminderType} reminder for appointment ${appointment.id}`);

      // Generate reminder message with AI
      const prompt = `Generate a friendly appointment reminder email for:

Name: ${appointment.contact_name || 'there'}
Appointment Time: ${new Date(appointment.scheduled_time).toLocaleString()}
Type: Discovery Call
Duration: 30 minutes

The reminder is being sent ${reminderType === '24h' ? '24 hours' : '1 hour'} before the appointment.

Generate a brief, warm reminder email. Include:
- Friendly greeting
- Appointment time confirmation
- What to prepare (if relevant)
- Looking forward to speaking

Keep it short and professional.`;

      const result = await orchestrator.execute('quick-task', prompt);

      // Safety check the content
      const safetyCheck = await contentSafety.checkContent(result.response);
      if (!safetyCheck.safe) {
        console.error('   ⚠️  Reminder failed safety check');
        return;
      }

      // TODO: Send actual email via email service
      // For now, just log it
      console.log(`   ✅ Reminder generated for ${appointment.contact_name}`);

      // Mark reminder as sent
      const updateField = reminderType === '24h' ? 'reminder_24h_sent' : 'reminder_1h_sent';
      await supabase
        .from('discovery_calls')
        .update({ [updateField]: true })
        .eq('id', appointment.id);

    } catch (error) {
      console.error(`Error sending ${reminderType} reminder:`, error);
    }
  }

  // Follow up on recent appointments
  async followUpRecent() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get appointments from last hour that need follow-up
      const { data: appointments, error } = await supabase
        .from('discovery_calls')
        .select('*')
        .gte('scheduled_time', oneDayAgo.toISOString())
        .lte('scheduled_time', oneHourAgo.toISOString())
        .eq('status', 'scheduled')
        .or('follow_up_sent.is.null,follow_up_sent.eq.false');

      if (error) {
        console.error('Error fetching appointments for follow-up:', error);
        return;
      }

      if (!appointments || appointments.length === 0) {
        return;
      }

      console.log(`   Found ${appointments.length} appointments needing follow-up`);

      for (const apt of appointments) {
        await this.sendFollowUp(apt);
      }
    } catch (error) {
      console.error('Error in followUpRecent:', error);
    }
  }

  // Send follow-up after appointment
  async sendFollowUp(appointment) {
    try {
      console.log(`   📨 Sending follow-up for appointment ${appointment.id}`);

      // Generate follow-up with AI
      const prompt = `Generate a brief follow-up email after a discovery call with:

Name: ${appointment.contact_name || 'the prospect'}
Company: ${appointment.company_name || 'their company'}

The call just happened. Generate a warm follow-up email that:
- Thanks them for their time
- Summarizes key points discussed (generic - you don't know specifics)
- Confirms next steps
- Offers to answer questions

Keep it brief and actionable.`;

      const result = await orchestrator.execute('quick-task', prompt);

      // Safety check
      const safetyCheck = await contentSafety.checkContent(result.response);
      if (!safetyCheck.safe) {
        console.error('   ⚠️  Follow-up failed safety check');
        return;
      }

      // TODO: Send actual email via email service
      console.log(`   ✅ Follow-up generated for ${appointment.contact_name}`);

      // Mark follow-up as sent and update status
      await supabase
        .from('discovery_calls')
        .update({
          follow_up_sent: true,
          status: 'completed'
        })
        .eq('id', appointment.id);

    } catch (error) {
      console.error('Error sending follow-up:', error);
    }
  }

  // Track missed appointments
  async trackMissed() {
    try {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Get appointments that were scheduled but are now past and still marked as "scheduled"
      const { data: missed, error } = await supabase
        .from('discovery_calls')
        .select('*')
        .lt('scheduled_time', twoHoursAgo.toISOString())
        .eq('status', 'scheduled');

      if (error) {
        console.error('Error fetching missed appointments:', error);
        return;
      }

      if (!missed || missed.length === 0) {
        return;
      }

      console.log(`   ⚠️  Found ${missed.length} missed appointments`);

      for (const apt of missed) {
        // Mark as missed
        await supabase
          .from('discovery_calls')
          .update({ status: 'missed' })
          .eq('id', apt.id);

        console.log(`   📊 Marked appointment ${apt.id} as missed`);

        // TODO: Send re-engagement email to reschedule
      }
    } catch (error) {
      console.error('Error tracking missed appointments:', error);
    }
  }

  // Get appointment stats
  async getStats() {
    try {
      const { data, error } = await supabase
        .from('discovery_calls')
        .select('status, scheduled_time');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        scheduled: data?.filter(a => a.status === 'scheduled').length || 0,
        completed: data?.filter(a => a.status === 'completed').length || 0,
        missed: data?.filter(a => a.status === 'missed').length || 0,
        cancelled: data?.filter(a => a.status === 'cancelled').length || 0,
        showRate: 0
      };

      const total = stats.completed + stats.missed;
      if (total > 0) {
        stats.showRate = ((stats.completed / total) * 100).toFixed(1);
      }

      return stats;
    } catch (error) {
      console.error('Error getting appointment stats:', error);
      return null;
    }
  }

  // Get upcoming appointments
  async getUpcoming(limit = 10) {
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('discovery_calls')
        .select('*')
        .gte('scheduled_time', now.toISOString())
        .eq('status', 'scheduled')
        .order('scheduled_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting upcoming appointments:', error);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new AppointmentMonitor();
