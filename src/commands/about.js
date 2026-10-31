const { BOT_NAME } = require('../config');

module.exports = {
  name: 'about',
  description: 'About this bot',
  run() {
    return [
      `*${BOT_NAME}*`,
      'TACTIOPBOT is a clan companion bot. This is its WhatsApp edition, running on the official WhatsApp Business Cloud API.',
      'Only basic commands are available so far. Send !help to see them.'
    ].join('\n');
  }
};
