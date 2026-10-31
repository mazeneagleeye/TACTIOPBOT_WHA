// Pure command handling: text in -> reply text out.
// No HTTP and no WhatsApp API code here, so it is easy to test and extend.
//
// To add a command: create src/commands/<name>.js exporting { name, description, run }
// and add it to the `commands` list below.

const { BOT_NAME } = require('../config');
const { getSession } = require('./clanMissionSession');
const { processSessionResponse } = require('../commands/clanmission');

const commands = [
  require('../commands/help'),
  require('../commands/clanmission'),
  require('../commands/cancel'),
  require('../commands/nextreset'),
  require('../commands/reminderstatus'),
  require('../commands/about'),
  require('../commands/setnextreset'),
  require('../commands/setcmnotif'),
  require('../commands/editcmnotif'),
  require('../commands/deletecmnotif')
];

const commandMap = new Map(commands.map((command) => [command.name, command]));

const GREETING = /^(hi|hello|hey|hola|greetings|salam|good\s+(morning|afternoon|evening))\b/i;

const MAX_TEXT_LENGTH = 1000;

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_TEXT_LENGTH);
}

/**
 * Turn an incoming text message into a reply string. Always returns a non-empty string.
 * @param {unknown} rawText
 * @param {object} [context] reserved for future use (e.g. { from }) - not stored or logged here.
 */
async function handleMessage(rawText, context = {}) { // eslint-disable-line no-unused-vars
  const text = normalizeText(rawText);

  // If user has an active clan mission session, route to session handler.
  // This takes priority over commands so in-flow replies (numbers, skip, cancel)
  // are captured even when they don't start with "!".
  if (context.from) {
    const session = await getSession(context.from);
    if (session) {
      return await processSessionResponse(context.from, session, text);
    }
  }

  if (!text) {
    return 'I only understand text messages. Send !help to see what I can do.';
  }

  if (text.startsWith('!')) {
    const parts = text.slice(1).split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    const command = commandMap.get(commandName);
    if (command) {
      const commandContext = { ...context, args };
      return await command.run(commandContext);
    }
    return 'Unknown command. Send !help to see the available commands.';
  }

  if (GREETING.test(text)) {
    return `Hello! I am ${BOT_NAME}. Send !help to see the available commands.`;
  }

  return "Sorry, I didn't understand that. Send !help to see the available commands.";
}

module.exports = { handleMessage, normalizeText, commands };
