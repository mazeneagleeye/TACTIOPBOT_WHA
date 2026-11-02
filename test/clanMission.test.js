const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MISSION_CHOICES,
  PLACEMENT_MODES,
  MISSION_NAMES,
  listMissionChoices,
  resolveMissionChoice,
  resolveModeChoice,
  assignBestOperators,
  assignSmartBalanceOperators,
  assignGameChatOperators,
  getSelectedSlots,
  getAllOperatorNames,
  calculateSmartQuotas
} = require('../src/services/clanMissionEngine');

// ---------------------------------------------------------------------------
// Engine: mission choices and resolution
// ---------------------------------------------------------------------------

test('MISSION_CHOICES has 17 entries (16 missions + Skip)', () => {
  assert.equal(MISSION_CHOICES.length, 17);
  assert.equal(MISSION_CHOICES[0].name, 'Skip');
  assert.equal(MISSION_CHOICES[0].value, 'Skip');
  assert.equal(MISSION_CHOICES[16].name, 'Uncommon Only');
  assert.equal(MISSION_CHOICES[16].value, 'Uncommon Only');
});

test('MISSION_NAMES contains all 17 mission values', () => {
  assert.equal(MISSION_NAMES.length, 17);
  assert.ok(MISSION_NAMES.includes('Skip'));
  assert.ok(MISSION_NAMES.includes('Breach'));
  assert.ok(MISSION_NAMES.includes('B.S.S'));
  assert.ok(MISSION_NAMES.includes('Basic Mission'));
  assert.ok(MISSION_NAMES.includes('Bayonet'));
  assert.ok(MISSION_NAMES.includes('Clean Up'));
  assert.ok(MISSION_NAMES.includes('Common Only'));
  assert.ok(MISSION_NAMES.includes('Cover'));
  assert.ok(MISSION_NAMES.includes('Hammer'));
  assert.ok(MISSION_NAMES.includes('HILDR'));
  assert.ok(MISSION_NAMES.includes('Knife'));
  assert.ok(MISSION_NAMES.includes('Locals'));
  assert.ok(MISSION_NAMES.includes('Logistics'));
  assert.ok(MISSION_NAMES.includes('Rare Only'));
  assert.ok(MISSION_NAMES.includes('Recon'));
  assert.ok(MISSION_NAMES.includes('Showdown'));
  assert.ok(MISSION_NAMES.includes('Uncommon Only'));
});

test('listMissionChoices returns numbered list of all 17 choices', () => {
  const list = listMissionChoices();
  const lines = list.split('\n');
  assert.equal(lines.length, 17);
  assert.equal(lines[0], '1. Skip');
  assert.equal(lines[16], '17. Uncommon Only');
});

test('resolveMissionChoice resolves numeric choices 1-17', () => {
  assert.equal(resolveMissionChoice('1'), 'Skip');
  assert.equal(resolveMissionChoice('2'), 'Breach');
  assert.equal(resolveMissionChoice('17'), 'Uncommon Only');
});

test('resolveMissionChoice resolves mission names case-insensitively', () => {
  assert.equal(resolveMissionChoice('breach'), 'Breach');
  assert.equal(resolveMissionChoice('BREACH'), 'Breach');
  assert.equal(resolveMissionChoice('  Breach  '), 'Breach');
  assert.equal(resolveMissionChoice('b.s.s'), 'B.S.S');
  assert.equal(resolveMissionChoice('basic mission'), 'Basic Mission');
});

test('resolveMissionChoice returns null for invalid input', () => {
  assert.equal(resolveMissionChoice(''), null);
  assert.equal(resolveMissionChoice('99'), null);
  assert.equal(resolveMissionChoice('notamission'), null);
  assert.equal(resolveMissionChoice('skip '), 'Skip');
});

test('resolveModeChoice resolves numeric choices 1-3', () => {
  assert.equal(resolveModeChoice('1'), 'default');
  assert.equal(resolveModeChoice('2'), 'smart_balance');
  assert.equal(resolveModeChoice('3'), 'gamechat');
});

