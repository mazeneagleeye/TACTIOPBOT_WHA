# TACTIOPBOT_WHA — TACTIOPBOT ✦ Eagle Eye (WhatsApp edition)

## 1. What is this?

TACTIOPBOT_WHA is a small, separate Node.js project that runs the **WhatsApp edition** of TACTIOPBOT. It uses the **official Meta WhatsApp Business Platform (Cloud API)** only. It does not use WhatsApp Web automation, QR-code login or any library that drives a personal WhatsApp account.

It is one Express server that provides:

| Endpoint | Purpose |
|---|---|
| `GET /` | Basic service information |
| `GET /health` | Health check (use this on your host) |
| `GET /webhook` | Meta webhook verification |
| `POST /webhook` | Incoming WhatsApp events (signature checked with `WHATSAPP_APP_SECRET`) |
| `POST /dev/message` | Local simulator. Only exists when `WHATSAPP_MODE=mock` and `NODE_ENV` is not `production` |

## 2. How it differs from the Discord bot

| | Discord bot (`TACTIOPBOT`) | WhatsApp bot (`TACTIOPBOT_WHA`) |
|---|---|---|
| Platform | Discord | WhatsApp Cloud API |
| Project folder | `D:\mazen\discord bot\TACTIOPBOT` | `D:\mazen\discord bot\TACTIOPBOT_WHA` |
| Database | MongoDB | **None.** Not connected yet |
| Features | Full feature set | 5 basic commands, several of them placeholders |
| Process | Own process | Own process. Nothing is shared |

The two projects are fully independent. This project never reads, imports or modifies the Discord project, and it has its own dependencies and its own `.env`. **Do not copy the Discord project's database credentials into this project.**

## 3. Prerequisites

- **Node.js 18 or newer** (developed on Node 22). Download the LTS installer from <https://nodejs.org>. Then open a new PowerShell window and check:
  ```powershell
  node --version
  npm --version
  ```
- For the real WhatsApp mode only: a free Meta developer account, and a public HTTPS URL (for example from your host).
- No paid database and no credit card are needed for local mock mode.

## 4. Create your `.env` (Windows)

```powershell
cd "D:\mazen\discord bot\TACTIOPBOT_WHA"
Copy-Item .env.example .env
```

For local mock mode the defaults are fine, so you can leave every `WHATSAPP_*` value empty. `.env` is ignored by git. Never share it.

## 5. Install dependencies

```powershell
npm install
```

This installs only `express` and `dotenv`.

## 6. Start in mock mode

```powershell
npm start
```

You should see a JSON log line saying the bot is listening on port 3000 with `"mode":"mock"`. Mock mode starts without any Meta credentials and **never sends real WhatsApp messages**. Stop it with `Ctrl+C`.

## 7. Test each command locally

With the bot running, open a **second** PowerShell window.

```powershell
function Send-Bot($text) {
  Invoke-RestMethod -Method Post -Uri http://localhost:3000/dev/message `
    -ContentType 'application/json' `
    -Body (@{ from = 'local-test'; text = $text } | ConvertTo-Json) |
    Select-Object -ExpandProperty reply
}

Send-Bot '!help'
Send-Bot '!clanmission'
Send-Bot '!nextreset'
Send-Bot '!reminderstatus'
Send-Bot '!about'
Send-Bot '  !HELP  '        # case-insensitive, whitespace tolerated
Send-Bot 'hello'            # greeting
Send-Bot 'something else'   # unknown message -> points to !help
```

Using curl (use `curl.exe`, because plain `curl` is an alias for `Invoke-WebRequest` in PowerShell):

```powershell
curl.exe -X POST http://localhost:3000/dev/message -H "Content-Type: application/json" -d "{\"from\":\"local-test\",\"text\":\"!help\"}"
```

The response is JSON, for example `{"from":"local-test","reply":"...","simulated":true,"sentToWhatsApp":false}`. The simulator allows 30 requests per minute per client.

Health check: `Invoke-RestMethod http://localhost:3000/health`

## 8. Run the automated tests

```powershell
npm test
```

The tests use Node's built-in test runner. They need no network, no Meta credentials, no WhatsApp number and no access to the Discord project.

## 9. Create a Meta developer app and enable the WhatsApp Cloud API

Meta changes its dashboard often, so button names may differ slightly. See the official docs: <https://developers.facebook.com/docs/whatsapp/cloud-api/get-started>.

1. Go to <https://developers.facebook.com> and log in or register as a developer.
2. Click **My Apps → Create App**. Choose the **Business** type (or the flow Meta offers for WhatsApp).
3. In the app dashboard, add the **WhatsApp** product and follow the setup. You may be asked to create or select a Meta Business portfolio.
4. Open **WhatsApp → API Setup**.

