const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { parseWebhookPayload, verifySignature } = require('../src/services/webhookParser');

function payloadWith(value) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: '1', changes: [{ field: 'messages', value }] }]
  };
}

test('extracts inbound text messages', () => {
  const result = parseWebhookPayload(payloadWith({
    messages: [{ from: '15550001111', id: 'wamid.A', type: 'text', text: { body: '!help' } }]
  }));
  assert.deepEqual(result.messages, [{ id: 'wamid.A', from: '15550001111', text: '!help' }]);
});

test('status events (sent/delivered/read) produce no messages', () => {
  const result = parseWebhookPayload(payloadWith({
    statuses: [{ id: 'wamid.B', status: 'delivered' }, { id: 'wamid.C', status: 'read' }]
  }));
  assert.equal(result.messages.length, 0);
  assert.equal(result.statuses, 2);
});

test('unsupported message types are ignored safely', () => {
  const result = parseWebhookPayload(payloadWith({
    messages: [
      { from: '1555', id: 'x', type: 'image', image: { id: 'abc' } },
      { from: '1555', id: 'y', type: 'reaction', reaction: { emoji: '👍' } }
    ]
  }));
  assert.equal(result.messages.length, 0);
  assert.equal(result.ignoredMessages, 2);
});

test('malformed payloads and missing optional fields do not throw', () => {
  const bad = [
    null, undefined, 'text', 42, [], {},
    { object: 'whatsapp_business_account' },
    { object: 'whatsapp_business_account', entry: 'nope' },
    { object: 'whatsapp_business_account', entry: [null, {}, { changes: [null, {}, { field: 'messages' }] }] },
    payloadWith({ messages: [null, {}, { type: 'text' }, { type: 'text', from: '1', text: {} }] }),
    { object: 'page', entry: [] }
  ];
  for (const payload of bad) {
    assert.doesNotThrow(() => parseWebhookPayload(payload));
    assert.equal(parseWebhookPayload(payload).messages.length, 0);
  }
});

test('verifySignature accepts a correct signature and rejects everything else', () => {
  const secret = 'test-app-secret';
  const body = Buffer.from('{"hello":"world"}');
  const good = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;

  assert.equal(verifySignature(body, good, secret), true);
  assert.equal(verifySignature(body, good, 'other-secret'), false);
  assert.equal(verifySignature(Buffer.from('{"hello":"tampered"}'), good, secret), false);
  assert.equal(verifySignature(body, undefined, secret), false);
  assert.equal(verifySignature(body, 'sha256=abc', secret), false);
  assert.equal(verifySignature(body, good.replace('sha256=', ''), secret), false);
  assert.equal(verifySignature(body, good, ''), false);
  assert.equal(verifySignature('not a buffer', good, secret), false);
});