test('resolveModeChoice resolves mode names case-insensitively', () => {
  assert.equal(resolveModeChoice('default'), 'default');
  assert.equal(resolveModeChoice('DEFAULT'), 'default');
  assert.equal(resolveModeChoice('smart balance'), 'smart_balance');
  assert.equal(resolveModeChoice('smart_balance'), 'smart_balance');
  assert.equal(resolveModeChoice('gamechat'), 'gamechat');
  assert.equal(resolveModeChoice('Game Chat Mode'), 'gamechat');
});

test('resolveModeChoice returns null for invalid input', () => {
  assert.equal(resolveModeChoice(''), null);
  assert.equal(resolveModeChoice('99'), null);
  assert.equal(resolveModeChoice('invalid'), null);
});

// ---------------------------------------------------------------------------
// Engine: getSelectedSlots
// ---------------------------------------------------------------------------

test('getSelectedSlots filters out Skip and empty entries', () => {
  const missions = ['Breach', 'Skip', 'B.S.S', null, undefined, 'Clean Up', 'Skip', 'Skip'];
  const slots = getSelectedSlots(missions);
  assert.equal(slots.length, 3);
  assert.equal(slots[0].slotIndex, 0);
  assert.equal(slots[0].mission, 'Breach');
  assert.equal(slots[1].slotIndex, 2);
  assert.equal(slots[1].mission, 'B.S.S');
  assert.equal(slots[2].slotIndex, 5);
  assert.equal(slots[2].mission, 'Clean Up');
});

test('getSelectedSlots returns empty array for all-Skip input', () => {
  assert.deepEqual(getSelectedSlots(['Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip']), []);
});

// ---------------------------------------------------------------------------
// Engine: getAllOperatorNames
// ---------------------------------------------------------------------------

test('getAllOperatorNames returns sorted unique operator names', () => {
  const names = getAllOperatorNames();
  assert.ok(names.length > 0);
  // Verify sorted using localeCompare
  for (let i = 1; i < names.length; i += 1) {
    assert.ok(names[i - 1].localeCompare(names[i]) <= 0);
  }
  // Verify known operators exist
  assert.ok(names.includes('Miro'));
  assert.ok(names.includes('Syndrome'));
  assert.ok(names.includes('Ferry'));
});

// ---------------------------------------------------------------------------
// Engine: calculateSmartQuotas
// ---------------------------------------------------------------------------

test('calculateSmartQuotas distributes operators by slot weight', () => {
  const slots = [
    { mission: 'Breach', slotIndex: 0 },
    { mission: 'B.S.S', slotIndex: 1 }
  ];
  const quotas = calculateSmartQuotas(slots, 10);
  assert.equal(quotas.length, 2);
  // Mission 1 weight=1, Mission 2 weight=2. Total=3.
  // M1: 1/3*10=3.33->3, M2: 2/3*10=6.67->7. Total=10.
  assert.equal(quotas[0] + quotas[1], 10);
});

test('calculateSmartQuotas handles empty slots', () => {
  assert.deepEqual(calculateSmartQuotas([], 10), []);
});

// ---------------------------------------------------------------------------
// Engine: assignBestOperators (default mode)
// ---------------------------------------------------------------------------

test('assignBestOperators returns 8 slots for all-Skip input', () => {
  const allSkip = ['Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip'];
  const results = assignBestOperators(allSkip);
  assert.equal(results.length, 8);
  for (const slot of results) {
    assert.equal(slot.mission, null);
    assert.deepEqual(slot.operators, []);
  }
});

test('assignBestOperators requires at least one non-skip mission', () => {
  const allSkip = ['Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip'];
  const results = assignBestOperators(allSkip);
  // All slots should be empty (no operators assigned)
  let hasOperators = false;
  for (const slot of results) {
    if (slot.operators.length > 0) hasOperators = true;
  }
  assert.equal(hasOperators, false);
});

