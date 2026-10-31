// Clan mission session state management.
// Stores per-user (per WhatsApp sender) session state in the existing
// TACTIOPBOT_WHA.settings collection. No credentials are stored.
// Sessions expire after a TTL and are cleaned up lazily on read.

const db = require('../utils/db');

const SESSION_PREFIX = 'cm_session:';
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function sessionKey(from) {
  return `${SESSION_PREFIX}${from}`;
}

/** Get the active session for a WhatsApp sender. Returns null if none or expired. */
async function getSession(from) {
  if (!db.isConnected()) return null;
  try {
    const doc = await db.getDb()
      .collection('settings')
      .findOne({ key: sessionKey(from) });
    if (!doc || doc.value == null) return null;
    const session = JSON.parse(doc.value);
    if (!session || Date.now() > session.expiresAt) {
      await clearSession(from);
      return null;
    }
    return session;
  } catch (error) {
    require('../utils/logger').error('Clan mission session read failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return null;
  }
}

/** Save or update a session for a WhatsApp sender. */
async function setSession(from, session) {
  if (!db.isConnected()) return false;
  try {
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    await db.getDb()
      .collection('settings')
      .updateOne(
        { key: sessionKey(from) },
        { $set: { value: JSON.stringify(session) } },
        { upsert: true }
      );
    return true;
  } catch (error) {
    require('../utils/logger').error('Clan mission session write failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return false;
  }
}

/** Clear the session for a WhatsApp sender. Safe to call when no session exists. */
async function clearSession(from) {
  if (!db.isConnected()) return false;
  try {
    await db.getDb()
      .collection('settings')
      .deleteOne({ key: sessionKey(from) });
    return true;
  } catch (error) {
    require('../utils/logger').error('Clan mission session clear failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return false;
  }
}

module.exports = { getSession, setSession, clearSession, SESSION_TTL_MS, SESSION_PREFIX };
