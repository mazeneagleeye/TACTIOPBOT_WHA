// Cancel command: clears any active clan mission session for the sender.
// Safe to call when no session exists.

const { clearSession } = require('../services/clanMissionSession');

module.exports = {
  name: 'cancel',
  description: 'Cancel any active clan mission setup session',
  async run(context) {
    const { from } = context;
    await clearSession(from);
    return 'Clan mission setup cancelled (if any was active).';
  }
};
