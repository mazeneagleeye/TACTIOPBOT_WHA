const test = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// templateConfig tests
// ---------------------------------------------------------------------------

const {
  TEMPLATE_NAME,
  TEMPLATE_CATEGORY,
  TEMPLATE_PARAMETERS,
  LANGUAGE_CODE_MAP,
  TEMPLATE_BODY_REFERENCE,
  UNVERIFIED_LANGUAGES,
  getMetaLanguageCode,
  isLanguageMapped,
  isLanguageVerified,
  getMappedLanguages,
  getTemplateConfig
} = require('../src/services/templateConfig');

test('TEMPLATE_NAME is clan_mission_reminder', () => {
  assert.equal(TEMPLATE_NAME, 'clan_mission_reminder');
});

test('TEMPLATE_CATEGORY is utility', () => {
  assert.equal(TEMPLATE_CATEGORY, 'utility');
});

test('TEMPLATE_PARAMETERS has 2 parameters', () => {
  assert.equal(TEMPLATE_PARAMETERS.length, 2);
  assert.equal(TEMPLATE_PARAMETERS[0].name, 'reset_datetime');
  assert.equal(TEMPLATE_PARAMETERS[1].name, 'reminder_type');
});

test('LANGUAGE_CODE_MAP has 23 entries', () => {
  assert.equal(Object.keys(LANGUAGE_CODE_MAP).length, 23);
});

test('getMetaLanguageCode returns correct codes', () => {
  assert.equal(getMetaLanguageCode('English'), 'en');
  assert.equal(getMetaLanguageCode('Arabic'), 'ar');
  assert.equal(getMetaLanguageCode('Spanish'), 'es');
  assert.equal(getMetaLanguageCode('Portuguese'), 'pt');
  assert.equal(getMetaLanguageCode('Russian'), 'ru');
  assert.equal(getMetaLanguageCode('French'), 'fr');
  assert.equal(getMetaLanguageCode('German'), 'de');
  assert.equal(getMetaLanguageCode('Turkish'), 'tr');
  assert.equal(getMetaLanguageCode('Indonesian'), 'id');
  assert.equal(getMetaLanguageCode('Polish'), 'pl');
  assert.equal(getMetaLanguageCode('Italian'), 'it');
  assert.equal(getMetaLanguageCode('Ukrainian'), 'uk');
  assert.equal(getMetaLanguageCode('Japanese'), 'ja');
  assert.equal(getMetaLanguageCode('Korean'), 'ko');
  assert.equal(getMetaLanguageCode('Vietnamese'), 'vi');
  assert.equal(getMetaLanguageCode('Thai'), 'th');
  assert.equal(getMetaLanguageCode('Chinese'), 'zh');
  assert.equal(getMetaLanguageCode('Hindi'), 'hi');
  assert.equal(getMetaLanguageCode('Dutch'), 'nl');
  assert.equal(getMetaLanguageCode('Swedish'), 'sv');
  assert.equal(getMetaLanguageCode('Czech'), 'cs');
  assert.equal(getMetaLanguageCode('Hungarian'), 'hu');
  assert.equal(getMetaLanguageCode('Romanian'), 'ro');
});

test('getMetaLanguageCode returns null for unknown language', () => {
  assert.equal(getMetaLanguageCode('Klingon'), null);
  assert.equal(getMetaLanguageCode(null), null);
  assert.equal(getMetaLanguageCode(123), null);
});

test('isLanguageMapped returns true for known languages', () => {
  assert.equal(isLanguageMapped('English'), true);
  assert.equal(isLanguageMapped('Arabic'), true);
  assert.equal(isLanguageMapped('Chinese'), true);
});

test('isLanguageMapped returns false for unknown languages', () => {
  assert.equal(isLanguageMapped('Klingon'), false);
  assert.equal(isLanguageMapped(''), false);
});

test('isLanguageVerified returns true for languages with template reference', () => {
  assert.equal(isLanguageVerified('English'), true);
  assert.equal(isLanguageVerified('Arabic'), true);
});

test('isLanguageVerified returns false for unmapped languages', () => {
  assert.equal(isLanguageVerified('Klingon'), false);
});

test('getMappedLanguages returns 23 languages', () => {
  const langs = getMappedLanguages();
  assert.equal(langs.length, 23);
  assert.ok(langs.includes('English'));
  assert.ok(langs.includes('Arabic'));
});

