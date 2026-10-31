const { BOT_NAME } = require('../config');

module.exports = {
  name: 'help',
  description: 'Show the list of available commands',
  run() {
    return [
      `*${BOT_NAME}* - WhatsApp edition`,
      '',
      'Available commands:',
      '!help - Show this list',
      '!clanmission - Interactive clan mission setup (16 missions + Skip, 8 slots)',
      '!cancel - Cancel any active clan mission session',
      '!nextreset - Next reset time (placeholder, not connected yet)',
      '!setnextreset - Set the next reset time (admin only)',
      '!setcmnotif - Subscribe to Clan Mission notifications',
      '!editcmnotif - Edit your notification subscription (language, enabled)',
      '!deletecmnotif - Unsubscribe from Clan Mission notifications',
      '!reminderstatus - Show your notification subscription status',
      '!about - About this bot',
      '',
      'Notification commands:',
      '!setcmnotif [language <name>] [enabled true|false]',
      '!editcmnotif [language <name>] [enabled true|false]',
      'Supported languages: English, Arabic, Spanish, Portuguese, Russian, French,',
      'German, Turkish, Indonesian, Polish, Italian, Ukrainian, Japanese, Korean,',
      'Vietnamese, Thai, Chinese, Hindi, Dutch, Swedish, Czech, Hungarian, Romanian',
      '',
      'Automatic notification delivery is not yet active. It will activate after',
      'WhatsApp template approval and scheduler setup.',
      '',
      'You can also say hello!'
    ].join('\n');
  }
};
