// Parsing and authentication helpers for incoming Meta webhook events.
// No network calls and no command logic here.

const crypto = require('crypto');

/**
 * Verify Meta's X-Hub-Signature-256 header ("sha256=<hex>") against the RAW request body.
 * Uses a constant-time comparison.
 */
function verifySignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret || !Buffer.isBuffer(rawBody) || typeof signatureHeader !== 'string') {
    return false;
  }
  const prefix = 'sha256=';
  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }

  const received = signatureHeader.slice(prefix.length);
  if (!/^[0-9a-f]{64}$/i.test(received)) {
    return false;
  }

  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest();
  const receivedBuffer = Buffer.from(received, 'hex');
  return receivedBuffer.length === expected.length && crypto.timingSafeEqual(receivedBuffer, expected);
}

/**
 * Walk a webhook payload and collect only genuine inbound TEXT messages.
 * Statuses (sent/delivered/read/failed), reactions, images, etc. are counted but ignored.
 * Never throws on missing optional fields.
 *
 * @returns {{ messages: Array<{id:string|null, from:string, text:string}>, ignoredMessages: number, statuses: number }}
 */
function parseWebhookPayload(payload) {
  const result = { messages: [], ignoredMessages: 0, statuses: 0 };

  if (!payload || typeof payload !== 'object' || payload.object !== 'whatsapp_business_account') {
    return result;
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = entry && Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      if (!change || change.field !== 'messages' || !change.value || typeof change.value !== 'object') {
        continue;
      }

      const { messages, statuses } = change.value;

      if (Array.isArray(statuses)) {
        result.statuses += statuses.length;
      }

      if (!Array.isArray(messages)) {
        continue;
      }

      for (const message of messages) {
        const isText = message
          && message.type === 'text'
          && typeof message.from === 'string'
          && message.from !== ''
          && message.text
          && typeof message.text.body === 'string';

        if (isText) {
          result.messages.push({
            id: typeof message.id === 'string' ? message.id : null,
            from: message.from,
            text: message.text.body
          });
        } else {
          result.ignoredMessages += 1;
        }
      }
    }
  }

  return result;
}

module.exports = { verifySignature, parseWebhookPayload };