test('TEMPLATE_BODY_REFERENCE has entries for all 23 Meta codes', () => {
  const codes = new Set(Object.values(LANGUAGE_CODE_MAP));
  assert.equal(codes.size, 23);
  for (const code of codes) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(TEMPLATE_BODY_REFERENCE, code),
      `Missing template body reference for Meta code: ${code}`
    );
    assert.ok(typeof TEMPLATE_BODY_REFERENCE[code] === 'string');
    assert.ok(TEMPLATE_BODY_REFERENCE[code].length > 0);
  }
});

test('UNVERIFIED_LANGUAGES is a Set', () => {
  assert.ok(UNVERIFIED_LANGUAGES instanceof Set);
});

test('getTemplateConfig returns defaults from empty env', () => {
  const config = getTemplateConfig({});
  assert.equal(config.name, 'clan_mission_reminder');
  assert.equal(config.category, 'utility');
  assert.equal(config.enabled, false);
  assert.equal(config.languageCodeDefault, 'en');
  assert.equal(config.offsetMinutes, 0);
  assert.equal(config.pollIntervalMs, 5 * 60 * 1000);
  assert.equal(Array.isArray(config.parameters), true);
});

test('getTemplateConfig reads reminderEnabled=true', () => {
  const config = getTemplateConfig({ reminderEnabled: true });
  assert.equal(config.enabled, true);
});

test('getTemplateConfig reads reminderOffsetMinutes', () => {
  const config = getTemplateConfig({ reminderOffsetMinutes: 30 });
  assert.equal(config.offsetMinutes, 30);
});

test('getTemplateConfig reads reminderPollIntervalMinutes', () => {
  const config = getTemplateConfig({ reminderPollIntervalMinutes: 10 });
  assert.equal(config.pollIntervalMs, 10 * 60 * 1000);
});

test('getTemplateConfig clamps poll interval to minimum 1 minute', () => {
  const config = getTemplateConfig({ reminderPollIntervalMinutes: 0 });
  assert.equal(config.pollIntervalMs, 1 * 60 * 1000);
});

// ---------------------------------------------------------------------------
// whatsappApi sendTemplate tests
// ---------------------------------------------------------------------------

function resetWhatsAppApiCache() {
  delete require.cache[require.resolve('../src/services/whatsappApi')];
}

function mockFetch(impl) {
  const modId = require.resolve('../src/services/whatsappApi');
  // We need to patch globalThis.fetch. Store original.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = impl;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test('sendTemplate returns invalid_arguments for missing to', async () => {
  resetWhatsAppApiCache();
  const restore = mockFetch(async () => new Response(JSON.stringify({}), { status: 200 }));
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({
    mode: 'cloud',
    accessToken: 'token',
    phoneNumberId: '123',
    apiVersion: 'v22.0'
  });
  const result = await client.sendTemplate('', 'clan_mission_reminder', 'en', []);
  restore();
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_arguments');
});

test('sendTemplate returns invalid_arguments for missing templateName', async () => {
  resetWhatsAppApiCache();
  const restore = mockFetch(async () => new Response(JSON.stringify({}), { status: 200 }));
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({
    mode: 'cloud',
    accessToken: 'token',
    phoneNumberId: '123',
    apiVersion: 'v22.0'
  });
  const result = await client.sendTemplate('+15550001111', '', 'en', []);
  restore();
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_arguments');
});

test('sendTemplate returns invalid_arguments for missing languageCode', async () => {
  resetWhatsAppApiCache();
  const restore = mockFetch(async () => new Response(JSON.stringify({}), { status: 200 }));
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({
    mode: 'cloud',
    accessToken: 'token',
    phoneNumberId: '123',
    apiVersion: 'v22.0'
  });
  const result = await client.sendTemplate('+15550001111', 'clan_mission_reminder', '', []);
  restore();
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_arguments');
});

test('sendTemplate returns invalid_arguments for non-array parameters', async () => {
  resetWhatsAppApiCache();
  const restore = mockFetch(async () => new Response(JSON.stringify({}), { status: 200 }));
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({
    mode: 'cloud',
    accessToken: 'token',
    phoneNumberId: '123',
    apiVersion: 'v22.0'
  });
  const result = await client.sendTemplate('+15550001111', 'clan_mission_reminder', 'en', 'not-array');
  restore();
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_arguments');
});

