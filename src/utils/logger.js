// Tiny JSON logger with secret redaction. No dependencies.

const SENSITIVE_KEY = /token|secret|authorization|password|signature|key/i;
const knownSecrets = new Set();

/** Register secret values (tokens etc.) so they are scrubbed from any logged string. */
function registerSecrets(values) {
  for (const value of values) {
    if (typeof value === 'string' && value.length >= 6) {
      knownSecrets.add(value);
    }
  }
}

function scrub(text) {
  let output = String(text);
  for (const secret of knownSecrets) {
    output = output.split(secret).join('[redacted]');
  }
  return output;
}

function sanitizeValue(key, value) {
  if (SENSITIVE_KEY.test(key)) return '[redacted]';
  if (typeof value === 'string') return scrub(value);
  if (value instanceof Error) return scrub(value.message);
  return value;
}

/** Mask a phone number / id so logs do not hold full personal identifiers. */
function maskId(value) {
  const text = String(value || '');
  if (text.length <= 4) return '***';
  return `***${text.slice(-4)}`;
}

function write(level, message, metadata = {}) {
  const entry = { time: new Date().toISOString(), level, message: scrub(message) };
  for (const [key, value] of Object.entries(metadata || {})) {
    entry[key] = sanitizeValue(key, value);
  }
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  info: (message, metadata) => write('info', message, metadata),
  warn: (message, metadata) => write('warn', message, metadata),
  error: (message, metadata) => write('error', message, metadata),
  registerSecrets,
  maskId,
  scrub
};
