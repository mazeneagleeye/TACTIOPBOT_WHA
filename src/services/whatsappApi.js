// Sends messages through Meta's official WhatsApp Cloud API (Graph API).
// Endpoint:  POST https://graph.facebook.com/{version}/{phone-number-id}/messages
// Auth:      Authorization: Bearer {access token}
//
// IMPORTANT: a successful response only means Meta ACCEPTED the message for sending.
// It does NOT mean the message was delivered or read. Delivery/read updates arrive later
// as "statuses" webhook events.

const logger = require('../utils/logger');

const GRAPH_BASE_URL = 'https://graph.facebook.com';
const REQUEST_TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = 2; // 1 retry at most, and only for network errors / 5xx. Never infinite.
const RETRY_DELAY_MS = 500;
const MAX_MESSAGE_LENGTH = 4096; // WhatsApp text body limit
const MAX_TEMPLATE_PARAMETERS = 10;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function describeFailure(httpStatus, apiError) {
  const code = apiError && apiError.code;
  if (httpStatus === 401 || code === 190) {
    return 'invalid_or_expired_credentials';
  }
  if (httpStatus === 429 || code === 4 || code === 80007 || code === 130429) {
    return 'rate_limited';
  }
  if (httpStatus === 403 || code === 10 || code === 200) {
    return 'permission_denied';
  }
  if (httpStatus >= 500) {
    return 'meta_server_error';
  }
  return 'request_rejected';
}

/**
 * Create a WhatsApp client.
 * @param {object} config result of loadConfig()
 * @param {Function} [fetchImpl] injectable fetch (used by tests)
 */
