const test = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Helper: in-memory MongoDB mock
// ---------------------------------------------------------------------------

function createMockDb() {
  const store = new Map();
  let connected = true;

  const collection = {
    findOne: async (filter) => {
      if (filter.key != null) {
        return store.get(filter.key) || null;
      }
      return store.get(filter._id) || null;
    },
    insertOne: async (doc) => {
      store.set(doc._id, { ...doc });
      return { acknowledged: true, insertedId: doc._id };
    },
    updateOne: async (filter, update, opts) => {
      const key = filter._id != null ? filter._id : filter.key;
      let existing = store.get(key);
      if (!existing) {
        // Try finding by prefix match for reminder jobs
        for (const [k, v] of store.entries()) {
          if (k.startsWith('reminder:') && k.endsWith(key.split(':').pop())) {
            existing = v;
            break;
          }
        }
      }
      if (!existing) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
      const merged = { ...existing, ...update.$set };
      if (update.$unset) {
        for (const k of Object.keys(update.$unset)) delete merged[k];
      }
      store.set(key, merged);
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    },
    updateMany: async (filter, update) => {
      let modified = 0;
      for (const [key, doc] of store.entries()) {
        let match = true;
        for (const [fKey, fVal] of Object.entries(filter)) {
          if (fKey === '$or') {
            // Simple $or: match if any sub-condition matches
            const orMatch = fVal.some((sub) => {
              const [sKey, sVal] = Object.entries(sub)[0];
              if (sVal && sVal.$lte !== undefined) {
                return doc[sKey] != null && doc[sKey] <= sVal.$lte;
              }
              if (sVal && sVal.$lt !== undefined) {
                return doc[sKey] != null && doc[sKey] < sVal.$lt;
              }
              return doc[sKey] === sVal;
            });
            if (!orMatch) { match = false; break; }
          } else if (fVal && fVal.$lte !== undefined) {
            if (doc[fKey] == null || doc[fKey] > fVal.$lte) { match = false; break; }
          } else if (fVal && fVal.$lt !== undefined) {
            if (doc[fKey] == null || doc[fKey] >= fVal.$lt) { match = false; break; }
          } else if (doc[fKey] !== fVal) {
            match = false; break;
          }
        }
        if (match) {
          const merged = { ...doc, ...update.$set };
          if (update.$inc) {
            for (const [k, v] of Object.entries(update.$inc)) {
              merged[k] = (merged[k] || 0) + v;
            }
          }
          store.set(key, merged);
          modified += 1;
        }
      }
      return { acknowledged: true, modifiedCount: modified };
    },
    find: (filter = {}) => ({
      toArray: async () => {
        const results = [];
        for (const [key, doc] of store.entries()) {
          if (!key.startsWith('cm_notif:') && !key.startsWith('reminder:')) continue;
          let match = true;
          for (const [fKey, fVal] of Object.entries(filter)) {
            if (fVal && fVal.$lte !== undefined) {
              if (doc[fKey] == null || doc[fKey] > fVal.$lte) { match = false; break; }
            } else if (fVal && fVal.$lt !== undefined) {
              if (doc[fKey] == null || doc[fKey] >= fVal.$lt) { match = false; break; }
            } else if (fVal && fVal.$gte !== undefined) {
              if (doc[fKey] == null || doc[fKey] < fVal.$gte) { match = false; break; }
            } else if (doc[fKey] !== fVal) {
              match = false; break;
            }
          }
          if (match) results.push(doc);
        }
        return results;
      }
    }),
    aggregate: (pipeline) => {
      const stats = {};
      for (const [key, doc] of store.entries()) {
        if (key.startsWith('reminder:')) {
          const status = doc.status;
          stats[status] = (stats[status] || 0) + 1;
        }
      }
      const rows = Object.entries(stats).map(([_id, count]) => ({ _id, count }));
      return { toArray: async () => rows };
    },
    deleteOne: async (filter) => {
      const key = filter.key != null ? filter.key : filter._id;
      const deleted = store.delete(key);
      return { acknowledged: true, deletedCount: deleted ? 1 : 0 };
    }
  };

  const db = {
    isConnected: () => connected,
    setConnected: (val) => { connected = val; },
    getDb: () => ({
      collection: (name) => collection
    }),
    close: () => { connected = false; },
    store
  };

  return db;
}

