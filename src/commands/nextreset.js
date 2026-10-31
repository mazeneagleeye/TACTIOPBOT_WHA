// Next reset command for TACTIOPBOT_WHA.
// Displays the actual next upcoming clan mission reset in Cairo local time,
// calculated from the configured anchor and 99-hour cycle.
// Falls back to the default anchor when no schedule config is persisted.

const { getSetting } = require('../services/settingsService');
const {
  getDefaultAnchorUtcMs,
  getCycleMs,
  calculateNextReset,
  formatCairoLocal,
  parseConfig
} = require('../services/resetSchedule');

module.exports = {
  name: 'nextreset',
  description: 'Next reset time',
  async run() {
    let anchorUtcMs;
    let cycleMs;

    const raw = await getSetting('reset_schedule');
    const config = parseConfig(raw);

    if (config) {
      anchorUtcMs = config.anchorUtcMs;
      cycleMs = config.cycleMs;
    } else {
      anchorUtcMs = getDefaultAnchorUtcMs();
      cycleMs = getCycleMs();
    }

    const nextReset = calculateNextReset(anchorUtcMs, cycleMs, Date.now());
    const localDisplay = formatCairoLocal(nextReset);

    return [
      '*Next Reset*',
      localDisplay,
      `(UTC: ${new Date(nextReset).toISOString()})`
    ].join('\n');
  }
};
