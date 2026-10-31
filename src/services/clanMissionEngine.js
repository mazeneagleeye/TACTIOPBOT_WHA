// Clan mission assignment engine.
// Ported from the Discord bot's clanmission.js assignment algorithms.
// Reuses missionDataActive.js as the source of operator scores.
// No credentials are stored or logged here.

const { missionData } = require('../../missionDataActive');

const MISSION_CHOICES = [
  { name: 'Skip', value: 'Skip' },
  { name: 'Breach', value: 'Breach' },
  { name: 'B.S.S', value: 'B.S.S' },
  { name: 'Basic Mission', value: 'Basic Mission' },
  { name: 'Bayonet', value: 'Bayonet' },
  { name: 'Clean Up', value: 'Clean Up' },
  { name: 'Common Only', value: 'Common Only' },
  { name: 'Cover', value: 'Cover' },
  { name: 'Hammer', value: 'Hammer' },
  { name: 'HILDR', value: 'HILDR' },
  { name: 'Knife', value: 'Knife' },
  { name: 'Locals', value: 'Locals' },
  { name: 'Logistics', value: 'Logistics' },
  { name: 'Rare Only', value: 'Rare Only' },
  { name: 'Recon', value: 'Recon' },
  { name: 'Showdown', value: 'Showdown' },
  { name: 'Uncommon Only', value: 'Uncommon Only' }
];

const PLACEMENT_MODES = [
  { name: 'Default Mode', value: 'default' },
  { name: 'Smart Balance Mode', value: 'smart_balance' },
  { name: 'Game Chat Mode', value: 'gamechat', description: 'Generate Tacticool chat messages' }
];

const MISSION_NAMES = MISSION_CHOICES.map((c) => c.value);

/** Get the list of mission choices as numbered text lines. */
function listMissionChoices() {
  return MISSION_CHOICES.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
}

/** Resolve a user reply (number or name) to a mission choice value. */
function resolveMissionChoice(input) {
  const trimmed = String(input || '').trim();
  const lower = trimmed.toLowerCase();

  // Numeric choice (1-based)
  const num = Number(trimmed);
  if (Number.isInteger(num) && num >= 1 && num <= MISSION_CHOICES.length) {
    return MISSION_CHOICES[num - 1].value;
  }

  // Exact name match (case-insensitive)
  for (const choice of MISSION_CHOICES) {
    if (choice.name.toLowerCase() === lower) {
      return choice.value;
    }
  }

  return null;
}

/** Resolve a mode reply (number or name) to a placement mode value. */
function resolveModeChoice(input) {
  const trimmed = String(input || '').trim();
  const lower = trimmed.toLowerCase();

  const num = Number(trimmed);
  if (Number.isInteger(num) && num >= 1 && num <= PLACEMENT_MODES.length) {
    return PLACEMENT_MODES[num - 1].value;
  }

  for (const mode of PLACEMENT_MODES) {
    if (mode.value === lower) return mode.value;
    if (mode.name.toLowerCase() === lower) return mode.value;
    // Match "smart balance" -> "smart_balance" (without "mode" suffix)
    if (mode.name.toLowerCase().replace(/\s+mode$/, '') === lower) return mode.value;
  }

  return null;
}

/**
 * assignBestOperators — ported from Discord clanmission.js.
 * Default placement mode.
 *
 * Rules:
 * - Process missions from highest priority to lowest (Mission 8 -> Mission 1).
 * - If an operator has the SAME star value across multiple selected missions,
 *   distribute it fairly across those missions (even split; odd remainder to
 *   higher-priority mission).
 * - Otherwise, place the operator in the mission where it has the highest value.
 *
 * @param {string[]} missions - Array of 8 entries (Mission 1..8), "Skip" for empty slots.
 * @returns {Array<{mission: string|null, operators: Array<{op: string, value: number}>}>}
 *   Array of 8 slot results, one per mission slot in order.
 */
