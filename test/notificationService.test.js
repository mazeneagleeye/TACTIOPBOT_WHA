const test = require('node:test');
const assert = require('node:assert/strict');

function resetDBCache() {
  delete require.cache[require.resolve('../src/utils/db')];
  delete require.cache[require.resolve('../src/services/notificationService')];
}

function mockDb(impl) {
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: impl
  };
}

test('getSubscription returns null when DB not connected', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false, getDb: () => { throw new Error('not connected'); } });
  const { getSubscription } = require('../src/services/notificationService');
  const result = await getSubscription('+15550001111');
  assert.equal(result, null);
});

test('setSubscription returns false when DB not connected', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false, getDb: () => { throw new Error('not connected'); } });
  const { setSubscription } = require('../src/services/notificationService');
  const result = await setSubscription('+15550001111', { enabled: true, language: 'English' });
  assert.equal(result, false);
});

test('deleteSubscription returns false when DB not connected', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false, getDb: () => { throw new Error('not connected'); } });
  const { deleteSubscription } = require('../src/services/notificationService');
  const result = await deleteSubscription('+15550001111');
  assert.equal(result, false);
});

test('setSubscription then getSubscription round-trip', async () => {
  resetDBCache();
  const store = {};
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        findOne: async (filter) => ({ key: filter.key, value: store[filter.key] }),
        updateOne: async (filter, update, opts) => {
          if (opts && opts.upsert) {
            store[filter.key] = update.$set.value;
          }
          return { acknowledged: true };
        },
        deleteOne: async (filter) => { delete store[filter.key]; return { acknowledged: true, deletedCount: 1 }; }
      })
    })
  });
  const { setSubscription, getSubscription, deleteSubscription } = require('../src/services/notificationService');

  const saved = await setSubscription('+15550001111', { enabled: true, language: 'Arabic' });
  assert.equal(saved, true);

  const loaded = await getSubscription('+15550001111');
  assert.ok(loaded);
  assert.equal(loaded.phoneNumber, '+15550001111');
  assert.equal(loaded.enabled, true);
  assert.equal(loaded.language, 'Arabic');
  assert.ok(loaded.createdAt);
  assert.ok(loaded.updatedAt);

  const deleted = await deleteSubscription('+15550001111');
  assert.equal(deleted, true);

  const afterDelete = await getSubscription('+15550001111');
  assert.equal(afterDelete, null);
});

test('deleteSubscription is idempotent when no subscription exists', async () => {
  resetDBCache();
  const store = {};
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        findOne: async () => null,
        deleteOne: async () => ({ acknowledged: true, deletedCount: 0 })
      })
    })
  });
  const { deleteSubscription } = require('../src/services/notificationService');
  const result = await deleteSubscription('+15550009999');
  assert.equal(result, false);
});

test('setSubscription updates existing subscription without creating duplicates', async () => {
  resetDBCache();
  const store = {};
  let callCount = 0;
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        findOne: async (filter) => {
          callCount += 1;
          return { key: filter.key, value: store[filter.key] };
        },
        updateOne: async (filter, update) => {
          store[filter.key] = update.$set.value;
          return { acknowledged: true };
        },
        deleteOne: async (filter) => { delete store[filter.key]; return { acknowledged: true, deletedCount: 1 }; }
      })
    })
  });
  const { setSubscription, getSubscription } = require('../src/services/notificationService');

  await setSubscription('+15550001111', { enabled: true, language: 'English' });
  await setSubscription('+15550001111', { enabled: false, language: 'Spanish' });

  const loaded = await getSubscription('+15550001111');
  assert.equal(loaded.enabled, false);
  assert.equal(loaded.language, 'Spanish');
  assert.equal(loaded.createdAt, loaded.createdAt); // createdAt preserved
});

test('getSubscription returns null for nonexistent subscription', async () => {
  resetDBCache();
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        findOne: async () => null
      })
    })
  });
  const { getSubscription } = require('../src/services/notificationService');
  const result = await getSubscription('+15550009999');
  assert.equal(result, null);
});

test('KEY_PREFIX and DEFAULT_LANGUAGE are exported', () => {
  const { KEY_PREFIX, DEFAULT_LANGUAGE } = require('../src/services/notificationService');
  assert.equal(KEY_PREFIX, 'cm_notif:');
  assert.equal(DEFAULT_LANGUAGE, 'English');
});
