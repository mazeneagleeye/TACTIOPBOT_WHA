const test = require('node:test');
const assert = require('node:assert/strict');
const { cloudEnv, silenceLogs, startServer, textPayload, sign, wait } = require('./helpers');

let restore;
test.before(() => { restore = silenceLogs(); });
test.after(() => restore());

const postWebhook = (base, body, headers = {}) => fetch(`${base}/webhook`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body
});

test('GET /webhook accepts the right token and rejects wrong ones', async () => {
  const s = await startServer(cloudEnv);
  try {
    const ok = await fetch(`${s.base}/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=12345`);
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), '12345');

    const bad = await fetch(`${s.base}/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`);
    assert.equal(bad.status, 403);

    const noToken = await fetch(`${s.base}/webhook?hub.mode=subscribe&hub.challenge=12345`);
    assert.equal(noToken.status, 403);

    const wrongMode = await fetch(`${s.base}/webhook?hub.mode=unsubscribe&hub.verify_token=verify-me&hub.challenge=1`);
    assert.equal(wrongMode.status, 403);
  } finally { await s.close(); }
});

test('GET /webhook never verifies when no verify token is configured', async () => {
  const s = await startServer({ WHATSAPP_MODE: 'mock' });
  try {
    const res = await fetch(`${s.base}/webhook?hub.mode=subscribe&hub.verify_token=&hub.challenge=1`);
    assert.equal(res.status, 403);
  } finally { await s.close(); }
});

test('POST /webhook rejects missing/invalid signatures and sends nothing', async () => {
  const s = await startServer(cloudEnv);
  try {
    const body = textPayload('!help');
    assert.equal((await postWebhook(s.base, body)).status, 401);
    const bad = await postWebhook(s.base, body, { 'X-Hub-Signature-256': `sha256=${'0'.repeat(64)}` });
    assert.equal(bad.status, 401);
    await wait(50);
    assert.equal(s.sent.length, 0);
  } finally { await s.close(); }
});

test('POST /webhook with a valid signature replies once, even if Meta re-sends it', async () => {
  const s = await startServer(cloudEnv);
  try {
    const body = textPayload('!about', 'wamid.dup');
    const headers = { 'X-Hub-Signature-256': sign(body) };
    assert.equal((await postWebhook(s.base, body, headers)).status, 200);
    assert.equal((await postWebhook(s.base, body, headers)).status, 200);
    await wait(100);
    assert.equal(s.sent.length, 1);
    assert.equal(s.sent[0].to, '1555');
    assert.match(s.sent[0].text, /WhatsApp edition/);
  } finally { await s.close(); }
});

test('POST /webhook does not reply to status events or unsupported types', async () => {
  const s = await startServer(cloudEnv);
  try {
    const body = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: {
        statuses: [{ id: 'wamid.S', status: 'delivered' }],
        messages: [{ from: '1555', id: 'wamid.I', type: 'image', image: { id: 'i' } }]
      } }] }]
    });
    const res = await postWebhook(s.base, body, { 'X-Hub-Signature-256': sign(body) });
    assert.equal(res.status, 200);
    await wait(100);
    assert.equal(s.sent.length, 0);
  } finally { await s.close(); }
});

test('POST /webhook rejects invalid JSON and oversized bodies without leaking details', async () => {
  const s = await startServer({ ...cloudEnv, WHATSAPP_APP_SECRET: '' });
  try {
    assert.equal((await postWebhook(s.base, 'nope')).status, 400);

    const big = await postWebhook(s.base, 'x'.repeat(300 * 1024));
    assert.equal(big.status, 413);
    assert.doesNotMatch(await big.text(), /at .*\.js|node_modules/);
  } finally { await s.close(); }
});
