# TACTIOPBOT_WHA — WhatsApp Template Setup (Chapter 4)

This document explains how to create and configure the WhatsApp Cloud API message
templates required for automatic Clan Mission reminder delivery.

**IMPORTANT:** Code implementation alone does NOT activate message delivery.
Templates must be created in Meta's dashboard and approved before the scheduler
will send any messages. Delivery remains disabled by default (`REMINDER_ENABLED=false`).

---

## 1. Template to Create

Create **one** template in Meta's WhatsApp dashboard:

| Field | Value |
|-------|-------|
| **Name** | `clan_mission_reminder` |
| **Category** | `UTILITY` |
| **Type** | Text message with body parameters |

### Template Body (English reference)

```
TACTIOPBOT: Your clan missions have reset. Next reset: {{1}} (Cairo time).
```

- `{{1}}` — Next reset date/time in Cairo local time (e.g. `30/06/2026 06:00`)
- The second parameter (`{{2}}`) is reserved for reminder type (`reset` or `approaching`) but is not used in the initial version.

## 2. Required Languages

Submit the template for approval in **all 22 Meta language codes** below:

| Internal Name | Meta Language Code | Status |
|---------------|-------------------|--------|
| English | `en` | Reference |
| Arabic | `ar` | Translation defined |
| Spanish | `es` | Translation defined |
| Portuguese | `pt` | Translation defined |
| Russian | `ru` | Translation defined |
| French | `fr` | Translation defined |
| German | `de` | Translation defined |
| Turkish | `tr` | Translation defined |
| Indonesian | `id` | Translation defined |
| Polish | `pl` | Translation defined |
| Italian | `it` | Translation defined |
| Ukrainian | `uk` | Translation defined |
| Japanese | `ja` | Translation defined |
| Korean | `ko` | Translation defined |
| Vietnamese | `vi` | Translation defined |
| Thai | `th` | Translation defined |
| Chinese | `zh` | Translation defined (zh-CN and zh-TW both use `zh`) |
| Hindi | `hi` | Translation defined |
| Dutch | `nl` | Translation defined |
| Swedish | `sv` | Translation defined |
| Czech | `cs` | Translation defined |
| Hungarian | `hu` | Translation defined |
| Romanian | `ro` | Translation defined |

**Note:** The template body reference translations are defined in
`src/services/templateConfig.js` (`TEMPLATE_BODY_REFERENCE`). These are the
exact strings that should be submitted to Meta for each language. The code does
not verify that the Meta-approved text matches these references — you must
confirm manually.

## 3. Template Parameters

The template accepts **2 body parameters** (in this order):

| Parameter | Example | Description |
|-----------|---------|-------------|
| `{{1}}` | `30/06/2026 06:00` | Next reset date/time in Cairo local time |
| `{{2}}` | `reset` | Reminder type (reserved for future use) |

## 4. Project Configuration

After Meta approves the template, configure the project via environment
variables (set in your hosting dashboard, never in `.env`):

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `REMINDER_ENABLED` | Yes | Set to `true` to activate delivery | `false` |
| `REMINDER_OFFSET_MINUTES` | No | Minutes before reset to send reminder (0 = at reset) | `0` |
| `REMINDER_POLL_INTERVAL_MINUTES` | No | Scheduler poll interval in minutes | `5` |

### Minimal production configuration

```env
WHATSAPP_MODE=cloud
WHATSAPP_ACCESS_TOKEN=<from Meta>
WHATSAPP_PHONE_NUMBER_ID=<from Meta>
WHATSAPP_VERIFY_TOKEN=<your secret>
WHATSAPP_APP_SECRET=<from Meta App settings>
WHATSAPP_API_VERSION=v22.0
MONGODB_URI=<your MongoDB URI>
MONGODB_DATABASE=TACTIOPBOT_WHA
WHATSAPP_ADMIN_NUMBERS=<admin phone numbers>
REMINDER_ENABLED=true
REMINDER_OFFSET_MINUTES=0
REMINDER_POLL_INTERVAL_MINUTES=5
```

## 5. How to Verify Template Approval

1. Log in to <https://developers.facebook.com>
2. Go to **My Apps → Your App → WhatsApp → Templates**
3. Find `clan_mission_reminder`
4. Status must show **Approved** for each language you intend to use
5. Note the exact template name and language codes — they must match the code configuration

