// Reminder / notification status command for TACTIOPBOT_WHA.
// Shows the verified sender's notification subscription status and,
// for admins, the scheduler status.
// Distinguishes "subscribed" from "automatic delivery is live" — no schedule
// or recurring outbound delivery is active unless REMINDER_ENABLED is true
// and Meta templates are approved.

const { getSubscription } = require('../services/notificationService');
const { getLanguage } = require('../services/notificationLanguages');
const { getSchedulerStatus } = require('../services/reminderScheduler');
const { getDeliveryStats } = require('../services/reminderDelivery');

module.exports = {
  name: 'reminderstatus',
  description: 'Show your Clan Mission notification subscription status',
  async run(context) {
    const sender = context && context.from;
    const adminNumbers = context && context.adminNumbers;

    if (!sender || typeof sender !== 'string') {
      return 'Unable to identify your WhatsApp sender ID. Please try again.';
    }

    const subscription = await getSubscription(sender);
    const lang = getLanguage(subscription ? (subscription.language || 'English') : 'English');

    const lines = ['*Clan Mission Notification Status*', ''];

    if (!subscription) {
      lines.push(lang.noSubscription);
      lines.push('Send `!setcmnotif` to subscribe.');
    } else {
      const enabledText = subscription.enabled ? lang.subscribedEnabled : lang.subscribedDisabled;
      lines.push(`Subscribed: Yes`);
      lines.push(`Notifications: ${subscription.enabled ? 'Enabled' : 'Disabled'}`);
      lines.push(`Language: ${subscription.language || 'English'}`);
    }

    lines.push('');
    lines.push(lang.deliveryNotActive);

    // Admin-only scheduler status.
    if (adminNumbers && Array.isArray(adminNumbers) && adminNumbers.includes(sender)) {
      const schedulerStatus = getSchedulerStatus();
      const statsResult = await getDeliveryStats();

      lines.push('');
      lines.push('*Scheduler Status*');
      if (schedulerStatus) {
        lines.push(`Enabled: ${schedulerStatus.enabled}`);
        lines.push(`Cloud Mode: ${schedulerStatus.cloudMode}`);
        lines.push(`Running: ${schedulerStatus.running}`);
        lines.push(`Template: ${schedulerStatus.template || 'not configured'}`);
        lines.push(`Poll Interval: ${schedulerStatus.pollIntervalMs} ms`);
        lines.push(`Offset: ${schedulerStatus.offsetMinutes} min`);
        if (schedulerStatus.nextReminder) {
          lines.push(`Next Reset: ${schedulerStatus.nextReminder.nextReset || '—'}`);
        }
      } else {
        lines.push('Scheduler not initialized.');
      }

      if (statsResult.ok) {
        lines.push('');
        lines.push('*Delivery Stats*');
        const s = statsResult.stats;
        lines.push(`Pending: ${s.pending || 0}`);
        lines.push(`Sent: ${s.sent || 0}`);
        lines.push(`Failed: ${s.failed || 0}`);
        lines.push(`Skipped: ${s.skipped || 0}`);
        lines.push(`Processing: ${s.processing || 0}`);
      } else {
        lines.push(`Delivery stats unavailable: ${statsResult.error}`);
      }
    }

    return lines.join('\n');
  }
};