test('sendTemplate mock mode returns not accepted', async () => {
  resetWhatsAppApiCache();
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({ mode: 'mock' });
  const result = await client.sendTemplate(
    '+15550001111',
    'clan_mission_reminder',
    'en',
    ['30/06/2026 06:00', 'reset']
  );
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'mock_mode');
  assert.equal(result.simulated, true);
});

test('sendTemplate cloud mode builds correct payload', async () => {
  resetWhatsAppApiCache();
  let capturedBody = null;
  const restore = mockFetch(async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ messages: [{ id: 'msg_123' }] }), { status: 200 });
  });
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({
    mode: 'cloud',
    accessToken: 'token',
    phoneNumberId: '123',
    apiVersion: 'v22.0'
  });
  const result = await client.sendTemplate(
    '+15550001111',
    'clan_mission_reminder',
    'en',
    ['30/06/2026 06:00', 'reset']
  );
  restore();
  assert.equal(result.accepted, true);
  assert.equal(result.messageId, 'msg_123');
  assert.equal(capturedBody.messaging_product, 'whatsapp');
  assert.equal(capturedBody.recipient_type, 'individual');
  assert.equal(capturedBody.to, '+15550001111');
  assert.equal(capturedBody.type, 'template');
  assert.equal(capturedBody.template.name, 'clan_mission_reminder');
  assert.equal(capturedBody.template.language.code, 'en');
  assert.equal(capturedBody.template.components.length, 1);
  assert.equal(capturedBody.template.components[0].type, 'body');
  assert.equal(capturedBody.template.components[0].parameters.length, 2);
  assert.equal(capturedBody.template.components[0].parameters[0].type, 'text');
  assert.equal(capturedBody.template.components[0].parameters[0].text, '30/06/2026 06:00');
  assert.equal(capturedBody.template.components[0].parameters[1].text, 'reset');
});

test('sendTemplate cloud mode handles API success', async () => {
  resetWhatsAppApiCache();
  const restore = mockFetch(async () => new Response(JSON.stringify({ messages: [{ id: 'msg_456' }] }), { status: 200 }));
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({
    mode: 'cloud',
    accessToken: 'token',
    phoneNumberId: '123',
    apiVersion: 'v22.0'
  });
  const result = await client.sendTemplate('+15550001111', 'clan_mission_reminder', 'ar', ['مرحبا']);
  restore();
  assert.equal(result.accepted, true);
  assert.equal(result.messageId, 'msg_456');
});

test('sendTemplate cloud mode handles API failure', async () => {
  resetWhatsAppApiCache();
  const restore = mockFetch(async () => new Response(JSON.stringify({ error: { code: 190, message: 'Invalid token' } }), { status: 401 }));
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({
    mode: 'cloud',
    accessToken: 'token',
    phoneNumberId: '123',
    apiVersion: 'v22.0'
  });
  const result = await client.sendTemplate('+15550001111', 'clan_mission_reminder', 'en', []);
  restore();
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_or_expired_credentials');
  assert.equal(result.httpStatus, 401);
});

test('sendTemplate cloud mode handles rate limit', async () => {
  resetWhatsAppApiCache();
  const restore = mockFetch(async () => new Response(JSON.stringify({ error: { code: 4, message: 'Rate limited' } }), { status: 429 }));
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({
    mode: 'cloud',
    accessToken: 'token',
    phoneNumberId: '123',
    apiVersion: 'v22.0'
  });
  const result = await client.sendTemplate('+15550001111', 'clan_mission_reminder', 'en', []);
  restore();
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'rate_limited');
  assert.equal(result.httpStatus, 429);
});

test('sendTemplate does not send real messages when fetch throws', async () => {
  resetWhatsAppApiCache();
  let callCount = 0;
  const restore = mockFetch(async () => {
    callCount += 1;
    throw new Error('network down');
  });
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({
    mode: 'cloud',
    accessToken: 'token',
    phoneNumberId: '123',
    apiVersion: 'v22.0'
  });
  const result = await client.sendTemplate('+15550001111', 'clan_mission_reminder', 'en', []);
  restore();
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'network_error');
  assert.equal(callCount, 2); // initial + 1 retry
});

// ---------------------------------------------------------------------------
// sendText regressions
// ---------------------------------------------------------------------------

test('sendText still works in mock mode', async () => {
  resetWhatsAppApiCache();
  const { createWhatsAppClient } = require('../src/services/whatsappApi');
  const client = createWhatsAppClient({ mode: 'mock' });
  const result = await client.sendText('+15550001111', 'hello');
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'mock_mode');
});
