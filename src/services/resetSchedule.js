// Reset schedule calculation service for TACTIOPBOT_WHA.
// Establishes the clan mission reset schedule using a timezone-aware anchor
// and a fixed 99-hour cycle. All calculations are epoch-based (UTC milliseconds).
//
// Anchor: Friday, 26 June 2026 at 06:00 Africa/Cairo
// Cycle: exactly 4 days and 3 hours (99 hours = 356,400,000 ms)
//
// Timezone handling:
// - The anchor is interpreted as 06:00 in Africa/Cairo, then converted to an
//   unambiguous UTC instant using Intl.DateTimeFormat with the IANA zone.
// - No fixed +02:00 offset is assumed; Egypt observes daylight-saving changes.
// - Built-in Intl is used (no extra dependency). Node.js 18+ ships full ICU
//   data which supports IANA timezones including Africa/Cairo.

const DEFAULT_ANCHOR = {
  year: 2026,
  month: 6,
  day: 26,
  hour: 6,
  minute: 0,
  second: 0,
  timezone: 'Africa/Cairo'
};

const CYCLE_HOURS = 99; // 4 days and 3 hours = 99 hours
const CYCLE_MS = CYCLE_HOURS * 60 * 60 * 1000; // 356,400,000 ms

const SETTING_KEY = 'reset_schedule';

/** Return a copy of the default anchor definition. */
function getDefaultAnchor() {
  return { ...DEFAULT_ANCHOR };
}

/** Return the cycle duration in milliseconds. */
function getCycleMs() {
  return CYCLE_MS;
}

/** Return the settings collection key used for schedule persistence. */
function getSettingKey() {
  return SETTING_KEY;
}

/**
 * Get the UTC offset in milliseconds for a given UTC instant in a timezone.
 * Positive offset means local time is ahead of UTC.
 */
function getUtcOffsetMs(utcMs, timeZone) {
  const d = new Date(utcMs);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const get = (type) => {
    const p = parts.find((x) => x.type === type);
    return p ? Number(p.value) : 0;
  };

  const localYear = get('year');
  const localMonth = get('month');
  const localDay = get('day');
  const localHour = get('hour');
  const localMinute = get('minute');
  const localSecond = get('second');

  const localAsUtc = Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute, localSecond, 0);
  return localAsUtc - utcMs;
}

/**
 * Convert a local date/time in the configured timezone to UTC epoch ms.
 * Uses two passes to correctly handle daylight-saving transitions.
 */
function localToUtcMs(year, month, day, hour, minute, second, timeZone = DEFAULT_ANCHOR.timezone) {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second, 0);

  const offset1 = getUtcOffsetMs(naiveUtc, timeZone);
  const adjusted1 = naiveUtc - offset1;

  const offset2 = getUtcOffsetMs(adjusted1, timeZone);

  return naiveUtc - offset2;
}

/** Return the default anchor as UTC epoch milliseconds. */
function getDefaultAnchorUtcMs() {
  return localToUtcMs(
    DEFAULT_ANCHOR.year,
    DEFAULT_ANCHOR.month,
    DEFAULT_ANCHOR.day,
    DEFAULT_ANCHOR.hour,
    DEFAULT_ANCHOR.minute,
    DEFAULT_ANCHOR.second,
    DEFAULT_ANCHOR.timezone
  );
}

/**
 * Calculate the next upcoming reset time from the anchor.
 * @param {number} anchorUtcMs - Anchor as UTC epoch ms
 * @param {number} cycleMs - Cycle duration in ms
 * @param {number} nowUtcMs - Current time as UTC epoch ms (defaults to Date.now)
 * @returns {number} Next reset UTC epoch ms (>= nowUtcMs, or anchor if now is before anchor)
 */