function assignBestOperators(missions) {
  const selected = missions
    .map((m, idx) => ({ mission: m, slotIndex: idx }))
    .filter((x) => x.mission && x.mission.toLowerCase() !== 'skip');

  // Priority: Mission 8 first, then 7... Mission 1 last
  selected.sort((a, b) => b.slotIndex - a.slotIndex);

  // Build a per-operator map of slotIndex -> value
  const perOp = {};
  for (const { mission, slotIndex } of selected) {
    const ops = missionData[mission] || {};
    for (const [op, value] of Object.entries(ops)) {
      if (!perOp[op]) perOp[op] = {};
      perOp[op][slotIndex] = value;
    }
  }

  // Prepare result buckets (key by mission name)
  const results = {};
  for (const { mission } of selected) results[mission] = [];

  // Group operators by their tie pattern (which missions they achieve max value in)
  const tieGroups = {};
  for (const [op, valuesBySlot] of Object.entries(perOp)) {
    const entries = Object.entries(valuesBySlot).map(([slotIndexStr, value]) => ({
      slotIndex: Number(slotIndexStr),
      value
    }));
    if (entries.length === 0) continue;

    const maxValue = Math.max(...entries.map((e) => e.value));
    const bestSlots = entries
      .filter((e) => e.value === maxValue)
      .sort((a, b) => b.slotIndex - a.slotIndex); // higher priority first

    const tieKey = bestSlots.map((s) => s.slotIndex).join(',');
    if (!tieGroups[tieKey]) tieGroups[tieKey] = { slots: bestSlots, operators: [] };
    tieGroups[tieKey].operators.push({ op, maxValue });
  }

  // Distribute operators within each tie group
  for (const { slots, operators } of Object.values(tieGroups)) {
    if (slots.length === 1) {
      // No tie - assign all to the single best slot
      const missionName = selected.find((s) => s.slotIndex === slots[0].slotIndex).mission;
      for (const { op, maxValue } of operators) {
        results[missionName].push({ op, value: maxValue });
      }
    } else {
      // Tie - distribute evenly across slots
      operators.sort((a, b) => a.op.localeCompare(b.op));

      const perSlot = Math.floor(operators.length / slots.length);
      const remainder = operators.length % slots.length;

      let opIndex = 0;
      for (let i = 0; i < slots.length; i += 1) {
        const count = perSlot + (i < remainder ? 1 : 0);
        const missionName = selected.find((s) => s.slotIndex === slots[i].slotIndex).mission;
        for (let j = 0; j < count; j += 1) {
          results[missionName].push({
            op: operators[opIndex].op,
            value: operators[opIndex].maxValue
          });
          opIndex += 1;
        }
      }
    }
  }

  // Sort operators within each mission by value desc, then name asc
  for (const mission of Object.keys(results)) {
    results[mission].sort((a, b) => (b.value - a.value) || a.op.localeCompare(b.op));
  }

  // Normalize to array of 8 slot results in order
  return missions.map((m, slotIndex) => {
    if (!m || m.toLowerCase() === 'skip') {
      return { mission: null, operators: [] };
    }
    return {
      mission: m,
      operators: results[m] || []
    };
  });
}

/** Get selected (non-skip) mission slots with their indices. */
function getSelectedSlots(missions) {
  return missions
    .map((mission, slotIndex) => ({ mission, slotIndex }))
    .filter((item) => item.mission && item.mission.toLowerCase() !== 'skip');
}

/** Get all unique operator names across all missions, sorted alphabetically. */
function getAllOperatorNames() {
  const operators = new Set();
  for (const ops of Object.values(missionData)) {
    for (const op of Object.keys(ops || {})) operators.add(op);
  }
  return Array.from(operators).sort((a, b) => a.localeCompare(b));
}

