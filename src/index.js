require('dotenv').config();

const express = require('express');
const { BOT_NAME, loadConfig, validateConfig } = require('./config');
const logger = require('./utils/logger');
const db = require('./utils/db');
const { createWhatsAppClient } = require('./services/whatsappApi');
const { createHealthRouter } = require('./routes/health');
const { createWebhookRouter } = require('./routes/webhook');
const { createDevelopmentRouter } = require('./routes/development');
const { getScheduler } = require('./services/reminderScheduler');
const { createJob: reminderCreateJob } = require('./services/reminderDelivery');
const { getAllSubscriptions } = require('./services/notificationService');

/** Build the Express app (exported separately so it can be tested without listening). */
function createApp(config, client) {
  const app = express();
  app.disable('x-powered-by');
  // Hosting platforms usually sit behind a reverse proxy.
  app.set('trust proxy', 1);

  app.use(createHealthRouter(config));
  // The webhook router parses its own raw body (needed for signature checks).
  app.use(createWebhookRouter(config, client));

  const devEnabled = config.mode === 'mock' && config.nodeEnv !== 'production';
  if (devEnabled) {
    app.use(createDevelopmentRouter(config.adminNumbers));
  }

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler: never leak stack traces to clients.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err && (err.status === 413 || err.type === 'entity.too.large') ? 413 : 400;
    logger.warn('Request error', { status, type: err && err.type });
    res.status(status).json({ error: status === 413 ? 'Payload too large' : 'Bad request' });
  });

  return { app, devEnabled };
}

async function main() {
  const config = loadConfig();
  logger.registerSecrets([config.accessToken, config.appSecret, config.verifyToken]);

  const validation = validateConfig(config);
  validation.warnings.forEach((warning) => logger.warn(warning));
  if (!validation.ok) {
    validation.errors.forEach((error) => logger.error(`Configuration error: ${error}`));
    logger.error('Fix the configuration (see .env.example) and start again.');
    process.exit(1);
  }

  // Connect to MongoDB (optional). Failure does not block startup: mock mode keeps working.
  const dbConnected = await db.connect(config.mongodbUri, config.mongodbDatabase);
  if (dbConnected) {
    logger.info('Database connected', { database: config.mongodbDatabase });
  } else if (config.mongodbUri || config.mongodbDatabase) {
    logger.warn('Database connection failed or partially configured. Running without a database.');
  } else {
    logger.info('Database disabled: MONGODB_URI not configured.');
  }

  const client = createWhatsAppClient(config);
  const { app, devEnabled } = createApp(config, client);

  // Initialize reminder scheduler only after MongoDB is connected.
  let reminderScheduler = null;
  if (dbConnected) {
    reminderScheduler = getScheduler(
      config,
      client,
      require('./services/reminderDelivery'),
      require('./services/notificationService'),
      getAllSubscriptions
    );
    const started = await reminderScheduler.start();
    if (started) {
      logger.info('Reminder scheduler active');
    } else {
      logger.info('Reminder scheduler not started (disabled or unmet prerequisites)');
    }
  } else {
    logger.info('Reminder scheduler deferred: MongoDB not connected');
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`${BOT_NAME} listening`, {
      port: config.port,
      mode: config.mode,
      environment: config.nodeEnv,
      devSimulator: devEnabled,
      webhookAuthCheck: Boolean(config.appSecret)
    });
  });

  server.on('error', (error) => {
    logger.error('HTTP server error', { error });
    process.exit(1);
  });

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down`);
    if (reminderScheduler) {
      reminderScheduler.stop();
    }
    await db.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Keep the process alive on stray errors, but log them (sanitized).
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection', { error: reason }));
  process.on('uncaughtException', (error) => logger.error('Uncaught exception', { error }));
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Startup failed', { error: error && error.message });
    process.exit(1);
  });
}

module.exports = { createApp };
