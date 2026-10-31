const test = require('node:test');
const assert = require('node:assert/strict');

function resetCache() {
  delete require.cache[require.resolve('../src/services/settingsService')];
  delete require.cache[require.resolve('../src/services/adminService')];
  delete require.cache[require.resolve('../src/commands/setnextreset')];
}

function mockSetSetting(impl) {
  const modId = require.resolve('../src/services/settingsService');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: { getSetting: async () => null, setSetting: impl }
  };
}

test('adminService.isAuthorized returns false when allowlist is empty', () => {
  resetCache();
  const { isAuthorized } = require('../src/services/adminService');
  assert.equal(isAuthorized('+15550001111', []), false);
  assert.equal(isAuthorized('+15550001111', undefined), false);
  assert.equal(isAuthorized(null, ['+15550001111']), false);
  assert.equal(isAuthorized('', ['+15550001111']), false);
});

test('adminService.isAuthorized returns true for allowlisted sender', () => {
  resetCache();
  const { isAuthorized } = require('../src/services/adminService');
  assert.equal(isAuthorized('+15550001111', ['+15550001111']), true);
  assert.equal(isAuthorized('+15550001111', ['+15550002222', '+15550001111']), true);
});

test('adminService.isAuthorized returns false for non-allowlisted sender', () => {
  resetCache();
  const { isAuthorized } = require('../src/services/adminService');
  assert.equal(isAuthorized('+15559999999', ['+15550001111']), false);
});

test('adminService.updateSetting rejects unauthorized sender', async () => {
  resetCache();
  mockSetSetting(async () => true);
  const { updateSetting } = require('../src/services/adminService');
  const result = await updateSetting('clanMission', 'test', '+15559999999', ['+15550001111']);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'unauthorized');
});

test('adminService.updateSetting denies when allowlist is empty', async () => {
  resetCache();
  mockSetSetting(async () => true);
  const { updateSetting } = require('../src/services/adminService');
  const result = await updateSetting('clanMission', 'test', '+15550001111', []);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'unauthorized');
});

test('adminService.updateSetting rejects empty value', async () => {
  resetCache();
  mockSetSetting(async () => true);
  const { updateSetting } = require('../src/services/adminService');
  const result = await updateSetting('clanMission', '', '+15550001111', ['+15550001111']);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'empty_value');

  const result2 = await updateSetting('clanMission', '   ', '+15550001111', ['+15550001111']);
  assert.equal(result2.ok, false);
  assert.equal(result2.error, 'empty_value');
});

test('adminService.updateSetting rejects value too long', async () => {
  resetCache();
  mockSetSetting(async () => true);
  const { updateSetting } = require('../src/services/adminService');
  const longValue = 'x'.repeat(1001);
  const result = await updateSetting('clanMission', longValue, '+15550001111', ['+15550001111']);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'value_too_long');
});

test('adminService.updateSetting rejects invalid key', async () => {
  resetCache();
  mockSetSetting(async () => true);
  const { updateSetting } = require('../src/services/adminService');
  const result = await updateSetting('accessToken', 'secret', '+15550001111', ['+15550001111']);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'invalid_key');
});

test('adminService.updateSetting succeeds for authorized sender with valid input', async () => {
  resetCache();
  let storedKey = null;
  let storedValue = null;
  mockSetSetting(async (key, value) => { storedKey = key; storedValue = value; return true; });
  const { updateSetting } = require('../src/services/adminService');
  const result = await updateSetting('clanMission', 'Weekly boss raid', '+15550001111', ['+15550001111']);
  assert.equal(result.ok, true);
  assert.equal(storedKey, 'clanMission');
  assert.equal(storedValue, 'Weekly boss raid');
});

test('adminService.updateSetting trims whitespace from value', async () => {
  resetCache();
  let storedValue = null;
  mockSetSetting(async (key, value) => { storedValue = value; return true; });
  const { updateSetting } = require('../src/services/adminService');
  await updateSetting('nextReset', '  Sunday 00:00 UTC  ', '+15550001111', ['+15550001111']);
  assert.equal(storedValue, 'Sunday 00:00 UTC');
});

test('adminService.updateSetting returns database_unavailable when setSetting fails', async () => {
  resetCache();
  mockSetSetting(async () => false);
  const { updateSetting } = require('../src/services/adminService');
  const result = await updateSetting('clanMission', 'test', '+15550001111', ['+15550001111']);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'database_unavailable');
});

test('setnextreset command updates setting for authorized admin', async () => {
  resetCache();
  let storedKey = null;
  let storedValue = null;
  mockSetSetting(async (key, value) => { storedKey = key; storedValue = value; return true; });
  const { run } = require('../src/commands/setnextreset');
  const result = await run({ from: '+15550001111', adminNumbers: ['+15550001111'], args: '2026-06-26T06:00:00Z' });
  assert.ok(result.includes('*Reset schedule anchor updated*'));
  assert.equal(storedKey, 'reset_schedule');
  const parsed = JSON.parse(storedValue);
  assert.equal(parsed.timezone, 'Africa/Cairo');
  assert.ok(Number.isFinite(parsed.anchorUtcMs));
});

test('setnextreset command rejects unauthorized sender', async () => {
  resetCache();
  mockSetSetting(async () => true);
  const { run } = require('../src/commands/setnextreset');
  const result = await run({ from: '+15559999999', adminNumbers: ['+15550001111'], args: 'test' });
  assert.equal(result, 'Unauthorized: you are not an admin.');
});

test('config loadConfig includes adminNumbers', () => {
  const { loadConfig } = require('../src/config');
  const config = loadConfig({ WHATSAPP_ADMIN_NUMBERS: '+15550001111, +15550002222' });
  assert.deepEqual(config.adminNumbers, ['+15550001111', '+15550002222']);
});

test('config loadConfig defaults adminNumbers to empty array', () => {
  const { loadConfig } = require('../src/config');
  const config = loadConfig({});
  assert.deepEqual(config.adminNumbers, []);
});

test('config validateConfig warns on invalid admin numbers', () => {
  const { loadConfig, validateConfig } = require('../src/config');
  const config = loadConfig({ WHATSAPP_ADMIN_NUMBERS: 'not-a-phone, +15550001111' });
  const validation = validateConfig(config);
  assert.equal(validation.ok, true);
  assert.ok(validation.warnings.some((w) => w.includes('WHATSAPP_ADMIN_NUMBERS')));
});
