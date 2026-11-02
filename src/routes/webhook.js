const crypto = require('crypto');
const express = require('express');
const logger = require('../utils/logger');
const { handleMessage } = require('../services/messageHandler');
const { verifySignature, parseWebhookPayload } = require('../services/webhookParser');

const WEBHOOK_BODY_LIMIT = '256kb';
const MAX_REMEMBERED_IDS = 1000;

function safeEqual(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

async function deliverReply(client, to, reply) {
  const text = typeof reply === 'string' ? reply : reply && reply.text;
  if (typeof text !== 'string' || !text) {
    logger.error('Message handler returned an invalid reply');
    return;
  }

  if (reply && typeof reply === 'object' && Buffer.isBuffer(reply.imageBuffer)) {
    try {
      const upload = await client.uploadMedia(reply.imageBuffer, 'image/png');
      if (upload && upload.accepted && typeof upload.mediaId === 'string' && upload.mediaId) {
        const sentImage = await client.sendImage(to, upload.mediaId, text);
        if (sentImage && sentImage.accepted) return;
        logger.warn('Clan mission image was not accepted; sending text fallback', {
          reason: sentImage && sentImage.reason ? sentImage.reason : 'image_send_failed'
        });
      } else {
        logger.warn('Clan mission image upload failed; sending text fallback', {
          reason: upload && upload.reason ? upload.reason : 'media_upload_failed'
        });
      }
    } catch (error) {
      logger.error('Clan mission image delivery failed; sending text fallback');
    }
  }

  const result = await client.sendText(to, text);
  if (!result.accepted) {
    logger.warn('Reply was not accepted by the API', { reason: result.reason });
  }
}

/**
 * @param {object} config  loadConfig() result
 * @param {{ sendText: Function, uploadMedia?: Function, sendImage?: Function }} client
 */
function createWebhookRouter(config, client) {
  const router = express.Router();

  // Remember recent message IDs (IDs only, never message text) so that Meta's retries of the
  // same webhook do not produce duplicate replies.
  const seenIds = new Set();
  function alreadySeen(id) {
    if (!id) return false;
    if (seenIds.has(id)) return true;
    seenIds.add(id);
    if (seenIds.size > MAX_REMEMBERED_IDS) {
      seenIds.delete(seenIds.values().next().value);
    }
    return false;
  }

  // GET /webhook - Meta's one-time verification handshake.
  router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const valid = mode === 'subscribe'
      && typeof token === 'string'
      && Boolean(config.verifyToken)
      && safeEqual(token, config.verifyToken)
      && typeof challenge === 'string';

    if (!valid) {
      logger.warn('Webhook verification rejected');
      return res.sendStatus(403);
    }

    logger.info('Webhook verification succeeded');
    return res.status(200).type('text/plain').send(challenge);
  });

  // POST /webhook - raw body is needed so the signature can be checked against the exact bytes.
  router.post(
    '/webhook',
    express.raw({ type: () => true, limit: WEBHOOK_BODY_LIMIT }),
    (req, res) => {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

      if (config.appSecret) {
        const signature = req.get('X-Hub-Signature-256');
        if (!verifySignature(rawBody, signature, config.appSecret)) {
          logger.warn('Webhook POST rejected: invalid or missing signature');
          return res.sendStatus(401);
        }
      }

      let payload;
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch (error) {
        logger.warn('Webhook POST rejected: body is not valid JSON');
        return res.sendStatus(400);
      }

      if (!payload || typeof payload !== 'object' || payload.object !== 'whatsapp_business_account') {
        logger.warn('Webhook POST rejected: unexpected payload shape');
        return res.sendStatus(400);
      }

      // Acknowledge immediately so Meta does not time out and re-send the event.
      res.sendStatus(200);

      processPayload(payload).catch((error) => {
        logger.error('Unexpected error while processing webhook', { error });
      });
    }
  );

  async function processPayload(payload) {
    const { messages, ignoredMessages, statuses } = parseWebhookPayload(payload);

    if (statuses > 0 || ignoredMessages > 0) {
      logger.info('Ignored non-text webhook events', { statuses, ignoredMessages });
    }

    for (const message of messages) {
      if (alreadySeen(message.id)) {
        continue;
      }
      // Message text is intentionally NOT logged or stored.
      const reply = await handleMessage(message.text, { from: message.from, adminNumbers: config.adminNumbers });
      await deliverReply(client, message.from, reply);
    }
  }

  return router;
}

module.exports = { createWebhookRouter, deliverReply };
