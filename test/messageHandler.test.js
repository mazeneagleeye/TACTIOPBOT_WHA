const test = require('node:test');
const assert = require('node:assert/strict');
const { handleMessage } = require('../src/services/messageHandler');

test('!help lists every command', async () => {
  const reply = await handleMessage('!help');
  for (const name of ['!help', '!clanmission', '!cancel', '!nextreset', '!reminderstatus', '!setnextreset', '!setcmnotif', '!editcmnotif', '!deletecmnotif', '!about']) {
    assert.ok(reply.includes(name), `help should mention ${name}`);
  }
  assert.ok(reply.includes('TACTIOPBOT ✦ Eagle Eye'));
  assert.ok(reply.includes('Supported languages:'));
});

test('!clanmission starts the interactive mission setup flow', async () => {
  const reply = await handleMessage('!clanmission');
  assert.match(reply, /Clan Mission Setup/);
  assert.match(reply, /Placement Mode/);
});

test('!nextreset shows the next upcoming reset', async () => {
  const reply = await handleMessage('!nextreset');
  assert.match(reply, /\*Next Reset\*/);
  assert.match(reply, /\(UTC:/);
});

test('!reminderstatus shows subscription status', async () => {
  const reply = await handleMessage('!reminderstatus', { from: '+15550001111' });
  assert.match(reply, /Clan Mission Notification Status/);
  assert.match(reply, /not subscribed/);
  assert.match(reply, /not yet active/);
});

test('!about identifies the WhatsApp edition', async () => {
  const reply = await handleMessage('!about');
  assert.match(reply, /WhatsApp edition/i);
  assert.match(reply, /TACTIOPBOT/);
});

test('commands are case-insensitive', async () => {
  assert.equal(await handleMessage('!HELP'), await handleMessage('!help'));
  assert.equal(await handleMessage('!ClanMission'), await handleMessage('!clanmission'));
  assert.equal(await handleMessage('!NEXTRESET'), await handleMessage('!nextreset'));
});

test('commands tolerate surrounding and extra whitespace', async () => {
  assert.equal(await handleMessage('   !help   '), await handleMessage('!help'));
  assert.equal(await handleMessage('\n\t!about \n'), await handleMessage('!about'));
});

test('greetings get a helpful reply', async () => {
  for (const greeting of ['hi', 'Hello', 'HEY there', 'good morning']) {
    const reply = await handleMessage(greeting);
    assert.match(reply, /!help/);
    assert.match(reply, /Eagle Eye/);
  }
});

test('words that merely start with a greeting are not greetings', async () => {
  assert.match(await handleMessage('history of clans'), /didn't understand/);
});

test('unknown text points to !help', async () => {
  const reply = await handleMessage('what is the meaning of life');
  assert.match(reply, /!help/);
  assert.ok(reply.length < 120, 'reply should be short');
});

test('unknown commands point to !help', async () => {
  assert.match(await handleMessage('!doesnotexist'), /Unknown command.*!help/);
});

test('empty and whitespace-only messages get a reply pointing to !help', async () => {
  assert.match(await handleMessage(''), /!help/);
  assert.match(await handleMessage('   '), /!help/);
});

test('non-string input does not crash', async () => {
  for (const value of [undefined, null, 42, {}, []]) {
    assert.match(await handleMessage(value), /!help/);
  }
});

test('replies never contain invented data such as dates or player names', async () => {
  for (const cmd of ['!clanmission', '!reminderstatus']) {
    assert.doesNotMatch(await handleMessage(cmd), /\d{1,2}:\d{2}|\b20\d\d\b/);
  }
});