## 10. Get and configure Meta's test credentials

On **WhatsApp → API Setup** you will find:

- A **temporary access token** → `WHATSAPP_ACCESS_TOKEN`
- A **test phone number** with its **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID` (use the *ID*, not the phone number itself)
- The **API version** shown in the sample request (`v<major>.<minor>`) → `WHATSAPP_API_VERSION`. The project deliberately does not hardcode a version.
- Your **App Secret** under **App settings → Basic** → `WHATSAPP_APP_SECRET`
- A **verify token** that you invent yourself (any long random string) → `WHATSAPP_VERIFY_TOKEN`

Important limitations:

- **Temporary access tokens expire** (typically after about 24 hours). When sending fails with an `invalid_or_expired_credentials` log, generate a new token, or create a long-lived System User token in Meta Business Settings.
- **Test numbers have restrictions.** You can message only the recipient numbers you add and verify in API Setup (a small allowed list). Messaging the public needs your own business phone number and possibly Meta business verification. Meta's pricing and policies can change, so check the current rules. This project does not promise a free permanent number.
- Meta's 24-hour customer-service window applies. The bot only replies to inbound user messages, so replies are normally inside that window.

## 11. Configure and verify the public webhook

Meta must reach your server over **public HTTPS**. `localhost` does not work for Meta.

1. Deploy the bot (see section 13) or expose your local port with a tunnelling tool of your choice. A tunnelling tool is not part of this project.
2. In the Meta dashboard open **WhatsApp → Configuration → Webhook → Edit**.
3. **Callback URL:** `https://<your-public-domain>/webhook`
4. **Verify token:** the exact value of your `WHATSAPP_VERIFY_TOKEN`.
5. Click **Verify and save**. Meta calls `GET /webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`. The bot echoes the challenge only if the token matches. Otherwise it returns 403.
6. Under **Webhook fields**, subscribe to **`messages`**.

**Signature validation:** Meta signs every `POST /webhook` with your App Secret in the `X-Hub-Signature-256` header. If `WHATSAPP_APP_SECRET` is set, the bot checks that signature against the raw request body and rejects invalid or missing signatures with 401. With `NODE_ENV=production` in Cloud mode, startup fails if `WHATSAPP_APP_SECRET` is missing. To set it up, copy the **App Secret** from **App settings → Basic** into `WHATSAPP_APP_SECRET`. Never expose it.

## 12. Switch from mock mode to Cloud API mode

Edit `.env` (or the hosting dashboard variables):

```env
PORT=3000
NODE_ENV=production
WHATSAPP_MODE=cloud
WHATSAPP_ACCESS_TOKEN=<token from Meta>
WHATSAPP_PHONE_NUMBER_ID=<phone number ID from Meta>
WHATSAPP_VERIFY_TOKEN=<your invented secret string>
WHATSAPP_APP_SECRET=<App Secret from Meta>
WHATSAPP_API_VERSION=<version shown in API Setup, v<major>.<minor>>
```

Then restart. If something is missing, startup stops and lists the **names** of the missing variables (never their values). In Cloud mode `/dev/message` is not available.

A successful send response from Meta only means the API **accepted** the message. It does not prove delivery. Delivery and read updates arrive later as `statuses` webhook events, which the bot ignores and never replies to.



## 13. Deploy on FadeHost

This project is prepared for a generic Node.js host such as FadeHost. It has **not** been deployed from this repository, so confirm the exact panel options in FadeHost's own dashboard. Do not assume permanent uptime or a free permanent WhatsApp number.

**What to deploy:** the contents of `D:\mazen\discord bot\TACTIOPBOT_WHA` only:

- `package.json` and `package-lock.json`
- the `src/` folder
- optional: `README.md`, `test/`

**Do not upload:** `.env` (set variables in the dashboard instead), `node_modules` (let the host run `npm install`), or anything from the Discord project.

**Settings:**

- Install command: `npm install` (or `npm ci --omit=dev`)
- Start command: `npm start` (runs `node src/index.js`)
- Node version: 18 or newer
- The app listens on `process.env.PORT` and binds to `0.0.0.0`, as hosts require.
- Health check path: `/health`

**Environment variables:** in the FadeHost dashboard find the environment variable / startup settings of your server and add each variable from section 12 as a name/value pair. Panel layouts differ, so look for a section named "Environment", "Variables" or "Startup". Leave `PORT` unset if the host injects it. Restart after changing variables.

