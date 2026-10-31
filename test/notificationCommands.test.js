const test = require('node:test');
const assert = require('node:assert/strict');

function resetCache() {
  delete require.cache[require.resolve('../src/services/notificationService')];
  delete require.cache[require.resolve('../src/services/notificationLanguages')];
  delete require.cache[require.resolve('../src/commands/setcmnotif')];
  delete require.cache[require.resolve('../src/commands/editcmnotif')];
  delete require.cache[require.resolve('../src/commands/deletecmnotif')];
  delete require.cache[require.resolve('../src/commands/reminderstatus')];
}

function mockNotificationService(impl) {
  const modId = require.resolve('../src/services/notificationService');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: impl
  };
}

const SUBSCRIBER_A = '+15550001111';
const SUBSCRIBER_B = '+15550002222';

test('setcmnotif creates a new subscription', async () => {
  resetCache();
  mockNotificationService({
    getSubscription: async () => null,
    setSubscription: async (from, config) => {
      assert.equal(from, SUBSCRIBER_A);
      assert.equal(config.enabled, true);
      assert.equal(config.language, 'English');
      return true;
    }
  });
  const { run } = require('../src/commands/setcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!setcmnotif', args: '' });
  assert.ok(result.includes('Subscribed to Clan Mission notifications'));
  assert.ok(result.includes('not yet active'));
});

test('setcmnotif rejects when sender identity is missing', async () => {
  resetCache();
  mockNotificationService({ getSubscription: async () => null, setSubscription: async () => true });
  const { run } = require('../src/commands/setcmnotif');
  const result = await run({ from: '', text: '!setcmnotif', args: '' });
  assert.ok(result.includes('Unable to identify'));
});

test('setcmnotif rejects unsupported language', async () => {
  resetCache();
  mockNotificationService({ getSubscription: async () => null, setSubscription: async () => true });
  const { run } = require('../src/commands/setcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!setcmnotif', args: 'language Klingon' });
  assert.ok(result.includes('Unsupported language'));
});

test('setcmnotif sets language and enabled correctly', async () => {
  resetCache();
  let capturedConfig = null;
  mockNotificationService({
    getSubscription: async () => null,
    setSubscription: async (from, config) => { capturedConfig = config; return true; }
  });
  const { run } = require('../src/commands/setcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!setcmnotif', args: 'language English enabled false' });
  assert.equal(capturedConfig.language, 'English');
  assert.equal(capturedConfig.enabled, false);
  assert.ok(result.includes('Current language: English'));
});

test('setcmnotif already subscribed does not create duplicate', async () => {
  resetCache();
  let writeCount = 0;
  mockNotificationService({
    getSubscription: async () => ({ phoneNumber: SUBSCRIBER_A, enabled: true, language: 'English' }),
    setSubscription: async () => { writeCount += 1; return true; }
  });
  const { run } = require('../src/commands/setcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!setcmnotif', args: '' });
  assert.ok(result.includes('Subscribed to Clan Mission notifications'));
  assert.equal(writeCount, 0);
});

test('setcmnotif reports database failure', async () => {
  resetCache();
  mockNotificationService({ getSubscription: async () => null, setSubscription: async () => false });
  const { run } = require('../src/commands/setcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!setcmnotif', args: '' });
  assert.ok(result.includes('Database unavailable'));
});

test('editcmnotif requires existing subscription', async () => {
  resetCache();
  mockNotificationService({ getSubscription: async () => null, setSubscription: async () => true });
  const { run } = require('../src/commands/editcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!editcmnotif', args: 'language Arabic' });
  assert.ok(result.includes('not subscribed'));
});

test('editcmnotif changes language', async () => {
  resetCache();
  let capturedConfig = null;
  mockNotificationService({
    getSubscription: async () => ({ phoneNumber: SUBSCRIBER_A, enabled: true, language: 'English' }),
    setSubscription: async (from, config) => { capturedConfig = config; return true; }
  });
  const { run } = require('../src/commands/editcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!editcmnotif', args: 'language English' });
  assert.equal(capturedConfig.language, 'English');
  assert.ok(result.includes('Notification settings updated'));
  assert.ok(result.includes('Language: English'));
});

test('editcmnotif disables notifications', async () => {
  resetCache();
  let capturedConfig = null;
  mockNotificationService({
    getSubscription: async () => ({ phoneNumber: SUBSCRIBER_A, enabled: true, language: 'English' }),
    setSubscription: async (from, config) => { capturedConfig = config; return true; }
  });
  const { run } = require('../src/commands/editcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!editcmnotif', args: 'enabled false' });
  assert.equal(capturedConfig.enabled, false);
  assert.ok(result.includes('Enabled: No'));
});

test('editcmnotif rejects unsupported language', async () => {
  resetCache();
  mockNotificationService({
    getSubscription: async () => ({ phoneNumber: SUBSCRIBER_A, enabled: true, language: 'English' }),
    setSubscription: async () => true
  });
  const { run } = require('../src/commands/editcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!editcmnotif', args: 'language Klingon' });
  assert.ok(result.includes('Unsupported language'));
});

test('editcmnotif reports database failure', async () => {
  resetCache();
  mockNotificationService({
    getSubscription: async () => ({ phoneNumber: SUBSCRIBER_A, enabled: true, language: 'English' }),
    setSubscription: async () => false
  });
  const { run } = require('../src/commands/editcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!editcmnotif', args: 'enabled false' });
  assert.ok(result.includes('Database unavailable'));
});