## 6. Activation Procedure (Gate C)

1. Create the template in Meta with all 22 language variants
2. Submit for approval and wait for **Approved** status
3. Set `REMINDER_ENABLED=true` in your hosting dashboard
4. Restart the bot
5. Verify with `!reminderstatus` (admin only) that scheduler shows `Running: true`
6. Subscribe a test user with `!setcmnotif`
7. Wait for the next reset event and verify delivery
8. Verify unsubscribe works with `!deletecmnotif`
9. Verify duplicate prevention by checking delivery stats

## 7. Safety Defaults

- `REMINDER_ENABLED` defaults to `false` — **no messages are sent by default**
- The scheduler only starts in `cloud` mode (not `mock`)
- If `REMINDER_ENABLED=true` but no template is approved, the scheduler logs
  errors but does not send messages
- If MongoDB is disconnected, the scheduler does not start
- No plain-text fallback: if a template is unavailable, delivery is skipped

## 8. Template Text Reference (All 22 Languages)

These are the reference translations stored in code. Submit these exact strings
to Meta for each language:

```
en: TACTIOPBOT: Your clan missions have reset. Next reset: {{1}} (Cairo time).
ar: TACTIOPBOT: تم إعادة تعيين مهام العشيرة. وقت إعادة التعيين التالي: {{1}} (توقيت القاهرة).
es: TACTIOPBOT: Las misiones del clan se han reiniciado. Próximo reinicio: {{1}} (hora de El Cairo).
pt: TACTIOPBOT: As missões do clã foram reiniciadas. Próxima reinicialização: {{1}} (horário do Cairo).
ru: TACTIOPBOT: Миссии клана сброшены. Следующий сброс: {{1}} (время Каира).
fr: TACTIOPBOT: Les missions de clan ont été réinitialisées. Prochaine réinitialisation : {{1}} (heure du Caire).
de: TACTIOPBOT: Die Clan-Missionen wurden zurückgesetzt. Nächster Reset: {{1}} (Kairo-Zeit).
tr: TACTIOPBOT: Klan görevleri sıfırlandı. Bir sonraki sıfırlama: {{1}} (Çahire saati).
id: TACTIOPBOT: Misi klan telah direset. Reset berikutnya: {{1}} (waktu Kairo).
pl: TACTIOPBOT: Misje klanu zostały zresetowane. Następny reset: {{1}} (czas Kairu).
it: TACTIOPBOT: Le missioni del clan sono state ripristinate. Prossimo reset: {{1}} (ora del Cairo).
uk: TACTIOPBOT: Кланові місії скинуто. Наступний скидання: {{1}} (час Каїра).
ja: TACTIOPBOT: クランミッションがリセットされました。次のリセット: {{1}} (カイロ時間).
ko: TACTIOPBOT: 클랜 미션이 초기화되었습니다. 다음 초기화: {{1}} (카이로 시간).
vi: TACTIOPBOT: Nhiệm vụ bang hội đã được đặt lại. Lần đặt lại tiếp theo: {{1}} (giờ Cairo).
th: TACTIOPBOT: ภารกิจแคลนถูกรีเซ็ตแล้ว. การรีเซ็ตครั้งถัดไป: {{1}} (เวลาไคโร).
zh: TACTIOPBOT: 战队任务已重置。下次重置：{{1}}（开罗时间）。
hi: TACTIOPBOT: क्लैन मिशन रीसेट हो गए हैं। अगला रीसेट: {{1}} (काहिरा समय).
nl: TACTIOPBOT: Clanmissies zijn gereset. Volgende reset: {{1}} (Caïro-tijd).
sv: TACTIOPBOT: Klanuppdragen har återställts. Nästa återställning: {{1}} (Kairo-tid).
cs: TACTIOPBOT: Klanové mise byly resetovány. Další reset: {{1}} (čas v Kahíře).
hu: TACTIOPBOT: A klánküldetések visszaálltak. Követő visszaállítás: {{1}} (Kairói idő).
ro: TACTIOPBOT: Misiunile clanului au fost resetate. Următoarea resetare: {{1}} (ora din Cairo).
```

## 9. What Is NOT Implemented

- No automatic template creation (must be done manually in Meta dashboard)
- No template approval status checking from code
- No catch-up delivery for missed reminders during downtime (missed reminders are skipped)
- No plain-text fallback outside the 24-hour customer service window