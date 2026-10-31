// Reminder delivery state management for TACTIOPBOT_WHA.
// Persists per-subscriber reminder jobs in MongoDB with idempotency keys
// and atomic claiming to prevent duplicate delivery across app instances.
// Collection: reminder_jobs (within TACTIOPBOT_WHA database).
// No phone numbers or message content are logged; only IDs and status.

const db = require('../utils/db');
const logger = require('../utils/logger');

const COLLECTION = 'reminder_jobs';

// Job status values.
const STATUS_PENDING = 'pending';
const STATUS_PROCESSING = 'processing';
const STATUS_SENT = 'sent';
const STATUS_FAILED = 'failed';
const STATUS_SKIPPED = 'skipped';

// Default lease duration for atomic claiming (5 minutes).
const DEFAULT_LEASE_MS = 5 * 60 * 1000;
// Default max delivery attempts per job.
const DEFAULT_MAX_ATTEMPTS = 3;

// Build the idempotency key: reminder:<resetId>:<phoneNumber>.
function jobId(resetId, phoneNumber) {
  return `reminder:${resetId}:${phoneNumber}`;
}

/** Create a reminder job if it does not already exist. Returns the existing or new job. */
async function createJob(resetId, phoneNumber, language, scheduledAt, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
  if (!db.isConnected()) return { ok: false, error: 'database_unavailable', job: null };

  const key = jobId(resetId, phoneNumber);
  const now = Date.now();

  try {
    const existing = await db.getDb()
      .collection(COLLECTION)
      .findOne({ _id: key });
    if (existing) {
      return { ok: true, error: null, job: existing };
    }

    const job = {
      _id: key,
      resetId,
      phoneNumber,
      language,
      status: STATUS_PENDING,
      attempts: 0,
      maxAttempts,
      scheduledAt,
      claimedAt: null,
      leaseExpiresAt: null,
      providerMessageId: null,
      failureCategory: null,
      createdAt: now,
      updatedAt: now
    };

    await db.getDb()
      .collection(COLLECTION)
      .insertOne(job);

    return { ok: true, error: null, job };
  } catch (error) {
    logger.error('Reminder job creation failed', {
      error: error && error.name ? error.name : 'unknown',
      resetId,
      phoneNumber: logger.maskId(phoneNumber)
    });
    return { ok: false, error: 'database_error', job: null };
  }
}

/**
 * Atomically claim pending jobs that are due for processing.
 * Uses compare-and-swap so two instances cannot claim the same job.
 * @param {number} now - Current epoch ms
 * @param {number} leaseMs - Lease duration in ms
 * @returns {Array<object>} Claimed jobs
 */
async function claimDueJobs(now, leaseMs = DEFAULT_LEASE_MS) {
  if (!db.isConnected()) return { ok: false, error: 'database_unavailable', jobs: [] };

  try {
    const result = await db.getDb()
      .collection(COLLECTION)
      .updateMany(
        {
          status: STATUS_PENDING,
          scheduledAt: { $lte: now },
          $or: [
            { leaseExpiresAt: null },
            { leaseExpiresAt: { $lte: now } }
          ]
        },
        {
          $set: {
            status: STATUS_PROCESSING,
            claimedAt: now,
            leaseExpiresAt: now + leaseMs,
            updatedAt: now
          },
          $inc: { attempts: 1 }
        }
      );

    if (!result || !result.modifiedCount) {
      return { ok: true, error: null, jobs: [] };
    }

    const claimed = await db.getDb()
      .collection(COLLECTION)
      .find({
        status: STATUS_PROCESSING,
        claimedAt: now,
        leaseExpiresAt: now + leaseMs
      })
      .toArray();

    return { ok: true, error: null, jobs: claimed };
  } catch (error) {
    logger.error('Reminder job claim failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return { ok: false, error: 'database_error', jobs: [] };
  }
}

/** Mark a job as sent with the provider message ID. */
async function markSent(jobIdKey, providerMessageId) {
  return updateJobStatus(jobIdKey, STATUS_SENT, null, providerMessageId);
}

/** Mark a job as failed with a failure category. */
async function markFailed(jobIdKey, failureCategory) {
  return updateJobStatus(jobIdKey, STATUS_FAILED, failureCategory, null);
}

/** Mark a job as skipped with a reason (stored as failureCategory). */
async function markSkipped(jobIdKey, reason) {
  return updateJobStatus(jobIdKey, STATUS_SKIPPED, reason, null);
}

/** Get delivery statistics grouped by status. */
async function getDeliveryStats() {
  if (!db.isConnected()) {
    return { ok: false, error: 'database_unavailable', stats: {} };
  }

  try {
    const pipeline = [
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ];
    const rows = await db.getDb()
      .collection(COLLECTION)
      .aggregate(pipeline)
      .toArray();

    const stats = {};
    for (const row of rows) {
      stats[row._id] = row.count;
    }

    return { ok: true, error: null, stats };
  } catch (error) {
    logger.error('Reminder delivery stats failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return { ok: false, error: 'database_error', stats: {} };
  }
}

/** Release stale processing leases (jobs stuck in processing past lease expiry). */
async function releaseStaleLeases(now) {
  if (!db.isConnected()) return { ok: false, error: 'database_unavailable', released: 0 };

  try {
    const result = await db.getDb()
      .collection(COLLECTION)
      .updateMany(
        {
          status: STATUS_PROCESSING,
          leaseExpiresAt: { $lt: now }
        },
        {
          $set: {
            status: STATUS_PENDING,
            claimedAt: null,
            leaseExpiresAt: null,
            updatedAt: now
          }
        }
      );

    return { ok: true, error: null, released: result ? result.modifiedCount : 0 };
  } catch (error) {
    logger.error('Reminder lease release failed', {
      error: error && error.name ? error.name : 'unknown'
    });
    return { ok: false, error: 'database_error', released: 0 };
  }
}

/** Internal: update a job's status and related fields. */
async function updateJobStatus(jobIdKey, status, failureCategory, providerMessageId) {
  if (!db.isConnected()) return { ok: false, error: 'database_unavailable' };

  const now = Date.now();
  const update = {
    $set: {
      status,
      updatedAt: now
    }
  };

  if (failureCategory !== null) {
    update.$set.failureCategory = failureCategory;
  }
  if (providerMessageId !== null) {
    update.$set.providerMessageId = providerMessageId;
  }
  if (status === STATUS_SENT || status === STATUS_FAILED || status === STATUS_SKIPPED) {
    update.$set.claimedAt = null;
    update.$set.leaseExpiresAt = null;
  }

  try {
    const result = await db.getDb()
      .collection(COLLECTION)
      .updateOne({ _id: jobIdKey }, update);

    if (result.matchedCount === 0) {
      return { ok: false, error: 'not_found' };
    }

    return { ok: true, error: null };
  } catch (error) {
    logger.error('Reminder job status update failed', {
      error: error && error.name ? error.name : 'unknown',
      jobId: jobIdKey
    });
    return { ok: false, error: 'database_error' };
  }
}

module.exports = {
  COLLECTION,
  STATUS_PENDING,
  STATUS_PROCESSING,
  STATUS_SENT,
  STATUS_FAILED,
  STATUS_SKIPPED,
  DEFAULT_LEASE_MS,
  DEFAULT_MAX_ATTEMPTS,
  jobId,
  createJob,
  claimDueJobs,
  markSent,
  markFailed,
  markSkipped,
  getDeliveryStats,
  releaseStaleLeases
};