// ---------------------------------------------------------------------------
// Module cache reset helpers
// ---------------------------------------------------------------------------

function resetAllCaches() {
  for (const mod of [
    '../src/utils/db',
    '../src/services/reminderDelivery',
    '../src/services/reminderScheduler',
    '../src/services/notificationService',
    '../src/services/whatsappApi',
    '../src/services/templateConfig',
    '../src/services/resetSchedule'
  ]) {
    delete require.cache[require.resolve(mod)];
  }
}

// ---------------------------------------------------------------------------
// reminderDelivery tests
// ---------------------------------------------------------------------------

test('reminderDelivery createJob creates a new job', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createJob, STATUS_PENDING } = require('../src/services/reminderDelivery');
  const result = await createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', Date.now() + 3600000);
  assert.equal(result.ok, true);
  assert.equal(result.job.status, STATUS_PENDING);
  assert.equal(result.job.resetId, '2026-06-30T06:00:00Z');
  assert.equal(result.job.phoneNumber, '+15550001111');
  assert.equal(result.job.language, 'English');
});

test('reminderDelivery createJob is idempotent', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createJob } = require('../src/services/reminderDelivery');
  await createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', Date.now() + 3600000);
  const result2 = await createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', Date.now() + 3600000);
  assert.equal(result2.ok, true);
  assert.equal(result2.job.status, 'pending'); // existing job, not duplicated
});

test('reminderDelivery createJob returns database_unavailable when DB disconnected', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  mockDb.setConnected(false);
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createJob } = require('../src/services/reminderDelivery');
  const result = await createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', Date.now() + 3600000);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'database_unavailable');
});

test('reminderDelivery claimDueJobs claims pending due jobs', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createJob, claimDueJobs, STATUS_PROCESSING } = require('../src/services/reminderDelivery');
  const now = Date.now();
  await createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', now - 1000);
  await createJob('2026-06-30T06:00:00Z', '+15550002222', 'Arabic', now - 1000);
  // Future job - should not be claimed
  await createJob('2026-07-01T06:00:00Z', '+15550003333', 'English', now + 86400000);

  const result = await claimDueJobs(now);
  assert.equal(result.ok, true);
  assert.equal(result.jobs.length, 2);
  for (const job of result.jobs) {
    assert.equal(job.status, STATUS_PROCESSING);
    assert.ok(job.claimedAt);
    assert.ok(job.leaseExpiresAt);
  }
});

test('reminderDelivery claimDueJobs does not claim already processing jobs', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createJob, claimDueJobs } = require('../src/services/reminderDelivery');
  const now = Date.now();
  await createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', now - 1000);

  // First claim
  const result1 = await claimDueJobs(now);
  assert.equal(result1.jobs.length, 1);

  // Second claim should not return the same job (it's processing)
  const result2 = await claimDueJobs(now);
  assert.equal(result2.jobs.length, 0);
});

test('reminderDelivery markSent and markFailed work', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createJob, markSent, markFailed, markSkipped, jobId } = require('../src/services/reminderDelivery');
  const now = Date.now();
  await createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', now);
  await createJob('2026-06-30T06:00:00Z', '+15550002222', 'English', now);
  await createJob('2026-06-30T06:00:00Z', '+15550003333', 'English', now);

  const key1 = jobId('2026-06-30T06:00:00Z', '+15550001111');
  const key2 = jobId('2026-06-30T06:00:00Z', '+15550002222');
  const key3 = jobId('2026-06-30T06:00:00Z', '+15550003333');

  const sent = await markSent(key1, 'msg_123');
  assert.equal(sent.ok, true);

  const failed = await markFailed(key2, 'rate_limited');
  assert.equal(failed.ok, true);

  const skipped = await markSkipped(key3, 'unsubscribed');
  assert.equal(skipped.ok, true);
});

