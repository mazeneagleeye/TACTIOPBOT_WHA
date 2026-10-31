// Admin service: authorization + validated settings updates.
// Authorizes by the actual sender ID from the verified webhook payload, never by
// a value supplied in the message body. No phone numbers or message contents logged.

const { setSetting } = require('./settingsService');
const logger = require('../utils/logger');

const ALLOWED_KEYS = new Set(['clanMission', 'nextReset', 'reset_schedule']);
const MAX_VALUE_LENGTH = 1000;

/** Check whether a sender is authorized to run admin commands. */
function isAuthorized(sender, adminNumbers) {
  if (!sender || typeof sender !== 'string') return false;
  if (!Array.isArray(adminNumbers) || adminNumbers.length === 0) return false;
  return adminNumbers.includes(sender);
}

/**
 * Update a setting if the sender is authorized and the input is valid.
 * @returns {{ ok: boolean, error?: string, message?: string }}
 */
async function updateSetting(key, value, sender, adminNumbers) {
  if (!isAuthorized(sender, adminNumbers)) {
    return { ok: false, error: 'unauthorized' };
  }

  if (!ALLOWED_KEYS.has(key)) {
    return { ok: false, error: 'invalid_key' };
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return { ok: false, error: 'empty_value' };
  }

  if (value.length > MAX_VALUE_LENGTH) {
    return { ok: false, error: 'value_too_long' };
  }

  const trimmed = value.trim();
  const success = await setSetting(key, trimmed);
  if (!success) {
    logger.error('Admin settings update failed: database unavailable', {
      error: 'database_unavailable'
    });
    return { ok: false, error: 'database_unavailable' };
  }

  return { ok: true, message: `Setting "${key}" updated.` };
}

module.exports = { isAuthorized, updateSetting, ALLOWED_KEYS, MAX_VALUE_LENGTH };
