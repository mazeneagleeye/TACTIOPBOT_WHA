// Interactive clan mission command for WhatsApp.
// Reproduces the Discord clan mission selection workflow as a step-by-step
// text flow: placement mode -> Mission 1 -> ... -> Mission 8 -> results.
// Session state is stored per WhatsApp sender in the existing
// TACTIOPBOT_WHA.settings collection. No credentials are stored.

const { getSession, setSession, clearSession } = require('../services/clanMissionSession');
const {
  listMissionChoices,
  resolveMissionChoice,
  resolveModeChoice,
  PLACEMENT_MODES,
  assignBestOperators,
  assignSmartBalanceOperators,
  assignGameChatOperators
} = require('../services/clanMissionEngine');

const TOTAL_SLOTS = 8;

function formatModeList() {
  return PLACEMENT_MODES.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
}

function formatMissionPrompt(slotNumber) {
  return [
    `*Clan Mission Setup — Mission ${slotNumber} of ${TOTAL_SLOTS}*`,
    'Pick a mission (or skip):',
    listMissionChoices(),
    '',
    'Reply with the number. Send `skip` to skip this mission, or `!cancel` to abort.'
  ].join('\n');
}

function formatModePrompt() {
  return [
    '*Clan Mission Setup — Placement Mode*',
    'Pick a placement mode:',
    formatModeList(),
    '',
    'Reply with the number. Send `!cancel` to abort.'
  ].join('\n');
}

function formatResults(session, slotResults) {
  const modeLabels = {
    default: 'Default',
    smart_balance: 'Smart Balance',
    gamechat: 'Game Chat'
  };
  const modeName = modeLabels[session.mode] || session.mode;
  let text = `*Clan Mission Results* (${modeName})\n\n`;
  for (let i = 0; i < TOTAL_SLOTS; i += 1) {
    const slot = slotResults[i];
    const header = `M${i + 1} - ${slot.mission ? slot.mission : 'Skip'}`;
    if (!slot.mission) {
      text += `${header}\n\n`;
      continue;
    }
    if (slot.operators.length === 0) {
      text += `${header}\n- (no operators)\n\n`;
      continue;
    }
    const names = slot.operators.map((o) => o.op).join(' , ');
    text += `${header}\n- ${names}\n\n`;
  }
  text += 'Send `!clanmission` to start a new setup.';
  return text;
}

function formatGameChatResults(session, slotResults) {
  let text = '*Clan Mission — Game Chat*\n\n';
  for (let i = 0; i < TOTAL_SLOTS; i += 1) {
    const slot = slotResults[i];
    if (!slot.mission) {
      text += `[CLAN] M${i + 1} Skip\n`;
      continue;
    }
    if (slot.operators.length === 0) {
      text += `[CLAN] M${i + 1} ${slot.mission}: (no operators)\n`;
      continue;
    }
    const names = slot.operators.map((o) => o.op).join(', ');
    text += `[CLAN] M${i + 1} ${slot.mission}: ${names}\n`;
  }
  text += '\nSend `!clanmission` to start a new setup.';
  return text;
}

async function startSession(from) {
  const session = {
    state: 'awaiting_mode',
    mode: null,
    currentSlot: 0,
    missions: [],
    startedAt: Date.now()
  };
  await setSession(from, session);
  return formatModePrompt();
}

async function processSessionResponse(from, session, userText) {
  const trimmed = String(userText || '').trim();
  const lower = trimmed.toLowerCase();

  // Cancel at any point
  if (lower === 'cancel' || lower === '!cancel') {
    await clearSession(from);
    return 'Clan mission setup cancelled.';
  }

  if (session.state === 'awaiting_mode') {
    const mode = resolveModeChoice(trimmed);
    if (!mode) {
      return formatModePrompt() + '\n\nInvalid choice. Reply with 1, 2, or 3.';
    }
    session.mode = mode;
    session.state = 'awaiting_mission';
    session.currentSlot = 0;
    session.missions = [];
    await setSession(from, session);
    return formatMissionPrompt(session.currentSlot + 1);
  }

  if (session.state === 'awaiting_mission') {
    const slotIndex = session.currentSlot;
    if (slotIndex >= TOTAL_SLOTS) {
      return await finalizeSession(from, session);
    }

    const choice = resolveMissionChoice(trimmed);
    if (choice === null) {
      return formatMissionPrompt(slotIndex + 1) + '\n\nInvalid choice. Reply with a mission number or `skip`.';
    }

    session.missions[slotIndex] = choice;
    session.currentSlot += 1;

    if (session.currentSlot >= TOTAL_SLOTS) {
      return await finalizeSession(from, session);
    }

    await setSession(from, session);
    return formatMissionPrompt(session.currentSlot + 1);
  }

  // Unknown or completed state: clear and start fresh
  await clearSession(from);
  return 'Session state invalid. Send `!clanmission` to start again.';
}

async function finalizeSession(from, session) {
  let slotResults;
  if (session.mode === 'smart_balance') {
    slotResults = assignSmartBalanceOperators(session.missions);
  } else if (session.mode === 'gamechat') {
    slotResults = assignGameChatOperators(session.missions);
  } else {
    slotResults = assignBestOperators(session.missions);
  }

  await clearSession(from);

  if (session.mode === 'gamechat') {
    return formatGameChatResults(session, slotResults);
  }
  return formatResults(session, slotResults);
}

module.exports = {
  name: 'clanmission',
  description: 'Interactive clan mission setup (16 missions + Skip, 8 slots, placement modes)',
  async run(context) {
    const ctx = context || {};
    const { from, text } = ctx;
    const trimmed = String(text || '').trim();

    // No text argument: called as !clanmission command, start a new session
    if (!trimmed) {
      return await startSession(from);
    }

    if (!trimmed.toLowerCase().startsWith('!clanmission')) {
      return 'Send `!clanmission` to start the clan mission setup.';
    }
    return await startSession(from);
  },
  processSessionResponse
};