function createWhatsAppClient(config, fetchImpl = globalThis.fetch) {
  if (config.mode !== 'cloud') {
    return {
      mode: 'mock',
      async sendText(to, text) {
        logger.info('Mock mode: reply NOT sent to WhatsApp', {
          to: logger.maskId(to),
          length: typeof text === 'string' ? text.length : 0
        });
        return { accepted: false, simulated: true, reason: 'mock_mode' };
      },
      async sendTemplate(to, templateName, languageCode, parameters) {
        logger.info('Mock mode: template NOT sent to WhatsApp', {
          to: logger.maskId(to),
          template: templateName,
          language: languageCode
        });
        return { accepted: false, simulated: true, reason: 'mock_mode' };
      }
    };
  }

  const url = `${GRAPH_BASE_URL}/${config.apiVersion}/${config.phoneNumberId}/messages`;

  async function attemptSend(body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    mode: 'cloud',

    /**
     * Send a plain text message.
     * Never throws: returns { accepted, messageId?, reason?, httpStatus? }.
     * accepted === true means "accepted by the API", NOT "delivered".
     */
    async sendText(to, text) {
      if (typeof to !== 'string' || !to || typeof text !== 'string' || !text.trim()) {
        return { accepted: false, reason: 'invalid_arguments' };
      }

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text.slice(0, MAX_MESSAGE_LENGTH) }
      };

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        let response;
        try {
          response = await attemptSend(body);
        } catch (error) {
          const reason = error && error.name === 'AbortError' ? 'timeout' : 'network_error';
          logger.error('WhatsApp send failed (network)', { reason, attempt, error });
          if (attempt < MAX_ATTEMPTS) {
            await sleep(RETRY_DELAY_MS);
            continue;
          }
          return { accepted: false, reason };
        }

        let data = null;
        try {
          data = await response.json();
        } catch (error) {
          data = null;
        }

        if (response.ok) {
          const messageId = data && Array.isArray(data.messages) && data.messages[0]
            ? data.messages[0].id
            : null;
          if (messageId) {
            logger.info('WhatsApp API accepted message (delivery not confirmed yet)', {
              to: logger.maskId(to),
              messageId
            });
            return { accepted: true, messageId, httpStatus: response.status };
          }
          logger.warn('WhatsApp API returned success without a message id; not treating as accepted', {
            httpStatus: response.status
          });
          return { accepted: false, reason: 'no_message_id_in_response', httpStatus: response.status };
        }

        const apiError = data && data.error ? data.error : null;
        const reason = describeFailure(response.status, apiError);
        logger.error('WhatsApp API rejected the request', {
          reason,
          httpStatus: response.status,
          errorCode: apiError ? apiError.code : undefined,
          errorSubcode: apiError ? apiError.error_subcode : undefined,
          errorMessage: apiError ? apiError.message : undefined,
          attempt
        });

        if (reason === 'meta_server_error' && attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        // Rate limits, bad credentials, and other 4xx errors are NOT retried.
        return { accepted: false, reason, httpStatus: response.status };
      }
      return { accepted: false, reason: 'unknown' };
      },

    /**
     * Send a WhatsApp template message.
     * Never throws: returns { accepted, messageId?, reason?, httpStatus? }.
     * accepted === true means "accepted by the API", NOT "delivered".
     * @param {string} to - Recipient phone number
     * @param {string} templateName - Approved template name in Meta
     * @param {string} languageCode - Meta language code (e.g. 'en', 'ar')
     * @param {string[]} parameters - Template body parameter values
     */
    async sendTemplate(to, templateName, languageCode, parameters) {
      if (typeof to !== 'string' || !to) {
        return { accepted: false, reason: 'invalid_arguments' };
      }
      if (typeof templateName !== 'string' || !templateName.trim()) {
        return { accepted: false, reason: 'invalid_arguments' };
      }
      if (typeof languageCode !== 'string' || !languageCode.trim()) {
        return { accepted: false, reason: 'invalid_arguments' };
      }
      if (!Array.isArray(parameters)) {
        return { accepted: false, reason: 'invalid_arguments' };
      }
      if (parameters.length > MAX_TEMPLATE_PARAMETERS) {
        return { accepted: false, reason: 'too_many_parameters' };
      }

      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName.trim(),
          language: { code: languageCode.trim() },
          components: [
            {
              type: 'body',
              parameters: parameters.map((p, index) => ({
                type: 'text',
                text: String(p).slice(0, MAX_MESSAGE_LENGTH)
              }))
            }
          ]
        }
      };

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        let response;
        try {
          response = await attemptSend(body);
        } catch (error) {
          const reason = error && error.name === 'AbortError' ? 'timeout' : 'network_error';
          logger.error('WhatsApp template send failed (network)', {
            reason,
            attempt,
            template: templateName,
            error
          });
          if (attempt < MAX_ATTEMPTS) {
            await sleep(RETRY_DELAY_MS);
            continue;
          }
          return { accepted: false, reason };
        }

        let data = null;
        try {
          data = await response.json();
        } catch (error) {
          data = null;
        }

        if (response.ok) {
          const messageId = data && Array.isArray(data.messages) && data.messages[0]
            ? data.messages[0].id
            : null;
          if (messageId) {
            logger.info('WhatsApp template API accepted message (delivery not confirmed yet)', {
              to: logger.maskId(to),
              template: templateName,
              language: languageCode,
              messageId
            });
            return { accepted: true, messageId, httpStatus: response.status };
          }
          logger.warn('WhatsApp template API returned success without a message id; not treating as accepted', {
            httpStatus: response.status
          });
          return { accepted: false, reason: 'no_message_id_in_response', httpStatus: response.status };
        }

        const apiError = data && data.error ? data.error : null;
        const reason = describeFailure(response.status, apiError);
        logger.error('WhatsApp template API rejected the request', {
          reason,
          httpStatus: response.status,
          template: templateName,
          language: languageCode,
          errorCode: apiError ? apiError.code : undefined,
          errorSubcode: apiError ? apiError.error_subcode : undefined,
          errorMessage: apiError ? apiError.message : undefined,
          attempt
        });

        if (reason === 'meta_server_error' && attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        return { accepted: false, reason, httpStatus: response.status };
      }

      return { accepted: false, reason: 'unknown' };
    }
  };
}

module.exports = { createWhatsAppClient, GRAPH_BASE_URL };
