const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/utils/db');
const { loadConfig, validateConfig } = require('../src/config');

// Silence logger output during these tests.
const realLog = console.log;
const realError = console.error;
test.before(() => { console.log = () => {}; console.error = () => {}; });
test.after(() => { console.log = realLog; console.error = realError; });

test('db module exports connect, getDb, close, and isConnected', () => {
  assert.equal(typeof db.connect, 'function');
  assert.equal(typeof db.getDb, 'function');
  assert.equal(typeof db.close, 'function');
  assert.equal(typeof db.isConnected, 'function');
});

test('isConnected returns false before any connect call', () => {
  assert.equal(db.isConnected(), false);
});

test('getDb throws when database is not connected', () => {
  assert.throws(() => db.getDb(), /not connected/i);
});

test('connect returns false when no URI is provided (mock mode)', async () => {
  const result = await db.connect('', 'TACTIOPBOT_WHA');
  assert.equal(result, false);
  assert.equal(db.isConnected(), false);
});

test('connect returns false when no database name is provided (mock mode)', async () => {
  const result = await db.connect('mongodb+srv://example.net/', '');
  assert.equal(result, false);
  assert.equal(db.isConnected(), false);
});

test('connect returns false when both are missing (mock mode)', async () => {
  const result = await db.connect('', '');
  assert.equal(result, false);
  assert.equal(db.isConnected(), false);
});

test('close does not throw when never connected', async () => {
  await assert.doesNotReject(db.close());
  assert.equal(db.isConnected(), false);
});

test('loadConfig includes mongodbUri and mongodbDatabase', () => {
  const config = loadConfig({ MONGODB_URI: 'mongodb+srv://example.net/', MONGODB_DATABASE: 'TACTIOPBOT_WHA' });
  assert.equal(config.mongodbUri, 'mongodb+srv://example.net/');
  assert.equal(config.mongodbDatabase, 'TACTIOPBOT_WHA');
});

test('loadConfig defaults mongodb fields to empty strings', () => {
  const config = loadConfig({});
  assert.equal(config.mongodbUri, '');
  assert.equal(config.mongodbDatabase, '');
});

test('validateConfig does not error when MongoDB is not configured', () => {
  const config = loadConfig({ WHATSAPP_MODE: 'mock' });
  const validation = validateConfig(config);
  assert.equal(validation.ok, true);
});

test('validateConfig warns when only one MongoDB variable is set', () => {
  const config = loadConfig({ MONGODB_URI: 'mongodb+srv://example.net/' });
  const validation = validateConfig(config);
  assert.equal(validation.ok, true);
  assert.ok(validation.warnings.some((w) => w.includes('MONGODB')));
});
