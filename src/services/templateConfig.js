// WhatsApp template configuration for TACTIOPBOT_WHA.
// Defines the Clan Mission reminder template structure, Meta language code mapping,
// and delivery enablement. All values are configurable via environment variables.
// Templates must be created and approved in Meta before delivery can be enabled.
// No access tokens or secrets are stored here.

const TEMPLATE_NAME = 'clan_mission_reminder';
const TEMPLATE_CATEGORY = 'utility';

// Template parameter definitions (positional, in order).
// {{1}} = next reset date/time in Cairo local time.
// {{2}} = reminder type ('reset' or 'approaching').
const TEMPLATE_PARAMETERS = [
  { name: 'reset_datetime', type: 'text', example: '30/06/2026 06:00' },
  { name: 'reminder_type', type: 'text', example: 'reset' }
];

// Internal language name → Meta language code mapping.
// Meta accepts specific language/locale codes. Some internal names share a Meta code:
//   pt-PT and pt-BR both map to 'pt'
//   zh-CN and zh-TW both map to 'zh'
// This mapping is used when sending template messages; the actual template
// content must exist and be approved in Meta for each language code.
const LANGUAGE_CODE_MAP = {
  English: 'en',
  Arabic: 'ar',
  Spanish: 'es',
  Portuguese: 'pt',
  Russian: 'ru',
  French: 'fr',
  German: 'de',
  Turkish: 'tr',
  Indonesian: 'id',
  Polish: 'pl',
  Italian: 'it',
  Ukrainian: 'uk',
  Japanese: 'ja',
  Korean: 'ko',
  Vietnamese: 'vi',
  Thai: 'th',
  Chinese: 'zh',
  Hindi: 'hi',
  Dutch: 'nl',
  Swedish: 'sv',
  Czech: 'cs',
  Hungarian: 'hu',
  Romanian: 'ro'
};

// Template body reference for Meta template creation.
// This is documentation only — the actual template text must match what is
// submitted and approved in Meta's WhatsApp dashboard. Each language entry
// corresponds to one Meta-approved template language variant.
// Languages marked UNVERIFIED do not yet have a confirmed Meta-approved
// translation and must be reviewed before enabling that language.
const TEMPLATE_BODY_REFERENCE = {
  en: 'TACTIOPBOT: Your clan missions have reset. Next reset: {{1}} (Cairo time).',
  ar: 'TACTIOPBOT: تم إعادة تعيين مهام العشيرة. وقت إعادة التعيين التالي: {{1}} (توقيت القاهرة).',
  es: 'TACTIOPBOT: Las misiones del clan se han reiniciado. Próximo reinicio: {{1}} (hora de El Cairo).',
  pt: 'TACTIOPBOT: As missões do clã foram reiniciadas. Próxima reinicialização: {{1}} (horário do Cairo).',
  ru: 'TACTIOPBOT: Миссии клана сброшены. Следующий сброс: {{1}} (время Каира).',
  fr: 'TACTIOPBOT: Les missions de clan ont été réinitialisées. Prochaine réinitialisation : {{1}} (heure du Caire).',
  de: 'TACTIOPBOT: Die Clan-Missionen wurden zurückgesetzt. Nächster Reset: {{1}} (Kairo-Zeit).',
  tr: 'TACTIOPBOT: Klan görevleri sıfırlandı. Bir sonraki sıfırlama: {{1}} (Çahire saati).',
  id: 'TACTIOPBOT: Misi klan telah direset. Reset berikutnya: {{1}} (waktu Kairo).',
  pl: 'TACTIOPBOT: Misje klanu zostały zresetowane. Następny reset: {{1}} (czas Kairu).',
  it: 'TACTIOPBOT: Le missioni del clan sono state ripristinate. Prossimo reset: {{1}} (ora del Cairo).',
  uk: 'TACTIOPBOT: Кланові місії скинуто. Наступний скидання: {{1}} (час Каїра).',
  ja: 'TACTIOPBOT: クランミッションがリセットされました。次のリセット: {{1}} (カイロ時間).',
  ko: 'TACTIOPBOT: 클랜 미션이 초기화되었습니다. 다음 초기화: {{1}} (카이로 시간).',
  vi: 'TACTIOPBOT: Nhiệm vụ bang hội đã được đặt lại. Lần đặt lại tiếp theo: {{1}} (giờ Cairo).',
  th: 'TACTIOPBOT: ภารกิจแคลนถูกรีเซ็ตแล้ว. การรีเซ็ตครั้งถัดไป: {{1}} (เวลาไคโร).',
  zh: 'TACTIOPBOT: 战队任务已重置。下次重置：{{1}}（开罗时间）。',
  hi: 'TACTIOPBOT: क्लैन मिशन रीसेट हो गए हैं। अगला रीसेट: {{1}} (काहिरा समय).',
  nl: 'TACTIOPBOT: Clanmissies zijn gereset. Volgende reset: {{1}} (Caïro-tijd).',
  sv: 'TACTIOPBOT: Klanuppdragen har återställts. Nästa återställning: {{1}} (Kairo-tid).',
  cs: 'TACTIOPBOT: Klanové mise byly resetovány. Další reset: {{1}} (čas v Kahíře).',
  hu: 'TACTIOPBOT: A klánküldetések visszaálltak. Követő visszaállítás: {{1}} (Kairói idő).',
  ro: 'TACTIOPBOT: Misiunile clanului au fost resetate. Următoarea resetare: {{1}} (ora din Cairo).'
};