**Webhook URL:** use the public HTTPS address FadeHost assigns to this app, followed by `/webhook`, for example `https://<assigned-address>/webhook`. Enter it in Meta as in section 11. Meta needs HTTPS, so if the host only gives you plain HTTP or a bare IP you will need an HTTPS domain or proxy.

## 14. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `Configuration error: Cloud API mode is missing required variables: ...` | Set the listed variables. Only names are shown. |
| Meta says "callback URL or verify token couldn't be validated" | The token differs from `WHATSAPP_VERIFY_TOKEN`, the URL isn't public HTTPS, or the server isn't running. Open `https://<domain>/health` in a browser first. |
| `Webhook POST rejected: invalid or missing signature` | `WHATSAPP_APP_SECRET` is wrong or belongs to a different Meta app. |
| Log shows `invalid_or_expired_credentials` | The temporary token expired. Generate a new one and restart. |
| Log shows `permission_denied` | The token lacks WhatsApp permissions, or the recipient isn't on the test-number allowed list. |
| Log shows `rate_limited` | Meta throttled sends. The bot does not retry rate limits. Wait and try again. |
| Log shows `request_rejected` | Check `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_API_VERSION`. See `errorMessage` in the log. |
| Messages arrive but no answer | You may not be subscribed to the `messages` webhook field, or the app is in mock mode (replies are never sent). |
| `/dev/message` returns 404 | It only exists with `WHATSAPP_MODE=mock` and `NODE_ENV` not `production`. |
| `EADDRINUSE` | Port 3000 is in use. Set another `PORT` in `.env`. |
| `fetch is not defined` | Node is older than 18. Upgrade Node. |


## 15. Implemented vs. placeholder

| Feature | Status |
|---|---|
| `!help`, `!about` | Implemented |
| Greetings and unknown-message reply | Implemented |
| `!clanmission` | **Placeholder.** Logic not connected |
| `!nextreset` | **Placeholder.** Reset schedule not connected |
| `!reminderstatus` | **Planned.** Notification integration not connected |
| Mock mode and `/dev/message` | Implemented |
| Webhook verification, signature check, text parsing | Implemented |
| Sending text through the Cloud API | Implemented and unit-tested with a fake `fetch`. **Not tested against live Meta** |
| MongoDB / shared TACTIOPBOT data | Not connected |

The bot does not invent clan-mission data, reset dates, player data or notification settings.

## 16. Privacy and security notes

- Message text is not stored or logged. Phone numbers are masked in logs (last 4 characters only).
- Only message IDs are kept in memory (up to 1000) so Meta's webhook retries don't cause duplicate replies.
- Secrets are redacted from logs and never returned over HTTP. Errors return generic messages with no stack traces.
- Request bodies are limited: 256 KB for `/webhook`, 10 KB for `/dev/message`.
- The bot only replies to inbound **text** messages. Statuses, receipts, reactions and media are ignored, so there is no reply loop.
- The simulator is unavailable in production and in Cloud mode.

## 17. Connecting to the existing TACTIOPBOT later (future phase)

Command handlers live in `src/commands/` and are plain functions: `run(context)` returns a string. Real data can be wired in later by calling a shared service or package from a handler, without touching the HTTP or WhatsApp code. The Discord project has deliberately **not** been inspected or connected in this phase. Before connecting, you would need to decide and document:

- **Clan missions:** where mission data lives (MongoDB collection names and schema, or an existing function), which fields to show, and how a WhatsApp user maps to a clan or player.
- **Reset schedule:** the source of truth for reset times (code or database), the time zone and the format.
- **Reminders / notifications:** how subscriptions are stored, whether WhatsApp opt-in is separate from Discord, and how users opt in and out. WhatsApp also requires approved **message templates** for business-initiated messages outside the 24-hour window.
- **Access:** a separate read-only database user for this project, with its own credentials in this project's `.env`. Do not reuse the Discord bot's credentials.
- **Sharing code:** a small shared package or an internal API, so the two bots do not import each other's files.

To add a command: create `src/commands/<name>.js` exporting `{ name, description, run }`, then add it to the list in `src/services/messageHandler.js` and to `src/commands/help.js`.

## Project layout

```
TACTIOPBOT_WHA/
  package.json  .env.example  .gitignore  README.md
  src/
    index.js            Express app + startup
    config.js           env loading and validation
    routes/             health.js, webhook.js, development.js
    services/           whatsappApi.js (sending), webhookParser.js (parsing + signature check), messageHandler.js (commands)
    commands/           help, clanmission, nextreset, reminderstatus, about
    utils/logger.js     redacting JSON logger
  test/                 node:test tests
```

