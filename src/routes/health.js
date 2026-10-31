const express = require('express');
const { BOT_NAME } = require('../config');

function createHealthRouter(config) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json({
      name: BOT_NAME,
      service: 'TACTIOPBOT_WHA',
      description: 'WhatsApp edition of TACTIOPBOT (official WhatsApp Cloud API)',
      mode: config.mode,
      endpoints: ['GET /', 'GET /health', 'GET /webhook', 'POST /webhook']
    });
  });

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  return router;
}

module.exports = { createHealthRouter };
