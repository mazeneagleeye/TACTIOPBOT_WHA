// Settings persistence layer for TACTIOPBOT_WHA.
// Stores key/value settings in the existing `settings` collection of the
// TACTIOPBOT_WHA database. No credentials are ever stored here.
// Gracefully degrades when MongoDB is unavailable.

const db = require('../utils/db');

const SETTINGS_COLLECTION = 'settings';

/** Read a setting by key. Returns defaultValue when DB is unavailable or key is missing. */
async function getSetting(key, defaultValue = null) {
  if (!db.isConnected()) return defaultValue;
  try {
    const doc = await db.getDb()
      .collection(SETTINGS_COLLECTION)
      .findOne({ key });
    return doc && doc.value !== undefined ? doc.value : defaultValue;
  } catch (error) {
    // Log only the error name, never the query or values.
    require('../utils/logger').error('Settings read failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return defaultValue;
  }
}

/** Write (upsert) a setting by key. Returns true on success, false on failure. */
async function setSetting(key, value) {
  if (!db.isConnected()) return false;
  try {
    await db.getDb()
      .collection(SETTINGS_COLLECTION)
      .updateOne(
        { key },
        { $set: { value, updatedAt: new Date() } },
        { upsert: true }
      );
    return true;
  } catch (error) {
    require('../utils/logger').error('Settings write failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return false;
  }
}

/** Read multiple settings at once. Returns a map of key -> value. */
async function getAllSettings(keys) {
  if (!db.isConnected()) {
    const result = {};
    for (const key of keys) result[key] = null;
    return result;
  }
  try {
    const docs = await db.getDb()
      .collection(SETTINGS_COLLECTION)
      .find({ key: { $in: keys } })
      .toArray();
    const result = {};
    for (const key of keys) result[key] = null;
    for (const doc of docs) {
      if (doc && doc.key && doc.value !== undefined) {
        result[doc.key] = doc.value;
      }
    }
    return result;
  } catch (error) {
    require('../utils/logger').error('Settings bulk read failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    const result = {};
    for (const key of keys) result[key] = null;
    return result;
  }
}

module.exports = { getSetting, setSetting, getAllSettings, SETTINGS_COLLECTION };