test('deletecmnotif unsubscribes successfully', async () => {
  resetCache();
  let deleted = false;
  mockNotificationService({
    getSubscription: async () => ({ phoneNumber: SUBSCRIBER_A, enabled: true, language: 'English' }),
    deleteSubscription: async (from) => { deleted = true; assert.equal(from, SUBSCRIBER_A); return true; }
  });
  const { run } = require('../src/commands/deletecmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!deletecmnotif', args: '' });
  assert.equal(deleted, true);
  assert.ok(result.includes('Unsubscribed from Clan Mission notifications'));
});

test('deletecmnotif is idempotent when no subscription exists', async () => {
  resetCache();
  mockNotificationService({
    getSubscription: async () => null,
    deleteSubscription: async () => { throw new Error('deleteSubscription should not be called when no subscription exists'); }
  });
  const { run } = require('../src/commands/deletecmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!deletecmnotif', args: '' });
  assert.ok(result.includes('not subscribed'));
});

test('deletecmnotif reports database failure', async () => {
  resetCache();
  mockNotificationService({
    getSubscription: async () => ({ phoneNumber: SUBSCRIBER_A, enabled: true, language: 'English' }),
    deleteSubscription: async () => false
  });
  const { run } = require('../src/commands/deletecmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!deletecmnotif', args: '' });
  assert.ok(result.includes('Database unavailable'));
});

test('reminderstatus shows unsubscribed when no subscription', async () => {
  resetCache();
  mockNotificationService({ getSubscription: async () => null });
  const { run } = require('../src/commands/reminderstatus');
  const result = await run({ from: SUBSCRIBER_A, text: '!reminderstatus', args: '' });
  assert.ok(result.includes('Clan Mission Notification Status'));
  assert.ok(result.includes('not subscribed'));
  assert.ok(result.includes('Automatic delivery is not yet active'));
});

test('reminderstatus shows subscribed enabled', async () => {
  resetCache();
  mockNotificationService({ getSubscription: async () => ({ phoneNumber: SUBSCRIBER_A, enabled: true, language: 'English' }) });
  const { run } = require('../src/commands/reminderstatus');
  const result = await run({ from: SUBSCRIBER_A, text: '!reminderstatus', args: '' });
  assert.ok(result.includes('Subscribed: Yes'));
  assert.ok(result.includes('Notifications: Enabled'));
  assert.ok(result.includes('Language: English'));
  assert.ok(result.includes('not yet active'));
});

test('reminderstatus shows subscribed disabled', async () => {
  resetCache();
  mockNotificationService({ getSubscription: async () => ({ phoneNumber: SUBSCRIBER_A, enabled: false, language: 'Arabic' }) });
  const { run } = require('../src/commands/reminderstatus');
  const result = await run({ from: SUBSCRIBER_A, text: '!reminderstatus', args: '' });
  assert.ok(result.includes('Notifications: Disabled'));
  assert.ok(result.includes('Language: Arabic'));
});

test('setcmnotif for sender A is isolated from sender B', async () => {
  resetCache();
  const subs = {};
  mockNotificationService({
    getSubscription: async (from) => subs[from] || null,
    setSubscription: async (from, config) => { subs[from] = config; return true; }
  });
  const { run } = require('../src/commands/setcmnotif');

  await run({ from: SUBSCRIBER_A, text: '!setcmnotif', args: 'language Arabic' });
  await run({ from: SUBSCRIBER_B, text: '!setcmnotif', args: 'language German' });

  assert.equal(subs[SUBSCRIBER_A].language, 'Arabic');
  assert.equal(subs[SUBSCRIBER_B].language, 'German');
});

test('editcmnotif cannot edit another sender subscription', async () => {
  resetCache();
  const subs = {
    [SUBSCRIBER_B]: { phoneNumber: SUBSCRIBER_B, enabled: true, language: 'English' }
  };
  mockNotificationService({
    getSubscription: async (from) => subs[from] || null,
    setSubscription: async () => true
  });
  const { run } = require('../src/commands/editcmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!editcmnotif', args: 'language German' });
  assert.ok(result.includes('not subscribed'));
});

test('deletecmnotif cannot delete another sender subscription', async () => {
  resetCache();
  const subs = { [SUBSCRIBER_B]: { phoneNumber: SUBSCRIBER_B, enabled: true, language: 'English' } };
  let deletedFor = null;
  mockNotificationService({
    getSubscription: async (from) => subs[from] || null,
    deleteSubscription: async (from) => { deletedFor = from; delete subs[from]; return true; }
  });
  const { run } = require('../src/commands/deletecmnotif');
  const result = await run({ from: SUBSCRIBER_A, text: '!deletecmnotif', args: '' });
  assert.ok(result.includes('not subscribed'));
  assert.notEqual(deletedFor, SUBSCRIBER_B);
});

test('notificationLanguages exports all supported languages', () => {
  resetCache();
  const { getSupportedLanguages, isSupportedLanguage, getLanguage } = require('../src/services/notificationLanguages');
  const langs = getSupportedLanguages();
  assert.ok(langs.length >= 20);
  assert.ok(isSupportedLanguage('English'));
  assert.ok(isSupportedLanguage('Arabic'));
  assert.ok(isSupportedLanguage('Japanese'));
  assert.ok(!isSupportedLanguage('Klingon'));
  const def = getLanguage('Klingon');
  assert.equal(def.languageCurrent, 'Current language: English');
});