test('reminderDelivery getDeliveryStats returns counts', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createJob, markSent, markFailed, markSkipped, jobId, getDeliveryStats } = require('../src/services/reminderDelivery');
  const now = Date.now();
  await createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', now);
  await createJob('2026-06-30T06:00:00Z', '+15550002222', 'English', now);
  await markSent(jobId('2026-06-30T06:00:00Z', '+15550001111'), 'msg_1');
  await markFailed(jobId('2026-06-30T06:00:00Z', '+15550002222'), 'error');

  const stats = await getDeliveryStats();
  assert.equal(stats.ok, true);
  assert.equal(stats.stats.sent, 1);
  assert.equal(stats.stats.failed, 1);
});

test('reminderDelivery releaseStaleLeases resets expired processing jobs', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createJob, claimDueJobs, releaseStaleLeases, STATUS_PENDING } = require('../src/services/reminderDelivery');
  const now = Date.now();
  await createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', now - 1000);

  // Claim the job
  await claimDueJobs(now);

  // Advance time past lease expiry
  const future = now + 10 * 60 * 1000; // 10 minutes later

  const releaseResult = await releaseStaleLeases(future);
  assert.equal(releaseResult.ok, true);
  assert.equal(releaseResult.released, 1);

  // Verify job is back to pending
  const { getDb } = mockDb;
  const doc = await getDb().collection('reminder_jobs').findOne({ _id: `reminder:2026-06-30T06:00:00Z:+15550001111` });
  assert.equal(doc.status, STATUS_PENDING);
});

// ---------------------------------------------------------------------------
// reminderScheduler tests
// ---------------------------------------------------------------------------

test('scheduler getSchedulerStatus returns null before creation', () => {
  resetAllCaches();
  const { getSchedulerStatus } = require('../src/services/reminderScheduler');
  assert.equal(getSchedulerStatus(), null);
});

test('scheduler is disabled when REMINDER_ENABLED is not true', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createScheduler } = require('../src/services/reminderScheduler');
  const config = {
    mode: 'cloud',
    mongodbUri: 'mongodb://localhost:27017',
    mongodbDatabase: 'TACTIOPBOT_WHA',
    reminderEnabled: false,
    reminderOffsetMinutes: 0,
    reminderPollIntervalMinutes: 5
  };
  const client = { mode: 'cloud', sendTemplate: async () => ({ accepted: true, messageId: 'x' }) };
  const notificationService = { getAllSubscriptions: async () => [] };
  const delivery = require('../src/services/reminderDelivery');

  const scheduler = createScheduler(config, client, delivery, notificationService, () => []);
  const started = await scheduler.start();
  assert.equal(started, false);
  assert.equal(scheduler.isRunning(), false);
});

test('scheduler is disabled when not in cloud mode', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createScheduler } = require('../src/services/reminderScheduler');
  const config = {
    mode: 'mock',
    mongodbUri: 'mongodb://localhost:27017',
    mongodbDatabase: 'TACTIOPBOT_WHA',
    reminderEnabled: true,
    reminderOffsetMinutes: 0,
    reminderPollIntervalMinutes: 5
  };
  const client = { mode: 'mock', sendTemplate: async () => ({ accepted: true, messageId: 'x' }) };
  const notificationService = { getAllSubscriptions: async () => [] };
  const delivery = require('../src/services/reminderDelivery');

  const scheduler = createScheduler(config, client, delivery, notificationService, () => []);
  const started = await scheduler.start();
  assert.equal(started, false);
  assert.equal(scheduler.isRunning(), false);
});