test('assignBestOperators assigns operators to the mission with highest value', () => {
  // Miro has 496 in Locals (slot 0) and 496 in Clean Up (slot 1) - tie
  // But let's test a clear case: Charon has 496 in Showdown only
  const missions = ['Showdown', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip'];
  const results = assignBestOperators(missions);
  const showdownSlot = results[0];
  assert.equal(showdownSlot.mission, 'Showdown');
  // Charon has max value 496 in Showdown
  const charon = showdownSlot.operators.find((o) => o.op === 'Charon');
  assert.ok(charon);
  assert.equal(charon.value, 496);
});

test('assignBestOperators processes missions from highest priority (Mission 8 first)', () => {
  // Zloy has 450 in Showdown (max) and 234 in many others
  // If Showdown is in Mission 8 (slot 7), Zloy should go there
  const missions = ['Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Showdown'];
  const results = assignBestOperators(missions);
  const showdownSlot = results[7];
  assert.equal(showdownSlot.mission, 'Showdown');
  const zloy = showdownSlot.operators.find((o) => o.op === 'Zloy');
  assert.ok(zloy);
  assert.equal(zloy.value, 450);
});

test('assignBestOperators distributes ties evenly across tied slots', () => {
  // Miro has 496 in both Locals and Clean Up - tie across two slots
  // If both are selected, Miro should be distributed (1 each since 1 operator / 2 slots)
  const missions = ['Locals', 'Clean Up', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip'];
  const results = assignBestOperators(missions);
  // Miro appears in both Locals (slot 0) and Clean Up (slot 1) with value 496
  // Tie group: slots [1, 0] (Clean Up is slot 1, Locals is slot 0)
  // 1 operator distributed across 2 slots: perSlot=0, remainder=1, so slot 0 gets 1
  // Wait, slots are sorted by slotIndex desc: [1 (Clean Up), 0 (Locals)]
  // perSlot = 1/2 = 0, remainder = 1
  // i=0: count = 0 + (0 < 1 ? 1 : 0) = 1 -> Clean Up gets Miro
  // i=1: count = 0 + (1 < 1 ? 1 : 0) = 0 -> Locals gets nothing from Miro
  const cleanUpSlot = results[1];
  const localsSlot = results[0];
  const miroInCleanUp = cleanUpSlot.operators.find((o) => o.op === 'Miro');
  const miroInLocals = localsSlot.operators.find((o) => o.op === 'Miro');
  assert.ok(miroInCleanUp, 'Miro should be in Clean Up (higher priority slot gets the tie)');
  assert.equal(miroInCleanUp.value, 496);
  assert.equal(miroInLocals, undefined, 'Miro should NOT be in Locals (tie went to Clean Up)');
});

test('assignBestOperators sorts operators within each mission by value desc then name asc', () => {
  const missions = ['Breach', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip'];
  const results = assignBestOperators(missions);
  const breachSlot = results[0];
  for (let i = 1; i < breachSlot.operators.length; i += 1) {
    const prev = breachSlot.operators[i - 1];
    const curr = breachSlot.operators[i];
    assert.ok(
      prev.value > curr.value || (prev.value === curr.value && prev.op < curr.op),
      `Operators not sorted: ${prev.op}(${prev.value}) before ${curr.op}(${curr.value})`
    );
  }
});

// ---------------------------------------------------------------------------
// Engine: assignSmartBalanceOperators
// ---------------------------------------------------------------------------

test('assignSmartBalanceOperators returns 8 slots for all-Skip input', () => {
  const allSkip = ['Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip'];
  const results = assignSmartBalanceOperators(allSkip);
  assert.equal(results.length, 8);
  for (const slot of results) {
    assert.equal(slot.mission, null);
    assert.deepEqual(slot.operators, []);
  }
});

test('assignSmartBalanceOperators assigns all operators across selected slots', () => {
  const missions = ['Breach', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip'];
  const results = assignSmartBalanceOperators(missions);
  const breachSlot = results[0];
  assert.equal(breachSlot.mission, 'Breach');
  assert.ok(breachSlot.operators.length > 0);
  // All operators should be assigned somewhere
  let totalAssigned = 0;
  for (const slot of results) totalAssigned += slot.operators.length;
  assert.equal(totalAssigned, getAllOperatorNames().length);
});

// ---------------------------------------------------------------------------
// Engine: assignGameChatOperators
// ---------------------------------------------------------------------------

test('assignGameChatOperators uses assignBestOperators internally', () => {
  const missions = ['Breach', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip', 'Skip'];
  const defaultResults = assignBestOperators(missions);
  const gamechatResults = assignGameChatOperators(missions);
  assert.deepEqual(defaultResults, gamechatResults);
});

// ---------------------------------------------------------------------------
// Session service: mocked DB tests
// ---------------------------------------------------------------------------

function resetDBCache() {
  delete require.cache[require.resolve('../src/utils/db')];
  delete require.cache[require.resolve('../src/services/clanMissionSession')];
  delete require.cache[require.resolve('../src/commands/clanmission')];
}

function mockDb(impl) {
  const modId = require.resolve('../src/utils/db');
  require.cache[modId] = {
    id: modId,
    filename: modId,
    loaded: true,
    exports: impl
  };
}

test('clanMissionSession.getSession returns null when DB not connected', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false, getDb: () => { throw new Error('not connected'); } });
  const { getSession } = require('../src/services/clanMissionSession');
  const result = await getSession('+15550001111');
  assert.equal(result, null);
});

test('clanMissionSession.setSession then getSession round-trip', async () => {
  resetDBCache();
  const store = {};
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        findOne: async (filter) => ({ key: filter.key, value: store[filter.key] }),
        updateOne: async (filter, update, opts) => {
          if (opts && opts.upsert) {
            store[filter.key] = update.$set.value;
          }
          return { acknowledged: true };
        },
        deleteOne: async (filter) => { delete store[filter.key]; return { acknowledged: true }; }
      })
    })
  });
  const { setSession, getSession, clearSession } = require('../src/services/clanMissionSession');

  const saved = await setSession('+15550001111', { state: 'awaiting_mode', mode: 'default', currentSlot: 0, missions: [] });
  assert.equal(saved, true);

  const loaded = await getSession('+15550001111');
  assert.ok(loaded);
  assert.equal(loaded.state, 'awaiting_mode');
  assert.equal(loaded.mode, 'default');
  assert.ok(loaded.expiresAt > Date.now());

  const cleared = await clearSession('+15550001111');
  assert.equal(cleared, true);

  const afterClear = await getSession('+15550001111');
  assert.equal(afterClear, null);
});

