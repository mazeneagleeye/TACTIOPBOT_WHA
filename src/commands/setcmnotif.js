// Subscribe the verified WhatsApp sender to Clan Mission notifications.
// Stores per-user subscription in the existing TACTIOPBOT_WHA.settings collection.
// No scheduler or automatic outbound delivery is active in this chapter.

const { getSubscription, setSubscription } = require('../services/notificationService');
const { isSupportedLanguage, getLanguage, getSupportedLanguages } = require('../services/notificationLanguages');

function parseSetArgs(args) {
  const result = { enabled: true, language: null };
  if (!args || typeof args !== 'string') return result;

  const tokens = args.split(/\s+/);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i].toLowerCase();
    if (token === 'enabled' || token === 'disable' || token === 'enable') {
      const next = tokens[i + 1];
      if (next && (next === 'true' || next === 'false' || next === '1' || next === '0')) {
        result.enabled = next === 'true' || next === '1';
        i += 1;
      } else if (token === 'disable') {
        result.enabled = false;
      } else {
        result.enabled = true;
      }
    } else if (token === 'language' || token === 'lang') {
      const next = tokens[i + 1];
      if (next) {
        result.language = next;
        i += 1;
      }
    }
  }
  return result;
}

module.exports = {
  name: 'setcmnotif',
  description: 'Subscribe to Clan Mission notifications (per user)',
  async run(context) {
    const sender = context && context.from;
    const args = context && context.args;

    if (!sender || typeof sender !== 'string') {
      return 'Unable to identify your WhatsApp sender ID. Please try again.';
    }

    const parsed = parseSetArgs(args);

    if (parsed.language && !isSupportedLanguage(parsed.language)) {
      const lang = getLanguage('English');
      return `${lang.invalidLanguage}\n\nUsage: !setcmnotif [language <language>] [enabled true|false]`;
    }

    const existing = await getSubscription(sender);
    if (existing) {
      const lang = getLanguage(existing.language || 'English');
      return `${lang.subscribed}\n${lang.languageCurrent.replace('English', existing.language || 'English')}\n${lang.deliveryNotActive}`;
    }

    const saved = await setSubscription(sender, {
      enabled: parsed.enabled,
      language: parsed.language || 'English'
    });

    if (!saved) {
      return 'Database unavailable. Could not save your subscription. Try again later.';
    }

    const lang = getLanguage(parsed.language || 'English');
    return [
      lang.subscribed,
      parsed.enabled ? lang.subscribedEnabled : lang.subscribedDisabled,
      lang.languageCurrent.replace('English', parsed.language || 'English'),
      lang.deliveryNotActive
    ].join('\n');
  }
};
