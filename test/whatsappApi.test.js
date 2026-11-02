const test = require('node:test');
const assert = require('node:assert/strict');
const { createWhatsAppClient } = require('../src/services/whatsappApi');

const cloudConfig = {
  mode: 'cloud',
  accessToken: 'SECRET_TOKEN_VALUE',
  phoneNumberId: '123456',
  apiVersion: 'v99.0'
};

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

// Silence logger output during these tests.
const realLog = console.log;
const realError = console.error;
test.before(() => { console.log = () => {}; console.error = () => {}; });
test.after(() => { console.log = realLog; console.error = realError; });

test('sends the documented request format with a Bearer token and configured version', async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    return jsonResponse(200, { messages: [{ id: 'wamid.X' }] });
  };
  const client = createWhatsAppClient(cloudConfig, fakeFetch);
  const result = await client.sendText('15550001111', 'hi');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://graph.facebook.com/v99.0/123456/messages');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer SECRET_TOKEN_VALUE');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.messaging_product, 'whatsapp');
  assert.equal(body.to, '15550001111');
  assert.equal(body.type, 'text');
  assert.equal(body.text.body, 'hi');
  assert.deepEqual(result, { accepted: true, messageId: 'wamid.X', httpStatus: 200 });
});

test('success without a message id is not reported as accepted', async () => {
  const client = createWhatsAppClient(cloudConfig, async () => jsonResponse(200, {}));
  const result = await client.sendText('1555', 'hi');
  assert.equal(result.accepted, false);
});

test('uploads PNG media to the WhatsApp media endpoint as multipart form data', async () => {
  const calls = [];
  const client = createWhatsAppClient(cloudConfig, async (url, options) => {
    calls.push({ url, options });
    return jsonResponse(200, { id: 'media.123' });
  });

  const result = await client.uploadMedia(Buffer.from('png-data'), 'image/png');
  assert.equal(result.accepted, true);
  assert.equal(result.mediaId, 'media.123');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://graph.facebook.com/v99.0/123456/media');
  assert.equal(calls[0].options.method, 'POST');
  assert.ok(calls[0].options.body instanceof FormData);
  assert.equal(calls[0].options.body.get('messaging_product'), 'whatsapp');
  assert.equal(calls[0].options.body.get('type'), 'image/png');
  const file = calls[0].options.body.get('file');
  assert.equal(file.name, 'clan_mission.png');
  assert.equal(file.type, 'image/png');
  assert.equal(Buffer.from(await file.arrayBuffer()).toString(), 'png-data');
  assert.match(calls[0].options.headers.Authorization, /^Bearer /);
});

test('uploads media using the supplied supported MIME type', async () => {
  let uploadedFile;
  const client = createWhatsAppClient(cloudConfig, async (_url, options) => {
    uploadedFile = options.body.get('file');
    return jsonResponse(200, { id: 'media.jpeg' });
  });

  const result = await client.uploadMedia(Buffer.from('jpeg-data'), 'image/jpeg');
  assert.equal(result.mediaId, 'media.jpeg');
  assert.equal(uploadedFile.type, 'image/jpeg');
  assert.equal(uploadedFile.name, 'clan_mission.jpg');
});

test('sends an uploaded image with its caption through the messages endpoint', async () => {
  const calls = [];
  const client = createWhatsAppClient(cloudConfig, async (url, options) => {
    calls.push({ url, options });
    return jsonResponse(200, { messages: [{ id: 'wamid.IMAGE' }] });
  });

  const result = await client.sendImage('15550001111', 'media.123', 'Clan Mission Results');
  assert.deepEqual(result, { accepted: true, messageId: 'wamid.IMAGE', httpStatus: 200 });
  assert.equal(calls[0].url, 'https://graph.facebook.com/v99.0/123456/messages');
  assert.equal(calls[0].options.method, 'POST');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.messaging_product, 'whatsapp');
  assert.equal(body.to, '15550001111');
  assert.equal(body.type, 'image');
  assert.deepEqual(body.image, { id: 'media.123', caption: 'Clan Mission Results' });
});

test('invalid images and oversized captions are rejected without calling the network', async () => {
  let calls = 0;
  const client = createWhatsAppClient(cloudConfig, async () => {
    calls += 1;
    return jsonResponse(200, { id: 'media.123', messages: [{ id: 'wamid.IMAGE' }] });
  });
  assert.equal((await client.uploadMedia(Buffer.alloc(0))).reason, 'invalid_arguments');
  assert.equal((await client.uploadMedia(Buffer.alloc(5 * 1024 * 1024 + 1))).reason, 'invalid_arguments');
  assert.equal((await client.uploadMedia(Buffer.from('png-data'), 'image/gif')).reason, 'invalid_arguments');
  assert.equal((await client.sendImage('', 'media.123')).reason, 'invalid_arguments');
  assert.equal((await client.sendImage('1555', 'media.123', 'x'.repeat(1025))).reason, 'invalid_arguments');
  assert.equal(calls, 0);
});

test('media upload and image send API errors are returned without retrying client errors', async () => {
  const calls = [];
  const client = createWhatsAppClient(cloudConfig, async (url, options) => {
    calls.push({ url, options });
    return jsonResponse(403, { error: { code: 10, message: 'Permission denied' } });
  });

  const upload = await client.uploadMedia(Buffer.from('png-data'));
  const send = await client.sendImage('1555', 'media.123');
  assert.equal(upload.accepted, false);
  assert.equal(upload.reason, 'permission_denied');
  assert.equal(send.accepted, false);
  assert.equal(send.reason, 'permission_denied');
  assert.equal(calls.length, 2);
});

test('invalid credentials are reported and not retried', async () => {
  let count = 0;
  const client = createWhatsAppClient(cloudConfig, async () => {
    count += 1;
    return jsonResponse(401, { error: { code: 190, message: 'Invalid OAuth access token.' } });
  });
  const result = await client.sendText('1555', 'hi');
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'invalid_or_expired_credentials');
  assert.equal(count, 1);
});

test('rate limits are reported and not retried', async () => {
  let count = 0;
  const client = createWhatsAppClient(cloudConfig, async () => {
    count += 1;
    return jsonResponse(429, { error: { code: 4, message: 'Too many calls' } });
  });
  const result = await client.sendText('1555', 'hi');
  assert.equal(result.reason, 'rate_limited');
  assert.equal(count, 1);
});

test('network errors are retried at most once and never throw', async () => {
  let count = 0;
  const client = createWhatsAppClient(cloudConfig, async () => {
    count += 1;
    throw new Error('connect ECONNREFUSED');
  });
  const result = await client.sendText('1555', 'hi');
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'network_error');
  assert.equal(count, 2);
});

test('invalid arguments are rejected without calling the network', async () => {
  let count = 0;
  const client = createWhatsAppClient(cloudConfig, async () => { count += 1; return jsonResponse(200, {}); });
  assert.equal((await client.sendText('', 'hi')).accepted, false);
  assert.equal((await client.sendText('1555', '   ')).accepted, false);
  assert.equal(count, 0);
});

test('mock client never uses the network and reports not accepted', async () => {
  const client = createWhatsAppClient({ mode: 'mock' }, async () => { throw new Error('must not be called'); });
  const result = await client.sendText('1555', 'hi');
  assert.equal(result.accepted, false);
  assert.equal(result.simulated, true);
  assert.equal((await client.uploadMedia(Buffer.from('png'))).simulated, true);
  assert.equal((await client.sendImage('1555', 'media')).simulated, true);
});
