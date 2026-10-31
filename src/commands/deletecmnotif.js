// Unsubscribe the verified WhatsApp sender from Clan Mission notifications.
// Idempotent: deleting a nonexistent subscription returns a clear, harmless response.
// Only the sender's own subscription can be deleted.

const { getSubscription, deleteSubscription } = require('../services/notificationService');
const { getLanguage } = require('../services/notificationLanguages');

module.exports = {
  name: 'deletecmnotif',
  description: 'Unsubscribe from Clan Mission notifications',
  async run(context) {
    const sender = context && context.from;

    if (!sender || typeof sender !== 'string') {
      return 'Unable to identify your WhatsApp sender ID. Please try again.';
    }

    const existing = await getSubscription(sender);
    if (!existing) {
      const lang = getLanguage('English');
      return [
        lang.noSubscription,
        'Usage: !setcmnotif [language <language>] [enabled true|false]'
      ].join('\n');
    }

    const deleted = await deleteSubscription(sender);
    if (!deleted) {
      return 'Database unavailable. Could not remove your subscription. Try again later.';
    }

    const lang = getLanguage(existing.language || 'English');
    return lang.unsubscribed;
  }
};