test('scheduler createJobsForNextReset skips disabled subscriptions', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createScheduler } = require('../src/services/reminderScheduler');
  const config = {
    mode: 'cloud',
    reminderEnabled: true,
    reminderOffsetMinutes: 0,
    reminderPollIntervalMinutes: 5
  };
  const client = { mode: 'cloud', sendTemplate: async () => ({ accepted: true, messageId: 'x' }) };
  const notificationService = { getAllSubscriptions: async () => [] };
  const delivery = require('../src/services/reminderDelivery');

  const scheduler = createScheduler(config, client, delivery, notificationService, () => [
    { phoneNumber: '+15550001111', enabled: false, language: 'English' },
    { phoneNumber: '+15550002222', enabled: true, language: 'English' }
  ]);

  const result = await scheduler.createJobsForNextReset();
  assert.equal(result.ok, true);
  assert.equal(result.created, 1);
  assert.equal(result.skipped, 1);
});

test('scheduler createJobsForNextReset skips unsubscribed users (no phoneNumber)', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createScheduler } = require('../src/services/reminderScheduler');
  const config = {
    mode: 'cloud',
    reminderEnabled: true,
    reminderOffsetMinutes: 0,
    reminderPollIntervalMinutes: 5
  };
  const client = { mode: 'cloud', sendTemplate: async () => ({ accepted: true, messageId: 'x' }) };
  const notificationService = { getAllSubscriptions: async () => [] };
  const delivery = require('../src/services/reminderDelivery');

  const scheduler = createScheduler(config, client, delivery, notificationService, () => [
    { phoneNumber: '', enabled: true, language: 'English' }
  ]);

  const result = await scheduler.createJobsForNextReset();
  assert.equal(result.ok, true);
  assert.equal(result.created, 0);
  assert.equal(result.skipped, 1);
});

test('scheduler createJobsForNextReset skips unmapped languages', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createScheduler } = require('../src/services/reminderScheduler');
  const config = {
    mode: 'cloud',
    reminderEnabled: true,
    reminderOffsetMinutes: 0,
    reminderPollIntervalMinutes: 5
  };
  const client = { mode: 'cloud', sendTemplate: async () => ({ accepted: true, messageId: 'x' }) };
  const notificationService = { getAllSubscriptions: async () => [] };
  const delivery = require('../src/services/reminderDelivery');

  const scheduler = createScheduler(config, client, delivery, notificationService, () => [
    { phoneNumber: '+15550001111', enabled: true, language: 'Klingon' }
  ]);

  const result = await scheduler.createJobsForNextReset();
  assert.equal(result.ok, true);
  assert.equal(result.created, 0);
  assert.equal(result.skipped, 1);
});

test('scheduler createJobsForNextReset is idempotent across calls', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createScheduler } = require('../src/services/reminderScheduler');
  const config = {
    mode: 'cloud',
    reminderEnabled: true,
    reminderOffsetMinutes: 0,
    reminderPollIntervalMinutes: 5
  };
  const client = { mode: 'cloud', sendTemplate: async () => ({ accepted: true, messageId: 'x' }) };
  const notificationService = { getAllSubscriptions: async () => [] };
  const delivery = require('../src/services/reminderDelivery');

  const scheduler = createScheduler(config, client, delivery, notificationService, () => [
    { phoneNumber: '+15550001111', enabled: true, language: 'English' }
  ]);

  const result1 = await scheduler.createJobsForNextReset();
  assert.equal(result1.created, 1);

  const result2 = await scheduler.createJobsForNextReset();
  assert.equal(result2.created, 0); // duplicate skip
  assert.equal(result2.duplicate_skip, true);
});

