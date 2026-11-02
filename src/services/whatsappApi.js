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
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_CAPTION_LENGTH = 1024;
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

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

async function postWithRetry(fetchImpl, url, options, operation) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetchImpl(url, { ...options, signal: controller.signal });
    } catch (error) {
      const reason = error && error.name === 'AbortError' ? 'timeout' : 'network_error';
      logger.error(`WhatsApp ${operation} failed (network)`, { reason, attempt });
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      return { failure: { accepted: false, reason } };
    } finally {
      clearTimeout(timer);
    }

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (response.ok) return { response, data };

    const apiError = data && data.error ? data.error : null;
    const reason = describeFailure(response.status, apiError);
    logger.error(`WhatsApp ${operation} API rejected the request`, {
      reason,
      httpStatus: response.status,
      errorCode: apiError ? apiError.code : undefined,
      errorSubcode: apiError ? apiError.error_subcode : undefined,
      attempt
    });

    if (reason === 'meta_server_error' && attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS);
      continue;
    }
    return { failure: { accepted: false, reason, httpStatus: response.status } };
  }
  return { failure: { accepted: false, reason: 'unknown' } };
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
      async uploadMedia(imageBuffer) {
        logger.info('Mock mode: media NOT uploaded to WhatsApp', {
          bytes: Buffer.isBuffer(imageBuffer) ? imageBuffer.length : 0
        });
        return { accepted: false, simulated: true, reason: 'mock_mode' };
      },
      async sendImage(to, mediaId, caption) {
        logger.info('Mock mode: image NOT sent to WhatsApp', {
          to: logger.maskId(to),
          hasCaption: typeof caption === 'string' && caption.length > 0
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
  const mediaUrl = `${GRAPH_BASE_URL}/${config.apiVersion}/${config.phoneNumberId}/media`;

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
          logger.error('WhatsApp send failed (network)', { reason, attempt });
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
     * Upload a PNG image to the WhatsApp Cloud API.
     * Never throws: returns { accepted, mediaId?, reason?, httpStatus? }.
     */
    async uploadMedia(imageBuffer, mimeType = 'image/png') {
      if (
        !Buffer.isBuffer(imageBuffer) ||
        imageBuffer.length === 0 ||
        imageBuffer.length > MAX_IMAGE_SIZE_BYTES ||
        !IMAGE_MIME_TYPES.has(mimeType)
      ) {
        return { accepted: false, reason: 'invalid_arguments' };
      }

      const extension = mimeType === 'image/png' ? 'png' : 'jpg';
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', mimeType);
      form.append('file', new Blob([imageBuffer], { type: mimeType }), `clan_mission.${extension}`);

      const result = await postWithRetry(fetchImpl, mediaUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.accessToken}` },
        body: form
      }, 'media upload');
      if (result.failure) return result.failure;

      const mediaId = result.data && result.data.id;
      if (typeof mediaId !== 'string' || !mediaId) {
        logger.warn('WhatsApp media upload succeeded without a media id; not treating as accepted', {
          httpStatus: result.response.status
        });
        return { accepted: false, reason: 'no_media_id_in_response', httpStatus: result.response.status };
      }
      logger.info('WhatsApp API accepted media upload', { mediaId });
      return { accepted: true, mediaId, httpStatus: result.response.status };
    },

    /**
     * Send an already uploaded image. A caption is optional and limited to 1024 chars.
     * Never throws: returns { accepted, messageId?, reason?, httpStatus? }.
     */
    async sendImage(to, mediaId, caption) {
      if (
        typeof to !== 'string' || !to ||
        typeof mediaId !== 'string' || !mediaId ||
        (caption !== undefined && (typeof caption !== 'string' || caption.length > MAX_IMAGE_CAPTION_LENGTH))
      ) {
        return { accepted: false, reason: 'invalid_arguments' };
      }

      const image = { id: mediaId };
      if (caption) image.caption = caption;
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image
      };
      const result = await postWithRetry(fetchImpl, url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }, 'image send');
      if (result.failure) return result.failure;

      const messageId = result.data && Array.isArray(result.data.messages) && result.data.messages[0]
        ? result.data.messages[0].id
        : null;
      if (!messageId) {
        logger.warn('WhatsApp image send succeeded without a message id; not treating as accepted', {
          httpStatus: result.response.status
        });
        return { accepted: false, reason: 'no_message_id_in_response', httpStatus: result.response.status };
      }
      logger.info('WhatsApp API accepted image message (delivery not confirmed yet)', {
        to: logger.maskId(to),
        messageId
      });
      return { accepted: true, messageId, httpStatus: result.response.status };
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
            template: templateName
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
