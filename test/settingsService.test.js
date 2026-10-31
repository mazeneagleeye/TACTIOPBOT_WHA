const test = require('node:test');
const assert = require('node:assert/strict');

function resetModuleCache() {
  delete require.cache[require.resolve('../src/utils/db')];
  delete require.cache[require.resolve('../src/services/settingsService')];
  delete require.cache[require.resolve('../src/commands/clanmission')];
  delete require.cache[require.resolve('../src/commands/nextreset')];
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

test('settingsService.getSetting returns default when DB not connected', async (t) => {
  resetModuleCache();
  mockDb({ isConnected: () => false, getDb: () => { throw new Error('not connected'); } });
  const { getSetting } = require('../src/services/settingsService');
  const result = await getSetting('clanMission', 'default-value');
  assert.equal(result, 'default-value');
});

test('settingsService.getSetting returns stored value when DB connected', async (t) => {
  resetModuleCache();
  const store = {};
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        findOne: async (filter) => ({ key: filter.key, value: store[filter.key] }),
        updateOne: async (filter, update) => { store[filter.key] = update.$set.value; return { acknowledged: true }; }
      })
    })
  });
  const { getSetting, setSetting } = require('../src/services/settingsService');
  await setSetting('clanMission', 'Defeat the boss!');
  const result = await getSetting('clanMission', 'default-value');
  assert.equal(result, 'Defeat the boss!');
});

test('settingsService.setSetting returns false when DB not connected', async (t) => {
  resetModuleCache();
  mockDb({ isConnected: () => false, getDb: () => { throw new Error('not connected'); } });
  const { setSetting } = require('../src/services/settingsService');
  const result = await setSetting('clanMission', 'test');
  assert.equal(result, false);
});

test('settingsService.setSetting upserts and returns true when DB connected', async (t) => {
  resetModuleCache();
  const store = {};
  let upserted = false;
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        updateOne: async (filter, update, opts) => {
          if (opts && opts.upsert) {
            store[filter.key] = update.$set.value;
            upserted = true;
          }
          return { acknowledged: true, upsertedId: 'x' };
        }
      })
    })
  });
  const { setSetting } = require('../src/services/settingsService');
  const result = await setSetting('nextReset', '2026-11-01 00:00 UTC');
  assert.equal(result, true);
  assert.equal(upserted, true);
  assert.equal(store['nextReset'], '2026-11-01 00:00 UTC');
});

test('settingsService.getAllSettings returns nulls when DB not connected', async (t) => {
  resetModuleCache();
  mockDb({ isConnected: () => false, getDb: () => { throw new Error('not connected'); } });
  const { getAllSettings } = require('../src/services/settingsService');
  const result = await getAllSettings(['clanMission', 'nextReset']);
  assert.deepEqual(result, { clanMission: null, nextReset: null });
});

test('settingsService.getAllSettings returns stored values when DB connected', async (t) => {
  resetModuleCache();
  const store = { clanMission: 'Kill 10 mobs', nextReset: '2026-11-02' };
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        find: () => ({
          toArray: async () => Object.entries(store).map(([key, value]) => ({ key, value }))
        })
      })
    })
  });
  const { getAllSettings } = require('../src/services/settingsService');
  const result = await getAllSettings(['clanMission', 'nextReset']);
  assert.deepEqual(result, { clanMission: 'Kill 10 mobs', nextReset: '2026-11-02' });
});

test('clanmission command starts interactive setup when no context', async () => {
  resetModuleCache();
  mockDb({ isConnected: () => false, getDb: () => { throw new Error('not connected'); } });
  const { run } = require('../src/commands/clanmission');
  const result = await run();
  assert.match(result, /Clan Mission Setup/);
  assert.match(result, /Placement Mode/);
});

test('clanmission command starts interactive setup with !clanmission text', async () => {
  resetModuleCache();
  mockDb({ isConnected: () => false, getDb: () => { throw new Error('not connected'); } });
  const { run } = require('../src/commands/clanmission');
  const result = await run({ from: '+15550001111', text: '!clanmission', adminNumbers: [], args: '' });
  assert.match(result, /Clan Mission Setup/);
  assert.match(result, /Placement Mode/);
});

test('nextreset command shows calculated reset when no setting and DB not connected', async (t) => {
  resetModuleCache();
  mockDb({ isConnected: () => false, getDb: () => { throw new Error('not connected'); } });
  const { run } = require('../src/commands/nextreset');
  const result = await run();
  assert.match(result, /\*Next Reset\*/);
  assert.match(result, /\(UTC:/);
});

test('nextreset command uses persisted reset_schedule config when available', async (t) => {
  resetModuleCache();
  const { getDefaultAnchorUtcMs, getCycleMs, buildConfig } = require('../src/services/resetSchedule');
  const anchor = getDefaultAnchorUtcMs();
  const store = { reset_schedule: JSON.stringify(buildConfig(anchor, getCycleMs(), 'Africa/Cairo')) };
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        findOne: async (filter) => ({ key: filter.key, value: store[filter.key] })
      })
    })
  });
  const { run } = require('../src/commands/nextreset');
  const result = await run();
  assert.match(result, /\*Next Reset\*/);
  assert.match(result, /\(UTC:/);
});

test('settings service does not store credentials', async (t) => {
  resetModuleCache();
  const store = {};
  let storedKey = null;
  let storedValue = null;
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        updateOne: async (filter, update) => {
          storedKey = filter.key;
          storedValue = update.$set.value;
          return { acknowledged: true };
        },
        findOne: async () => null
      })
    })
  });
  const { setSetting } = require('../src/services/settingsService');
  await setSetting('clanMission', 'Defeat the boss');
  assert.ok(!/token|secret|password|credential/i.test(storedKey));
  assert.ok(!/token|secret|password|credential/i.test(String(storedValue)));
});
