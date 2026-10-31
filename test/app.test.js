const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig, validateConfig } = require('../src/config');
const { cloudEnv, silenceLogs, startServer } = require('./helpers');

let restore;
test.before(() => { restore = silenceLogs(); });
test.after(() => restore());

const postJson = (url, body) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body
});

test('GET / and /health respond', async () => {
  const s = await startServer({ WHATSAPP_MODE: 'mock' });
  try {
    const info = await (await fetch(`${s.base}/`)).json();
    assert.equal(info.name, 'TACTIOPBOT ✦ Eagle Eye');
    const health = await fetch(`${s.base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'ok');
  } finally { await s.close(); }
});

test('/dev/message returns the generated reply in mock mode', async () => {
  const s = await startServer({ WHATSAPP_MODE: 'mock' });
  try {
    const res = await postJson(`${s.base}/dev/message`, JSON.stringify({ from: 'local-test', text: '!help' }));
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.reply, /!clanmission/);
    assert.equal(data.sentToWhatsApp, false);
    assert.equal(s.sent.length, 0);
  } finally { await s.close(); }
});

test('/dev/message validates input', async () => {
  const s = await startServer({ WHATSAPP_MODE: 'mock' });
  try {
    const url = `${s.base}/dev/message`;
    assert.equal((await postJson(url, '{"from":"a"}')).status, 400);
    assert.equal((await postJson(url, '{"text":"!help"}')).status, 400);
    assert.equal((await postJson(url, 'not json')).status, 400);
  } finally { await s.close(); }
});

test('/dev/message is unavailable in production and in cloud mode', async () => {
  for (const env of [{ WHATSAPP_MODE: 'mock', NODE_ENV: 'production' }, cloudEnv]) {
    const s = await startServer(env);
    try {
      assert.equal(s.devEnabled, false);
      const res = await postJson(`${s.base}/dev/message`, JSON.stringify({ from: 'x', text: '!help' }));
      assert.equal(res.status, 404);
    } finally { await s.close(); }
  }
});

test('/dev/message is rate limited', async () => {
  const s = await startServer({ WHATSAPP_MODE: 'mock' });
  try {
    let last;
    for (let i = 0; i < 31; i += 1) {
      last = await postJson(`${s.base}/dev/message`, JSON.stringify({ from: 'x', text: 'hi' }));
    }
    assert.equal(last.status, 429);
  } finally { await s.close(); }
});

test('validateConfig: mock mode needs no credentials', () => {
  assert.equal(validateConfig(loadConfig({})).ok, true);
});

test('validateConfig: cloud mode reports missing variable NAMES only', () => {
  const result = validateConfig(loadConfig({ WHATSAPP_MODE: 'cloud', NODE_ENV: 'production' }));
  assert.equal(result.ok, false);
  const text = result.errors.join(' ');
  for (const name of ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_API_VERSION', 'WHATSAPP_APP_SECRET']) {
    assert.ok(text.includes(name), `should mention ${name}`);
  }
});

test('validateConfig: bad mode, port and API version are rejected', () => {
  assert.equal(validateConfig(loadConfig({ WHATSAPP_MODE: 'banana' })).ok, false);
  assert.equal(validateConfig(loadConfig({ PORT: 'abc' })).ok, false);
  assert.equal(validateConfig(loadConfig({ ...cloudEnv, WHATSAPP_API_VERSION: 'latest' })).ok, false);
  assert.equal(validateConfig(loadConfig(cloudEnv)).ok, true);
});