// Languages without a confirmed Meta-approved translation.
// These must be reviewed and approved in Meta before being enabled for delivery.
const UNVERIFIED_LANGUAGES = new Set([]);

/**
 * Map an internal language name to a Meta language code.
 * @param {string} internalName - Internal language name (e.g. 'English', 'Arabic')
 * @returns {string|null} Meta language code (e.g. 'en', 'ar') or null if unmapped
 */
function getMetaLanguageCode(internalName) {
  if (typeof internalName !== 'string') return null;
  return LANGUAGE_CODE_MAP[internalName] || null;
}

/**
 * Check whether an internal language name has a Meta language code mapping.
 */
function isLanguageMapped(internalName) {
  return getMetaLanguageCode(internalName) !== null;
}

/**
 * Check whether a language has a verified template translation.
 */
function isLanguageVerified(internalName) {
  const code = getMetaLanguageCode(internalName);
  if (!code) return false;
  if (UNVERIFIED_LANGUAGES.has(internalName)) return false;
  return Object.prototype.hasOwnProperty.call(TEMPLATE_BODY_REFERENCE, code);
}

/**
 * Get all supported internal language names that have Meta code mappings.
 */
function getMappedLanguages() {
  return Object.keys(LANGUAGE_CODE_MAP);
}

/**
 * Build template configuration from config object or environment values.
 * @param {object} config - loadConfig() result (defaults to process.env)
 * @returns {object} { name, enabled, languageCodeDefault, parameters, pollIntervalMs, offsetMinutes }
 */
function getTemplateConfig(config = {}) {
  const enabled = config.reminderEnabled === true;
  const offsetMinutes = Number.parseInt(String(config.reminderOffsetMinutes ?? 0), 10);
  const pollIntervalMinutes = Number.parseInt(String(config.reminderPollIntervalMinutes ?? 5), 10);

  return {
    name: TEMPLATE_NAME,
    category: TEMPLATE_CATEGORY,
    enabled,
    languageCodeDefault: 'en',
    parameters: TEMPLATE_PARAMETERS,
    pollIntervalMs: Math.max(1, pollIntervalMinutes) * 60 * 1000,
    offsetMinutes: Number.isFinite(offsetMinutes) ? offsetMinutes : 0
  };
}

module.exports = {
  TEMPLATE_NAME,
  TEMPLATE_CATEGORY,
  TEMPLATE_PARAMETERS,
  LANGUAGE_CODE_MAP,
  TEMPLATE_BODY_REFERENCE,
  UNVERIFIED_LANGUAGES,
  getMetaLanguageCode,
  isLanguageMapped,
  isLanguageVerified,
  getMappedLanguages,
  getTemplateConfig
};
