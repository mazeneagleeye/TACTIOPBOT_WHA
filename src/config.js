const BOT_NAME = 'TACTIOPBOT ✦ Eagle Eye';

const VALID_MODES = ['mock', 'cloud'];

/**
 * Build a config object from an environment object (defaults to process.env).
 * Pure function: it does not read .env itself, so it is easy to test.
 */
function loadConfig(env = process.env) {
  const clean = (value) => (typeof value === 'string' ? value.trim() : '');

  return {
    port: clean(env.PORT) === '' ? 3000 : Number(clean(env.PORT)),
    nodeEnv: (clean(env.NODE_ENV) || 'development').toLowerCase(),
    mode: (clean(env.WHATSAPP_MODE) || 'mock').toLowerCase(),
    accessToken: clean(env.WHATSAPP_ACCESS_TOKEN),
    phoneNumberId: clean(env.WHATSAPP_PHONE_NUMBER_ID),
    verifyToken: clean(env.WHATSAPP_VERIFY_TOKEN),
    appSecret: clean(env.WHATSAPP_APP_SECRET),
    apiVersion: clean(env.WHATSAPP_API_VERSION),
    mongodbUri: clean(env.MONGODB_URI),
    mongodbDatabase: clean(env.MONGODB_DATABASE),
    adminNumbers: (clean(env.WHATSAPP_ADMIN_NUMBERS)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)),
    reminderEnabled: clean(env.REMINDER_ENABLED || '').toLowerCase() === 'true',
    reminderOffsetMinutes: Number.parseInt(clean(env.REMINDER_OFFSET_MINUTES || '0'), 10),
    reminderPollIntervalMinutes: Number.parseInt(clean(env.REMINDER_POLL_INTERVAL_MINUTES || '5'), 10)
  };
}

/**
 * Validate a config. Returns { ok, errors, warnings }.
 * Only variable NAMES are reported, never their values.
 */
function validateConfig(config) {
  const errors = [];
  const warnings = [];

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    errors.push('PORT must be an integer between 1 and 65535.');
  }

  if (!VALID_MODES.includes(config.mode)) {
    errors.push(`WHATSAPP_MODE must be one of: ${VALID_MODES.join(', ')}.`);
  }

  if (config.mode === 'cloud') {
    const required = [
      ['WHATSAPP_ACCESS_TOKEN', config.accessToken],
      ['WHATSAPP_PHONE_NUMBER_ID', config.phoneNumberId],
      ['WHATSAPP_VERIFY_TOKEN', config.verifyToken],
      ['WHATSAPP_API_VERSION', config.apiVersion]
    ];

    if (config.nodeEnv === 'production') {
      required.push(['WHATSAPP_APP_SECRET', config.appSecret]);
    }

    const missing = required.filter(([, value]) => !value).map(([name]) => name);
    if (missing.length > 0) {
      errors.push(`Cloud API mode is missing required variables: ${missing.join(', ')}.`);
    }

    if (config.apiVersion && !/^v\d+\.\d+$/.test(config.apiVersion)) {
      errors.push('WHATSAPP_API_VERSION must look like "v<major>.<minor>" (for example v12.3).');
    }

    if (config.nodeEnv !== 'production' && !config.appSecret) {
      warnings.push(
        'WHATSAPP_APP_SECRET is not set: POST /webhook signatures will NOT be verified. ' +
          'This is only acceptable for local testing.'
      );
    }
  }

  if (config.mode === 'mock' && config.nodeEnv === 'production') {
    warnings.push(
      'WHATSAPP_MODE=mock with NODE_ENV=production: the bot will not send any real WhatsApp ' +
        'messages and /dev/message is disabled.'
    );
  }

  // MongoDB is optional. Warn if only half is configured; never fail startup over it.
  const hasUri = Boolean(config.mongodbUri);
  const hasDatabase = Boolean(config.mongodbDatabase);
  if (hasUri !== hasDatabase) {
    warnings.push(
      'MONGODB_URI and MONGODB_DATABASE should both be set for database support. ' +
        'Running without a database.'
    );
  }

  // Admin numbers: optional allowlist. Each must look like a phone number.
  const PHONE_NUMBER = /^\+?[0-9]{6,20}$/;
  const invalidAdminNumbers = config.adminNumbers.filter((n) => !PHONE_NUMBER.test(n));
  if (invalidAdminNumbers.length > 0) {
    warnings.push(
      'WHATSAPP_ADMIN_NUMBERS contains invalid entries (expected phone numbers, comma-separated): ' +
        invalidAdminNumbers.length + ' invalid.'
    );
  }

  if (!Number.isInteger(config.reminderOffsetMinutes) || config.reminderOffsetMinutes < 0) {
    errors.push('REMINDER_OFFSET_MINUTES must be a non-negative integer.');
  }

  if (!Number.isInteger(config.reminderPollIntervalMinutes) || config.reminderPollIntervalMinutes < 1) {
    errors.push('REMINDER_POLL_INTERVAL_MINUTES must be an integer >= 1.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

module.exports = { BOT_NAME, loadConfig, validateConfig };
