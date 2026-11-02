const test = require('node:test');
const assert = require('node:assert/strict');
const { deliverReply } = require('../src/routes/webhook');

const imageReply = {
  text: 'Clan Mission Results',
  imageBuffer: Buffer.from('png-data')
};

test('delivers the uploaded mission image with the text as its caption', async () => {
  const calls = [];
  const client = {
    async uploadMedia(buffer, mimeType) {
      calls.push({ type: 'upload', buffer, mimeType });
      return { accepted: true, mediaId: 'media.123' };
    },
    async sendImage(to, mediaId, caption) {
      calls.push({ type: 'image', to, mediaId, caption });
      return { accepted: true };
    },
    async sendText() {
      calls.push({ type: 'text' });
      return { accepted: true };
    }
  };

  await deliverReply(client, '15550001111', imageReply);
  assert.deepEqual(calls.map((call) => call.type), ['upload', 'image']);
  assert.equal(calls[0].buffer, imageReply.imageBuffer);
  assert.equal(calls[0].mimeType, 'image/png');
  assert.deepEqual(calls[1], {
    type: 'image',
    to: '15550001111',
    mediaId: 'media.123',
    caption: imageReply.text
  });
});

test('uses one image message without sending a duplicate text reply', async () => {
  const sent = [];
  await deliverReply({
    async uploadMedia() {
      return { accepted: true, mediaId: 'media.123' };
    },
    async sendImage(to, mediaId, caption) {
      sent.push({ type: 'image', to, mediaId, caption });
      return { accepted: true };
    },
    async sendText(to, text) {
      sent.push({ type: 'text', to, text });
      return { accepted: true };
    }
  }, '15550001111', imageReply);

  assert.deepEqual(sent, [{
    type: 'image',
    to: '15550001111',
    mediaId: 'media.123',
    caption: imageReply.text
  }]);
});

test('delivers one text fallback when image generation fails', async () => {
  const { _internal } = require('../src/commands/clanmission');
  const sent = [];
  const reply = await _internal.createImageReply(imageReply.text, [], async () => {
    throw new Error('renderer unavailable');
  });

  await deliverReply({
    async sendText(to, text) {
      sent.push({ to, text });
      return { accepted: true };
    }
  }, '15550001111', reply);

  assert.deepEqual(sent, [{ to: '15550001111', text: imageReply.text }]);
});

test('sends the existing text reply when image upload fails', async () => {
  const calls = [];
  const client = {
    async uploadMedia() {
      calls.push('upload');
      return { accepted: false, reason: 'permission_denied' };
    },
    async sendImage() {
      calls.push('image');
      return { accepted: true };
    },
    async sendText(to, text) {
      calls.push({ type: 'text', to, text });
      return { accepted: true };
    }
  };

  await deliverReply(client, '15550001111', imageReply);
  assert.deepEqual(calls, [
    'upload',
    { type: 'text', to: '15550001111', text: imageReply.text }
  ]);
});

test('sends the existing text reply when image sending fails', async () => {
  const calls = [];
  const client = {
    async uploadMedia() {
      calls.push('upload');
      return { accepted: true, mediaId: 'media.123' };
    },
    async sendImage() {
      calls.push('image');
      return { accepted: false, reason: 'request_rejected' };
    },
    async sendText(to, text) {
      calls.push({ type: 'text', to, text });
      return { accepted: true };
    }
  };

  await deliverReply(client, '15550001111', imageReply);
  assert.deepEqual(calls, [
    'upload',
    'image',
    { type: 'text', to: '15550001111', text: imageReply.text }
  ]);
});

test('sends plain text replies through the existing text path', async () => {
  const sent = [];
  await deliverReply({
    async sendText(to, text) {
      sent.push({ to, text });
      return { accepted: true };
    }
  }, '1555', 'Hello');
  assert.deepEqual(sent, [{ to: '1555', text: 'Hello' }]);
});
