// Set next reset command for TACTIOPBOT_WHA.
// Admin-only. Sets a new anchor point for the clan mission reset schedule.
// Subsequent resets are calculated from this anchor using the fixed 99-hour cycle.
// Accepts an ISO 8601 date/time string. If no timezone offset is present, the
// value is interpreted as Africa/Cairo local time.

const { isAuthorized, updateSetting } = require('../services/adminService');
const {
  getCycleMs,
  parseDateTimeToUtcMs,
  formatCairoLocal,
  buildConfig
} = require('../services/resetSchedule');

module.exports = {
  name: 'setnextreset',
  description: 'Set the next reset anchor time (admin only)',
  async run(context) {
    const sender = context && context.from;
    const adminNumbers = context && context.adminNumbers;
    const value = context && context.args;

    if (!value || typeof value !== 'string' || value.trim() === '') {
      return 'Usage: !setnextreset <ISO date/time>\nExample: !setnextreset 2026-06-26T06:00';
    }

    // Authorization is checked before validating the date, so unauthorized
    // senders always receive the authorization error regardless of input.
    if (!isAuthorized(sender, adminNumbers)) {
      return 'Unauthorized: you are not an admin.';
    }

    let anchorUtcMs;
    try {
      anchorUtcMs = parseDateTimeToUtcMs(value.trim());
    } catch (error) {
      return 'Invalid date/time. Use ISO 8601 format (e.g. 2026-06-26T06:00 or 2026-06-26T06:00:00Z).';
    }

    const config = buildConfig(anchorUtcMs, getCycleMs());

    const result = await updateSetting('reset_schedule', JSON.stringify(config), sender, adminNumbers);
    if (!result.ok) {
      if (result.error === 'unauthorized') {
        return 'Unauthorized: you are not an admin.';
      }
      if (result.error === 'database_unavailable') {
        return 'Database unavailable. Could not save reset schedule. Try again later.';
      }
      return 'Failed to update reset schedule.';
    }

    const localDisplay = formatCairoLocal(anchorUtcMs);
    return [
      `*Reset schedule anchor updated*`,
      localDisplay,
      `Subsequent resets occur every 4 days 3 hours (UTC anchor: ${new Date(anchorUtcMs).toISOString()}).`
    ].join('\n');
  }
};