test('clanMissionSession session expires after TTL', async () => {
  resetDBCache();
  const store = {};
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        findOne: async (filter) => ({ key: filter.key, value: store[filter.key] }),
        updateOne: async (filter, update) => { store[filter.key] = update.$set.value; return { acknowledged: true }; },
        deleteOne: async (filter) => { delete store[filter.key]; return { acknowledged: true }; }
      })
    })
  });
  const { setSession, getSession } = require('../src/services/clanMissionSession');

  // Save a session with an expired timestamp
  await setSession('+15550001111', { state: 'awaiting_mode', mode: 'default', currentSlot: 0, missions: [], startedAt: 0 });
  const doc = store[`cm_session:+15550001111`];
  const session = JSON.parse(doc);
  session.expiresAt = Date.now() - 1000; // expired 1 second ago
  store[`cm_session:+15550001111`] = JSON.stringify(session);

  const result = await getSession('+15550001111');
  assert.equal(result, null);
  // Expired session should have been cleared
  assert.equal(store[`cm_session:+15550001111`], undefined);
});

// ---------------------------------------------------------------------------
// Command: clanmission.run starts a session
// ---------------------------------------------------------------------------

test('clanmission.run returns mode prompt when starting fresh', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false }); // DB not available
  const { run } = require('../src/commands/clanmission');
  const result = await run({ from: '+15550001111', text: '!clanmission', adminNumbers: [], args: '' });
  assert.ok(result.includes('Placement Mode'));
  assert.ok(result.includes('1. Default Mode'));
  assert.ok(result.includes('2. Smart Balance Mode'));
  assert.ok(result.includes('3. Game Chat Mode'));
});

test('clanmission.run with !clanmission text restarts session', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false });
  const { run } = require('../src/commands/clanmission');
  const result = await run({ from: '+15550001111', text: '!clanmission', adminNumbers: [], args: '' });
  assert.ok(result.includes('Placement Mode'));
});

