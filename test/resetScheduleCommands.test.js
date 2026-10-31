const test = require('node:test');
const assert = require('node:assert/strict');

const SUBSCRIBER_A = '+15550001111';
const ADMIN_NUMBER = '+15550001111';
const ADMIN_CTX = { from: ADMIN_NUMBER, adminNumbers: [ADMIN_NUMBER] };

function resetCache() {
  delete require.cache[require.resolve('../src/services/settingsService')];
  delete require.cache[require.resolve('../src/services/adminService')];
  delete require.cache[require.resolve('../src/services/resetSchedule')];
  delete require.cache[require.resolve('../src/commands/nextreset')];
  delete require.cache[require.resolve('../src/commands/setnextreset')];
}

function mockGetSetting(impl) {
  const modId = require.resolve('../src/services/settingsService');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: { getSetting: impl }
  };
}

function mockUpdateSetting(impl) {
  const modId = require.resolve('../src/services/adminService');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: {
      updateSetting: impl,
      isAuthorized: (sender, adminNumbers) => {
        if (!sender || typeof sender !== 'string') return false;
        if (!Array.isArray(adminNumbers) || adminNumbers.length === 0) return false;
        return adminNumbers.includes(sender);
      }
    }
  };
}

// ---------------------------------------------------------------------------
// !nextreset tests
// ---------------------------------------------------------------------------

test('nextreset uses default anchor when no schedule config exists', async () => {
  resetCache();
  mockGetSetting(async () => null);
  const { run } = require('../src/commands/nextreset');
  const result = await run({ from: SUBSCRIBER_A, args: '' });
  assert.ok(result.includes('*Next Reset*'));
  assert.ok(result.includes('(UTC:'));
});

test('nextreset uses persisted schedule config when available', async () => {
  resetCache();
  const { getDefaultAnchorUtcMs, getCycleMs, buildConfig } = require('../src/services/resetSchedule');
  const anchor = getDefaultAnchorUtcMs();
  const config = JSON.stringify(buildConfig(anchor, getCycleMs(), 'Africa/Cairo'));
  mockGetSetting(async () => config);
  const { run } = require('../src/commands/nextreset');
  const result = await run({ from: SUBSCRIBER_A, args: '' });
  assert.ok(result.includes('*Next Reset*'));
  assert.ok(result.includes('(UTC:'));
});

test('nextreset falls back to default when stored config is invalid', async () => {
  resetCache();
  mockGetSetting(async () => 'not-valid-json');
  const { run } = require('../src/commands/nextreset');
  const result = await run({ from: SUBSCRIBER_A, args: '' });
  assert.ok(result.includes('*Next Reset*'));
  assert.ok(result.includes('(UTC:'));
});

test('nextreset falls back to default when stored config is incomplete', async () => {
  resetCache();
  mockGetSetting(async () => JSON.stringify({ foo: 'bar' }));
  const { run } = require('../src/commands/nextreset');
  const result = await run({ from: SUBSCRIBER_A, args: '' });
  assert.ok(result.includes('*Next Reset*'));
  assert.ok(result.includes('(UTC:'));
});

test('nextreset output includes UTC timestamp', async () => {
  resetCache();
  mockGetSetting(async () => null);
  const { run } = require('../src/commands/nextreset');
  const result = await run({ from: SUBSCRIBER_A, args: '' });
  assert.ok(result.match(/\(UTC: \d{4}-\d{2}-\d{2}T/), `Expected UTC timestamp in output, got: ${result}`);
});

// ---------------------------------------------------------------------------
// !setnextreset tests
// ---------------------------------------------------------------------------

test('setnextreset rejects empty input', async () => {
  resetCache();
  mockUpdateSetting(async () => ({ ok: true, message: 'ok' }));
  const { run } = require('../src/commands/setnextreset');
  const result = await run({ ...ADMIN_CTX, args: '' });
  assert.ok(result.includes('Usage:'));
});

test('setnextreset rejects invalid date', async () => {
  resetCache();
  mockUpdateSetting(async () => ({ ok: true, message: 'ok' }));
  const { run } = require('../src/commands/setnextreset');
  const result = await run({ ...ADMIN_CTX, args: 'not-a-date' });
  assert.ok(result.includes('Invalid date/time'));
});

test('setnextreset accepts valid ISO date with Z suffix', async () => {
  resetCache();
  let capturedKey = null;
  let capturedValue = null;
  let capturedSender = null;
  mockUpdateSetting(async (key, value, sender) => {
    capturedKey = key;
    capturedValue = value;
    capturedSender = sender;
    return { ok: true, message: 'ok' };
  });
  const { run } = require('../src/commands/setnextreset');
  const result = await run({ ...ADMIN_CTX, args: '2026-06-26T06:00:00Z' });
  assert.equal(capturedKey, 'reset_schedule');
  assert.equal(capturedSender, ADMIN_NUMBER);
  const parsed = JSON.parse(capturedValue);
  assert.equal(parsed.timezone, 'Africa/Cairo');
  assert.ok(Number.isFinite(parsed.anchorUtcMs));
  assert.ok(result.includes('*Reset schedule anchor updated*'));
});

test('setnextreset accepts valid ISO date without offset (interpreted as Cairo local)', async () => {
  resetCache();
  let capturedKey = null;
  mockUpdateSetting(async (key) => { capturedKey = key; return { ok: true, message: 'ok' }; });
  const { run } = require('../src/commands/setnextreset');
  const result = await run({ ...ADMIN_CTX, args: '2026-06-26T06:00' });
  assert.equal(capturedKey, 'reset_schedule');
  assert.ok(result.includes('*Reset schedule anchor updated*'));
  assert.ok(result.includes('Subsequent resets occur every 4 days 3 hours'));
});

test('setnextreset rejects unauthorized sender', async () => {
  resetCache();
  mockUpdateSetting(async () => ({ ok: false, error: 'unauthorized' }));
  const { run } = require('../src/commands/setnextreset');
  const result = await run({ from: SUBSCRIBER_A, args: '2026-06-26T06:00' });
  assert.ok(result.includes('Unauthorized'));
});

test('setnextreset reports database unavailable', async () => {
  resetCache();
  mockUpdateSetting(async () => ({ ok: false, error: 'database_unavailable' }));
  const { run } = require('../src/commands/setnextreset');
  const result = await run({ ...ADMIN_CTX, args: '2026-06-26T06:00' });
  assert.ok(result.includes('Database unavailable'));
});

test('setnextreset requires adminNumbers to be set', async () => {
  resetCache();
  mockUpdateSetting(async () => ({ ok: false, error: 'unauthorized' }));
  const { run } = require('../src/commands/setnextreset');
  const result = await run({ from: ADMIN_NUMBER, adminNumbers: [], args: '2026-06-26T06:00' });
  assert.ok(result.includes('Unauthorized'));
});
