// Reusable MongoDB connection module for the TACTIOPBOT_WHA database.
// Explicitly selects the TACTIOPBOT_WHA database via MONGODB_DATABASE.
// Connection string comes only from MONGODB_URI (never hardcoded).
// When credentials are not configured, the module degrades gracefully
// so mock mode keeps working without a database.

const { MongoClient } = require('mongodb');
const logger = require('./logger');

let client = null;
let db = null;
let connected = false;

/** Whether a database connection is currently established. */
function isConnected() {
  return connected && db != null;
}

/**
 * Connect to MongoDB and select the configured database.
 * Returns true on success, false on failure (mock mode continues).
 * Never logs the connection string or credentials.
 * @param {string} uri - MongoDB connection string (from MONGODB_URI)
 * @param {string} databaseName - database name (from MONGODB_DATABASE)
 * @returns {Promise<boolean>}
 */
async function connect(uri, databaseName) {
  if (!uri || !databaseName) {
    logger.warn('MongoDB not configured: MONGODB_URI or MONGODB_DATABASE is missing. Running without database.');
    return false;
  }

  if (client) {
    return connected;
  }

  client = new MongoClient(uri);
  try {
    await client.connect();
    db = client.db(databaseName);
    connected = true;
    logger.info('MongoDB connected', { database: databaseName });
    return true;
  } catch (error) {
    // Never log the full error: MongoDB error messages can embed the URI/credentials.
    logger.error('MongoDB connection failed', { error: error && error.name ? error.name : 'unknown' });
    client = null;
    db = null;
    connected = false;
    return false;
  }
}

/** Access the connected database. Throws if not connected. */
function getDb() {
  if (!isConnected()) {
    throw new Error('Database is not connected. Call connect() first.');
  }
  return db;
}

/** Gracefully close the MongoDB client. Safe to call when not connected. */
async function close() {
  if (!client) return;
  try {
    await client.close();
  } catch (error) {
    logger.error('MongoDB close error', { error: error && error.name ? error.name : 'unknown' });
  }
  client = null;
  db = null;
  connected = false;
}

module.exports = { connect, getDb, close, isConnected };