/** Calculate smart-balance quotas per selected slot based on slot weight. */
function calculateSmartQuotas(selectedSlots, operatorCount) {
  if (selectedSlots.length === 0) return [];
  const totalWeight = selectedSlots.reduce((sum, slot) => sum + (slot.slotIndex + 1), 0);
  const quotas = selectedSlots.map((slot) => {
    const weight = slot.slotIndex + 1;
    const exact = (weight / totalWeight) * operatorCount;
    return {
      count: Math.round(exact),
      remainder: exact - Math.floor(exact)
    };
  });

  let used = quotas.reduce((sum, quota) => sum + quota.count, 0);
  const addOrder = quotas
    .map((quota, index) => ({ index, remainder: quota.remainder }))
    .sort((a, b) => (b.remainder - a.remainder) || (b.index - a.index));

  for (let i = 0; used < operatorCount; i += 1, used += 1) {
    quotas[addOrder[i % addOrder.length].index].count += 1;
  }

  for (let i = quotas.length - 1; used > operatorCount && i >= 0; ) {
    if (quotas[i].count > 0) {
      quotas[i].count -= 1;
      used -= 1;
    }
    i = i === 0 ? quotas.length - 1 : i - 1;
  }

  return quotas.map((quota) => quota.count);
}

/**
 * assignSmartBalanceOperators — ported from Discord clanmission.js.
 * Smart Balance placement mode.
 *
 * Calculates quotas per slot based on slot weight (Mission 1 weight=1 ... Mission 8 weight=8),
 * then assigns all operators sorted by best value, filling quotas.
 *
 * @param {string[]} missions - Array of 8 entries (Mission 1..8), "Skip" for empty slots.
 * @returns {Array<{mission: string|null, operators: Array<{op: string, value: number}>}>}
 *   Array of 8 slot results, one per mission slot in order.
 */
function assignSmartBalanceOperators(missions) {
  const selectedSlots = getSelectedSlots(missions);
  const results = missions.map(() => ({ mission: null, operators: [] }));
  if (selectedSlots.length === 0) return results;

  const operators = getAllOperatorNames();
  const quotas = calculateSmartQuotas(selectedSlots, operators.length);
  const remaining = quotas.slice();

  // Fill in mission names for non-skip slots
  for (const { mission, slotIndex } of selectedSlots) {
    results[slotIndex].mission = mission;
  }

  const operatorProfiles = operators.map((op) => {
    const scores = selectedSlots.map((slot, selectedIndex) => ({
      selectedIndex,
      slotIndex: slot.slotIndex,
      mission: slot.mission,
      value: (missionData[slot.mission] && missionData[slot.mission][op]) || 0
    }));
    const bestValue = scores.reduce((max, score) => Math.max(max, score.value), 0);
    return { op, bestValue, scores };
  });

  operatorProfiles.sort((a, b) => (b.bestValue - a.bestValue) || a.op.localeCompare(b.op));

  for (const profile of operatorProfiles) {
    const rankedScores = profile.scores
      .slice()
      .sort((a, b) =>
        (b.value - a.value) ||
        (b.slotIndex - a.slotIndex) ||
        a.mission.localeCompare(b.mission)
      );

    let target = rankedScores.find((score) => remaining[score.selectedIndex] > 0);
    if (!target) {
      target = rankedScores[rankedScores.length - 1];
    }

    if (target) {
      results[target.slotIndex].operators.push({ op: profile.op, value: target.value });
      remaining[target.selectedIndex] = Math.max(0, remaining[target.selectedIndex] - 1);
    }
  }

  for (const ops of results) {
    ops.operators.sort((a, b) => (b.value - a.value) || a.op.localeCompare(b.op));
  }

  return results;
}

/**
 * assignGameChatOperators — ported from Discord clanmission.js gamechat mode.
 * Uses assignBestOperators internally, formats output as Tacticool chat messages.
 *
 * @param {string[]} missions - Array of 8 entries (Mission 1..8), "Skip" for empty slots.
 * @returns {Array<{mission: string|null, operators: Array<{op: string, value: number}>}>}
 */
function assignGameChatOperators(missions) {
  return assignBestOperators(missions);
}

module.exports = {
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
};
