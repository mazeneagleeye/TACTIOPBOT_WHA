// Notification subscription service for TACTIOPBOT_WHA.
// Stores per-user notification subscriptions in the existing `settings` collection
// of the TACTIOPBOT_WHA database. Keyed by the verified WhatsApp sender phone number.
// No credentials or secrets are stored.
// Gracefully degrades when MongoDB is unavailable.

const db = require('../utils/db');

const SETTINGS_COLLECTION = 'settings';
const KEY_PREFIX = 'cm_notif:';

const DEFAULT_LANGUAGE = 'English';

function subscriptionKey(from) {
  return `${KEY_PREFIX}${from}`;
}

/** Read a notification subscription for a WhatsApp sender. Returns null when not found or DB unavailable. */
async function getSubscription(from) {
  if (!db.isConnected()) return null;
  try {
    const doc = await db.getDb()
      .collection(SETTINGS_COLLECTION)
      .findOne({ key: subscriptionKey(from) });
    if (!doc || doc.value == null) return null;
    return JSON.parse(doc.value);
  } catch (error) {
    require('../utils/logger').error('Notification subscription read failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return null;
  }
}

/** Create or update a notification subscription for a WhatsApp sender. */
async function setSubscription(from, config) {
  if (!db.isConnected()) return false;
  try {
    const now = new Date().toISOString();
    const existing = await getSubscription(from);
    const document = {
      phoneNumber: from,
      enabled: config.enabled !== undefined ? config.enabled : true,
      language: config.language || DEFAULT_LANGUAGE,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
    await db.getDb()
      .collection(SETTINGS_COLLECTION)
      .updateOne(
        { key: subscriptionKey(from) },
        { $set: { value: JSON.stringify(document) } },
        { upsert: true }
      );
    return true;
  } catch (error) {
    require('../utils/logger').error('Notification subscription write failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return false;
  }
}

/** Delete a notification subscription for a WhatsApp sender. Returns true if a record was removed. */
async function deleteSubscription(from) {
  if (!db.isConnected()) return false;
  try {
    const result = await db.getDb()
      .collection(SETTINGS_COLLECTION)
      .deleteOne({ key: subscriptionKey(from) });
    return result.deletedCount === 1;
  } catch (error) {
    require('../utils/logger').error('Notification subscription delete failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return false;
  }
}

/** Get all notification subscriptions. Returns an array of subscription documents. */
async function getAllSubscriptions() {
  if (!db.isConnected()) return [];
  try {
    const prefix = KEY_PREFIX;
    const docs = await db.getDb()
      .collection(SETTINGS_COLLECTION)
      .find({ key: { $regex: `^${prefix}` } })
      .toArray();
    const subs = [];
    for (const doc of docs) {
      if (!doc || doc.value == null) continue;
      try {
        const parsed = JSON.parse(doc.value);
        if (parsed && parsed.phoneNumber) {
          subs.push(parsed);
        }
      } catch (error) {
        // Skip malformed subscription records.
        require('../utils/logger').error('Malformed subscription record skipped', {
          error: error && error.name ? error.name : 'unknown'
        });
      }
    }
    return subs;
  } catch (error) {
    require('../utils/logger').error('Failed to read all subscriptions', {
      error: error && error.name ? error.name : 'unknown'
    });
    return [];
  }
}

module.exports = {
  getSubscription,
  setSubscription,
  deleteSubscription,
  getAllSubscriptions,
  KEY_PREFIX,
  DEFAULT_LANGUAGE
};