test('scheduler processDueJobs sends template and marks sent', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createScheduler } = require('../src/services/reminderScheduler');
  const config = {
    mode: 'cloud',
    reminderEnabled: true,
    reminderOffsetMinutes: 0,
    reminderPollIntervalMinutes: 5
  };
  let sentTo = null;
  let sentTemplate = null;
  let sentLang = null;
  let sentParams = null;
  const client = {
    mode: 'cloud',
    sendTemplate: async (to, templateName, languageCode, parameters) => {
      sentTo = to;
      sentTemplate = templateName;
      sentLang = languageCode;
      sentParams = parameters;
      return { accepted: true, messageId: 'msg_123' };
    }
  };
  const notificationService = { getAllSubscriptions: async () => [] };
  const delivery = require('../src/services/reminderDelivery');

  const scheduler = createScheduler(config, client, delivery, notificationService, () => [
    { phoneNumber: '+15550001111', enabled: true, language: 'English' }
  ]);

  // Create a job
  const now = Date.now() - 1000;
  await delivery.createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', now);

  // Process due jobs
  await scheduler.processDueJobs();

  assert.equal(sentTo, '+15550001111');
  assert.equal(sentTemplate, 'clan_mission_reminder');
  assert.equal(sentLang, 'en');
  assert.equal(sentParams.length, 2);
});

test('scheduler processDueJobs marks failed when send rejected', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createScheduler } = require('../src/services/reminderScheduler');
  const config = {
    mode: 'cloud',
    reminderEnabled: true,
    reminderOffsetMinutes: 0,
    reminderPollIntervalMinutes: 5
  };
  const client = {
    mode: 'cloud',
    sendTemplate: async () => ({ accepted: false, reason: 'permission_denied' })
  };
  const notificationService = { getAllSubscriptions: async () => [] };
  const delivery = require('../src/services/reminderDelivery');

  const scheduler = createScheduler(config, client, delivery, notificationService, () => [
    { phoneNumber: '+15550001111', enabled: true, language: 'English' }
  ]);

  const now = Date.now() - 1000;
  await delivery.createJob('2026-06-30T06:00:00Z', '+15550001111', 'English', now);
  await scheduler.processDueJobs();

  const doc = await mockDb.store.get(`reminder:2026-06-30T06:00:00Z:+15550001111`);
  assert.equal(doc.status, 'failed');
  assert.equal(doc.failureCategory, 'permission_denied');
});

test('scheduler stop works', async () => {
  resetAllCaches();
  const mockDb = createMockDb();
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: mockDb
  };

  const { createScheduler } = require('../src/services/reminderScheduler');
  const config = {
    mode: 'cloud',
    reminderEnabled: true,
    reminderOffsetMinutes: 0,
    reminderPollIntervalMinutes: 5
  };
  const client = { mode: 'cloud', sendTemplate: async () => ({ accepted: true, messageId: 'x' }) };
  const notificationService = { getAllSubscriptions: async () => [] };
  const delivery = require('../src/services/reminderDelivery');

  const scheduler = createScheduler(config, client, delivery, notificationService, () => []);
  await scheduler.start();
  assert.equal(scheduler.isRunning(), true);
  scheduler.stop();
  assert.equal(scheduler.isRunning(), false);
});

test('scheduler status returns correct shape', () => {
  resetAllCaches();
  const { createScheduler } = require('../src/services/reminderScheduler');
  const config = {
    mode: 'cloud',
    reminderEnabled: true,
    reminderOffsetMinutes: 0,
    reminderPollIntervalMinutes: 5
  };
  const client = { mode: 'cloud', sendTemplate: async () => ({ accepted: true, messageId: 'x' }) };
  const notificationService = { getAllSubscriptions: async () => [] };
  const delivery = require('../src/services/reminderDelivery');

  const scheduler = createScheduler(config, client, delivery, notificationService, () => []);
  const status = scheduler.getStatus();
  assert.ok(status);
  assert.equal(status.enabled, true);
  assert.equal(status.cloudMode, true);
  assert.equal(status.running, false);
  assert.equal(status.template, 'clan_mission_reminder');
  assert.equal(status.pollIntervalMs, 5 * 60 * 1000);
  assert.equal(status.offsetMinutes, 0);
});
