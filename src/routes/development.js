const express = require('express');
const logger = require('../utils/logger');
const { handleMessage } = require('../services/messageHandler');

const DEV_BODY_LIMIT = '10kb';
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 30;
const MAX_TRACKED_CLIENTS = 1000;

/** Minimal in-memory fixed-window rate limiter (no extra dependency). */
function createRateLimiter(windowMs, maxRequests) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    let entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      entry = { start: now, count: 0 };
      hits.delete(key);
      hits.set(key, entry);
      if (hits.size > MAX_TRACKED_CLIENTS) {
        hits.delete(hits.keys().next().value);
      }
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      res.set('Retry-After', String(Math.ceil((entry.start + windowMs - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Slow down.' });
    }
    return next();
  };
}

/**
 * Local simulator. Only mounted when WHATSAPP_MODE=mock AND NODE_ENV is not production
 * (see src/index.js). It calls the same message handler as the real bot but never talks to
 * WhatsApp / Meta, so it cannot message real users.
 */
function createDevelopmentRouter(adminNumbers) {
  const router = express.Router();

  router.post(
    '/dev/message',
    createRateLimiter(RATE_WINDOW_MS, RATE_MAX_REQUESTS),
    express.json({ limit: DEV_BODY_LIMIT }),
    (req, res) => {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ error: 'Send a JSON body like {"from":"local-test","text":"!help"}.' });
      }

      const { from, text } = body;
      if (typeof from !== 'string' || from.trim() === '' || from.length > 64) {
        return res.status(400).json({ error: '"from" must be a non-empty string (max 64 characters).' });
      }
      if (typeof text !== 'string') {
        return res.status(400).json({ error: '"text" must be a string.' });
      }

      logger.info('Simulated incoming message (mock mode)', { from: logger.maskId(from) });
      handleMessage(text, { from, adminNumbers }).then((reply) => {
        return res.json({ from, reply, simulated: true, sentToWhatsApp: false });
      }).catch((error) => {
        logger.error('Simulated message handler error', { error: error && error.message });
        return res.status(500).json({ error: 'Internal error' });
      });
    }
  );

  return router;
}

module.exports = { createDevelopmentRouter, createRateLimiter };