function calculateNextReset(anchorUtcMs, cycleMs, nowUtcMs = Date.now()) {
  if (!Number.isFinite(anchorUtcMs) || !Number.isFinite(cycleMs) || cycleMs <= 0) {
    throw new Error('Invalid anchor or cycle duration');
  }

  if (nowUtcMs <= anchorUtcMs) {
    return anchorUtcMs;
  }

  const cyclesElapsed = (nowUtcMs - anchorUtcMs) / cycleMs;
  const cycles = Math.ceil(cyclesElapsed);

  return anchorUtcMs + cycles * cycleMs;
}

/**
 * Format a UTC epoch ms as a human-readable local date/time in the configured timezone.
 */
function formatCairoLocal(utcMs, timeZone = DEFAULT_ANCHOR.timezone) {
  if (!Number.isFinite(utcMs)) {
    throw new Error('Invalid UTC timestamp');
  }
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'shortOffset'
  });
  return formatter.format(new Date(utcMs));
}

/**
 * Parse an ISO 8601 date/time string to UTC epoch ms.
 * If the input carries an explicit timezone offset (Z or +/-HH:MM), it is honored.
 * Otherwise the input is interpreted as local time in the configured timezone.
 * @param {string} input - ISO 8601 date/time string
 * @param {string} timeZone - fallback timezone when no offset is present
 * @returns {number} UTC epoch ms
 */
function parseDateTimeToUtcMs(input, timeZone = DEFAULT_ANCHOR.timezone) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new Error('Date/time input is required');
  }

  const trimmed = input.trim();
  const d = new Date(trimmed);
  if (!Number.isFinite(d.getTime())) {
    throw new Error('Invalid date/time');
  }

  const hasOffset = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(trimmed);
  if (hasOffset) {
    return d.getTime();
  }

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    return d.getTime();
  }

  const [, year, month, day, hour, minute, second = '0'] = match;
  return localToUtcMs(
    parseInt(year, 10),
    parseInt(month, 10),
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10),
    timeZone
  );
}

/**
 * Build a schedule configuration object suitable for persistence.
 * @param {number} anchorUtcMs - Anchor as UTC epoch ms
 * @param {number} cycleMs - Cycle duration in ms
 * @param {string} timeZone - IANA timezone name
 * @returns {object} { anchorUtcMs, cycleMs, timezone }
 */
function buildConfig(anchorUtcMs, cycleMs = CYCLE_MS, timeZone = DEFAULT_ANCHOR.timezone) {
  if (!Number.isFinite(anchorUtcMs) || !Number.isFinite(cycleMs) || cycleMs <= 0) {
    throw new Error('Invalid anchor or cycle duration');
  }
  return { anchorUtcMs, cycleMs, timezone: timeZone };
}

/**
 * Parse a stored schedule configuration value. Returns null if missing or invalid.
 * @param {string|null|undefined} raw - Raw stored value (JSON string or object)
 * @returns {object|null} { anchorUtcMs, cycleMs, timezone } or null
 */
function parseConfig(raw) {
  if (raw == null) return null;
  let obj;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch (error) {
      return null;
    }
  } else if (typeof raw === 'object') {
    obj = raw;
  } else {
    return null;
  }
  if (
    typeof obj.anchorUtcMs !== 'number' ||
    !Number.isFinite(obj.anchorUtcMs) ||
    typeof obj.cycleMs !== 'number' ||
    !Number.isFinite(obj.cycleMs) ||
    obj.cycleMs <= 0 ||
    typeof obj.timezone !== 'string'
  ) {
    return null;
  }
  return { anchorUtcMs: obj.anchorUtcMs, cycleMs: obj.cycleMs, timezone: obj.timezone };
}

module.exports = {
  getDefaultAnchor,
  getDefaultAnchorUtcMs,
  getCycleMs,
  getSettingKey,
  calculateNextReset,
  formatCairoLocal,
  parseDateTimeToUtcMs,
  localToUtcMs,
  buildConfig,
  parseConfig,
  DEFAULT_ANCHOR,
  CYCLE_MS,
  SETTING_KEY
};
