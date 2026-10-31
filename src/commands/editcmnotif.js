// Edit an existing Clan Mission notification subscription.
// Requires an existing subscription. Supports changing language and enabled state.
// Uses only the verified WhatsApp sender ID — never trusts data from the message body.

const { getSubscription, setSubscription } = require('../services/notificationService');
const { isSupportedLanguage, getLanguage, getSupportedLanguages } = require('../services/notificationLanguages');

function parseEditArgs(args) {
  const result = { language: null, enabled: null };
  if (!args || typeof args !== 'string') return result;

  const tokens = args.split(/\s+/);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i].toLowerCase();
    if (token === 'language' || token === 'lang') {
      const next = tokens[i + 1];
      if (next) {
        result.language = next;
        i += 1;
      }
    } else if (token === 'enabled' || token === 'disable' || token === 'enable') {
      const next = tokens[i + 1];
      if (next && (next === 'true' || next === 'false' || next === '1' || next === '0')) {
        result.enabled = next === 'true' || next === '1';
        i += 1;
      } else if (token === 'disable') {
        result.enabled = false;
      } else {
        result.enabled = true;
      }
    }
  }
  return result;
}

module.exports = {
  name: 'editcmnotif',
  description: 'Edit your Clan Mission notification subscription (language, enabled)',
  async run(context) {
    const sender = context && context.from;
    const args = context && context.args;

    if (!sender || typeof sender !== 'string') {
      return 'Unable to identify your WhatsApp sender ID. Please try again.';
    }

    const existing = await getSubscription(sender);
    if (!existing) {
      const lang = getLanguage('English');
      return [
        lang.noSubscription,
        'Usage: !setcmnotif [language <language>] [enabled true|false]',
        'Supported languages: ' + getSupportedLanguages().join(', ')
      ].join('\n');
    }

    const parsed = parseEditArgs(args);

    if (parsed.language && !isSupportedLanguage(parsed.language)) {
      const lang = getLanguage(existing.language || 'English');
      return `${lang.invalidLanguage}\n\nUsage: !editcmnotif [language <language>] [enabled true|false]`;
    }

    const updates = {};
    if (parsed.language !== null) updates.language = parsed.language;
    if (parsed.enabled !== null) updates.enabled = parsed.enabled;

    if (Object.keys(updates).length === 0) {
      const lang = getLanguage(existing.language || 'English');
      return [
        `*Current notification settings*`,
        `Enabled: ${existing.enabled ? 'Yes' : 'No'}`,
        `Language: ${existing.language || 'English'}`,
        lang.deliveryNotActive
      ].join('\n');
    }

    const saved = await setSubscription(sender, {
      enabled: updates.enabled !== undefined ? updates.enabled : existing.enabled,
      language: updates.language !== undefined ? updates.language : (existing.language || 'English')
    });

    if (!saved) {
      return 'Database unavailable. Could not update your subscription. Try again later.';
    }

    const lang = getLanguage(updates.language || existing.language || 'English');
    return [
      lang.updated,
      `Enabled: ${(updates.enabled !== undefined ? updates.enabled : existing.enabled) ? 'Yes' : 'No'}`,
      `Language: ${updates.language || existing.language || 'English'}`,
      lang.deliveryNotActive
    ].join('\n');
  }
};