// ---------------------------------------------------------------------------
// Command: processSessionResponse flow
// ---------------------------------------------------------------------------

test('processSessionResponse resolves mode choice', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false });
  const { processSessionResponse } = require('../src/commands/clanmission');

  // Start a session manually (DB not connected, but we test the logic)
  const session = { state: 'awaiting_mode', mode: null, currentSlot: 0, missions: [], startedAt: Date.now() };
  // We can't actually setSession since DB is mocked as not connected.
  // Instead, test processSessionResponse directly with a fake session.
  // But processSessionResponse calls setSession which returns false when DB not connected.
  // The logic still proceeds. Let's test mode resolution.
  const result = await processSessionResponse('+15550001111', session, '2');
  assert.ok(result.includes('Mission 1 of 8'));
  assert.ok(result.includes('1. Skip'));
});

test('processSessionResponse handles invalid mode choice', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false });
  const { processSessionResponse } = require('../src/commands/clanmission');

  const session = { state: 'awaiting_mode', mode: null, currentSlot: 0, missions: [], startedAt: Date.now() };
  const result = await processSessionResponse('+15550001111', session, '99');
  assert.ok(result.includes('Invalid choice'));
  assert.ok(result.includes('Placement Mode'));
});

test('processSessionResponse handles cancel', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false });
  const { processSessionResponse } = require('../src/commands/clanmission');

  const session = { state: 'awaiting_mission', mode: 'default', currentSlot: 3, missions: ['Breach', 'Skip', 'Skip'], startedAt: Date.now() };
  const result = await processSessionResponse('+15550001111', session, '!cancel');
  assert.equal(result, 'Clan mission setup cancelled.');
});

test('processSessionResponse handles restart with !clanmission', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false });
  const { processSessionResponse } = require('../src/commands/clanmission');

  const session = { state: 'awaiting_mission', mode: 'default', currentSlot: 3, missions: ['Breach', 'Skip', 'Skip'], startedAt: Date.now() };
  const result = await processSessionResponse('+15550001111', session, '!clanmission');
  assert.ok(result.includes('Placement Mode') || result.includes('Clan Mission Setup'));
});

test('processSessionResponse handles invalid mission choice', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false });
  const { processSessionResponse } = require('../src/commands/clanmission');

  const session = { state: 'awaiting_mission', mode: 'default', currentSlot: 0, missions: [], startedAt: Date.now() };
  const result = await processSessionResponse('+15550001111', session, '99');
  assert.ok(result.includes('Invalid choice'));
  assert.ok(result.includes('Mission 1 of 8'));
});

test('processSessionResponse handles skip', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false });
  const { processSessionResponse } = require('../src/commands/clanmission');

  const session = { state: 'awaiting_mission', mode: 'default', currentSlot: 0, missions: [], startedAt: Date.now() };
  const result = await processSessionResponse('+15550001111', session, 'skip');
  assert.ok(result.includes('Mission 2 of 8'));
});

// ---------------------------------------------------------------------------
// Command: cancel.run
// ---------------------------------------------------------------------------

test('cancel.run clears session and returns message', async () => {
  resetDBCache();
  let cleared = false;
  mockDb({
    isConnected: () => true,
    getDb: () => ({
      collection: () => ({
        deleteOne: async () => { cleared = true; return { acknowledged: true }; }
      })
    })
  });
  const { run } = require('../src/commands/cancel');
  const result = await run({ from: '+15550001111', text: '!cancel', adminNumbers: [], args: '' });
  assert.equal(result, 'Clan mission setup cancelled (if any was active).');
  assert.equal(cleared, true);
});

// ---------------------------------------------------------------------------
// End-to-end: full mission selection flow (8 missions, default mode)
// ---------------------------------------------------------------------------

