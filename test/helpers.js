// Shared helpers for HTTP tests (not a test file itself; it just exports helpers).
const crypto = require('node:crypto');
const { createApp } = require('../src/index');
const { loadConfig } = require('../src/config');

const cloudEnv = {
  WHATSAPP_MODE: 'cloud',
  WHATSAPP_ACCESS_TOKEN: 'tok',
  WHATSAPP_PHONE_NUMBER_ID: '1',
  WHATSAPP_VERIFY_TOKEN: 'verify-me',
  WHATSAPP_APP_SECRET: 'app-secret',
  WHATSAPP_API_VERSION: 'v1.0'
};

/** Silence the JSON logger while tests run. Returns a restore function. */
function silenceLogs() {
  const realLog = console.log;
  const realError = console.error;
  console.log = () => {};
  console.error = () => {};
  return () => { console.log = realLog; console.error = realError; };
}

/** Start the real Express app on a random local port with a fake WhatsApp client. */
async function startServer(env) {
  const config = loadConfig(env);
  const sent = [];
  const fakeClient = {
    async sendText(to, text) {
      sent.push({ to, text });
      return { accepted: true };
    }
  };
  const { app, devEnabled } = createApp(config, fakeClient);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    sent,
    devEnabled,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

const textPayload = (text, id = 'wamid.1') => JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [{ changes: [{ field: 'messages', value: { messages: [{ from: '1555', id, type: 'text', text: { body: text } }] } }] }]
});

const sign = (body) => `sha256=${crypto.createHmac('sha256', 'app-secret').update(body).digest('hex')}`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { cloudEnv, silenceLogs, startServer, textPayload, sign, wait };