test('full flow: all 8 missions selected, default mode produces results', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false });
  const { processSessionResponse } = require('../src/commands/clanmission');

  const from = '+15550001111';
  // Select mode: default (1)
  let session = { state: 'awaiting_mode', mode: null, currentSlot: 0, missions: [], startedAt: Date.now() };
  let result = await processSessionResponse(from, session, '1');
  assert.ok(result.includes('Mission 1 of 8'));

  // Select missions 1-8: all Breach
  session = { state: 'awaiting_mission', mode: 'default', currentSlot: 0, missions: [], startedAt: Date.now() };
  const renderImage = async () => Buffer.from('test-image');
  for (let i = 0; i < 8; i += 1) {
    result = await processSessionResponse(from, session, '2', renderImage); // Breach
    session.missions[i] = 'Breach';
    session.currentSlot = i + 1;
    if (i < 7) {
      assert.ok(result.includes(`Mission ${i + 2} of 8`));
    }
  }

  // After 8th mission, finalize
  result = await processSessionResponse(from, { state: 'awaiting_mission', mode: 'default', currentSlot: 7, missions: ['Breach','Breach','Breach','Breach','Breach','Breach','Breach','Breach'], startedAt: Date.now() }, '2', renderImage);
  assert.ok(result.text.includes('Clan Mission Results'));
  assert.ok(Buffer.isBuffer(result.imageBuffer));
  assert.ok(result.text.includes('Default'));
  // All 8 slots should be Breach
  for (let i = 0; i < 8; i += 1) {
    assert.ok(result.text.includes(`M${i + 1} - Breach`));
  }
});

// ---------------------------------------------------------------------------
// End-to-end: game chat mode formatting
// ---------------------------------------------------------------------------

test('game chat mode produces game chat formatted output', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false });
  const { processSessionResponse } = require('../src/commands/clanmission');

  const from = '+15550001111';
  // Select mode: gamechat (3)
  let session = { state: 'awaiting_mode', mode: null, currentSlot: 0, missions: [], startedAt: Date.now() };
  let result = await processSessionResponse(from, session, '3');
  assert.ok(result.includes('Mission 1 of 8'));

  // Select all Breach
  session = { state: 'awaiting_mission', mode: 'gamechat', currentSlot: 0, missions: [], startedAt: Date.now() };
  const renderImage = async () => Buffer.from('test-image');
  for (let i = 0; i < 8; i += 1) {
    result = await processSessionResponse(from, session, '2', renderImage); // Breach
    session.missions[i] = 'Breach';
    session.currentSlot = i + 1;
  }

  // Finalize
  result = await processSessionResponse(from, { state: 'awaiting_mission', mode: 'gamechat', currentSlot: 7, missions: ['Breach','Breach','Breach','Breach','Breach','Breach','Breach','Breach'], startedAt: Date.now() }, '2', renderImage);
  assert.ok(result.text.includes('Clan Mission — Game Chat'));
  assert.ok(result.text.includes('[CLAN]'));
  assert.ok(Buffer.isBuffer(result.imageBuffer));
  for (let i = 0; i < 8; i += 1) {
    assert.ok(result.text.includes(`M${i + 1} Breach`));
  }
});

test('finalized all-skip missions generate an eight-slot image payload with explicit Skip labels', async () => {
  resetDBCache();
  mockDb({ isConnected: () => false });
  const { processSessionResponse } = require('../src/commands/clanmission');
  let renderedSlots;
  const result = await processSessionResponse(
    '+15550001111',
    {
      state: 'awaiting_mission',
      mode: 'default',
      currentSlot: 7,
      missions: Array(7).fill('Skip'),
      startedAt: Date.now()
    },
    '1',
    async (slots) => {
      renderedSlots = slots;
      return Buffer.from('png');
    }
  );

  assert.equal(renderedSlots.length, 8);
  assert.ok(renderedSlots.every((slot) => slot.mission === 'Skip' && slot.operators.length === 0));
  assert.ok(Buffer.isBuffer(result.imageBuffer));
  for (let slot = 1; slot <= 8; slot += 1) {
    assert.ok(result.text.includes(`M${slot} - Skip`));
  }
});

test('image generation failure preserves the clan mission text fallback', async () => {
  const { _internal } = require('../src/commands/clanmission');
  const text = '*Clan Mission Results*';
  const result = await _internal.createImageReply(text, [], async () => {
    throw new Error('test renderer failure');
  });
  assert.equal(result, text);
});
