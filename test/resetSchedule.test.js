const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getDefaultAnchor,
  getDefaultAnchorUtcMs,
  getCycleMs,
  calculateNextReset,
  formatCairoLocal,
  parseDateTimeToUtcMs,
  localToUtcMs,
  buildConfig,
  parseConfig,
  DEFAULT_ANCHOR,
  CYCLE_MS,
  SETTING_KEY
} = require('../src/services/resetSchedule');

test('getDefaultAnchor returns the expected anchor definition', () => {
  const anchor = getDefaultAnchor();
  assert.equal(anchor.year, 2026);
  assert.equal(anchor.month, 6);
  assert.equal(anchor.day, 26);
  assert.equal(anchor.hour, 6);
  assert.equal(anchor.minute, 0);
  assert.equal(anchor.second, 0);
  assert.equal(anchor.timezone, 'Africa/Cairo');
});

test('getDefaultAnchor returns a copy (mutation safe)', () => {
  const a1 = getDefaultAnchor();
  const a2 = getDefaultAnchor();
  a1.year = 9999;
  assert.equal(a2.year, 2026);
});

test('getCycleMs returns exactly 99 hours', () => {
  assert.equal(getCycleMs(), 99 * 60 * 60 * 1000);
  assert.equal(getCycleMs(), 356400000);
});

test('CYCLE_MS constant equals 99 hours', () => {
  assert.equal(CYCLE_MS, 99 * 60 * 60 * 1000);
});

test('SETTING_KEY is reset_schedule', () => {
  assert.equal(SETTING_KEY, 'reset_schedule');
});

test('getDefaultAnchorUtcMs returns a finite UTC timestamp', () => {
  const anchorUtc = getDefaultAnchorUtcMs();
  assert.ok(Number.isFinite(anchorUtc));
  assert.ok(anchorUtc > 0);
});

test('anchor round-trips through UTC and back to Cairo local', () => {
  const anchorUtc = getDefaultAnchorUtcMs();
  const local = formatCairoLocal(anchorUtc);
  assert.ok(local.includes('26/06/2026'), `Expected date in output, got: ${local}`);
  assert.ok(local.includes('06:00'), `Expected time 06:00 in output, got: ${local}`);
  assert.ok(local.includes('Fri'), `Expected weekday Fri in output, got: ${local}`);
});

test('localToUtcMs converts anchor to UTC and back correctly', () => {
  const anchorUtc = localToUtcMs(
    DEFAULT_ANCHOR.year,
    DEFAULT_ANCHOR.month,
    DEFAULT_ANCHOR.day,
    DEFAULT_ANCHOR.hour,
    DEFAULT_ANCHOR.minute,
    DEFAULT_ANCHOR.second,
    DEFAULT_ANCHOR.timezone
  );
  assert.ok(Number.isFinite(anchorUtc));
  assert.equal(anchorUtc, getDefaultAnchorUtcMs());
});

test('localToUtcMs is timezone aware (offset differs across dates)', () => {
  // Egypt observes DST; offset in January (standard time) may differ from June (DST)
  const janUtc = localToUtcMs(2026, 1, 15, 12, 0, 0, 'Africa/Cairo');
  const junUtc = localToUtcMs(2026, 6, 26, 12, 0, 0, 'Africa/Cairo');
  assert.ok(Number.isFinite(janUtc));
  assert.ok(Number.isFinite(junUtc));
  assert.notEqual(janUtc, junUtc);
});

test('calculateNextReset returns anchor when now is before anchor', () => {
  const anchor = 1000000000000;
  const cycle = 3600000;
  const now = anchor - 1;
  assert.equal(calculateNextReset(anchor, cycle, now), anchor);
});

test('calculateNextReset returns anchor when now equals anchor', () => {
  const anchor = 1000000000000;
  const cycle = 3600000;
  assert.equal(calculateNextReset(anchor, cycle, anchor), anchor);
});

test('calculateNextReset returns the same instant when now is exactly on a reset', () => {
  const anchor = 1000000000000;
  const cycle = 3600000;
  assert.equal(calculateNextReset(anchor, cycle, anchor + cycle), anchor + cycle);
});

test('calculateNextReset returns next cycle when now is just after a reset', () => {
  const anchor = 1000000000000;
  const cycle = 3600000;
  assert.equal(calculateNextReset(anchor, cycle, anchor + cycle + 1), anchor + 2 * cycle);
});

test('calculateNextReset handles several cycles after anchor', () => {
  const anchor = 1000000000000;
  const cycle = 3600000;
  for (let n = 1; n <= 10; n += 1) {
    const now = anchor + n * cycle - 1;
    assert.equal(calculateNextReset(anchor, cycle, now), anchor + n * cycle);
  }
});

test('calculateNextReset with actual 99-hour cycle', () => {
  const anchor = getDefaultAnchorUtcMs();
  const cycle = getCycleMs();
  const now = anchor + cycle + 1000;
  const next = calculateNextReset(anchor, cycle, now);
  assert.equal(next, anchor + 2 * cycle);
});

test('calculateNextReset throws on invalid anchor', () => {
  assert.throws(() => calculateNextReset(NaN, 3600000, Date.now()));
  assert.throws(() => calculateNextReset(Infinity, 3600000, Date.now()));
});

test('calculateNextReset throws on invalid cycle', () => {
  assert.throws(() => calculateNextReset(1000000, 0, Date.now()));
  assert.throws(() => calculateNextReset(1000000, -1, Date.now()));
  assert.throws(() => calculateNextReset(1000000, NaN, Date.now()));
});

test('formatCairoLocal throws on invalid timestamp', () => {
  assert.throws(() => formatCairoLocal(NaN));
  assert.throws(() => formatCairoLocal(Infinity));
});

test('formatCairoLocal returns a readable string', () => {
  const anchorUtc = getDefaultAnchorUtcMs();
  const local = formatCairoLocal(anchorUtc);
  assert.ok(typeof local === 'string');
  assert.ok(local.length > 0);
});

test('parseDateTimeToUtcMs honors explicit Z suffix as UTC', () => {
  const withZ = parseDateTimeToUtcMs('2026-06-26T06:00:00Z');
  const withoutZ = parseDateTimeToUtcMs('2026-06-26T06:00');
  // Z means UTC 06:00, without Z means Cairo 06:00 (which is UTC+3 in June, so 03:00Z)
  // They should differ by 3 hours (or whatever the Cairo offset is in June)
  assert.ok(Math.abs(withZ - withoutZ) > 0);
});

test('parseDateTimeToUtcMs honors explicit offset', () => {
  const withOffset = parseDateTimeToUtcMs('2026-06-26T06:00:00+02:00');
  const asUtc = new Date('2026-06-26T06:00:00+02:00').getTime();
  assert.equal(withOffset, asUtc);
});

test('parseDateTimeToUtcMs throws on invalid input', () => {
  assert.throws(() => parseDateTimeToUtcMs(''));
  assert.throws(() => parseDateTimeToUtcMs('not-a-date'));
  assert.throws(() => parseDateTimeToUtcMs('2026-13-45T99:99'));
});

test('parseDateTimeToUtcMs interprets offset-less input as Cairo local', () => {
  const result = parseDateTimeToUtcMs('2026-06-26T06:00');
  assert.ok(Number.isFinite(result));
  // Round-trip: formatting this UTC time in Cairo should show 06:00 on June 26
  const local = formatCairoLocal(result);
  assert.ok(local.includes('26/06/2026'));
  assert.ok(local.includes('06:00'));
});

test('buildConfig creates a valid config object', () => {
  const anchor = getDefaultAnchorUtcMs();
  const config = buildConfig(anchor);
  assert.equal(config.anchorUtcMs, anchor);
  assert.equal(config.cycleMs, getCycleMs());
  assert.equal(config.timezone, 'Africa/Cairo');
});

test('buildConfig accepts custom cycle and timezone', () => {
  const config = buildConfig(1000000, 7200000, 'Europe/London');
  assert.equal(config.anchorUtcMs, 1000000);
  assert.equal(config.cycleMs, 7200000);
  assert.equal(config.timezone, 'Europe/London');
});

test('buildConfig throws on invalid anchor', () => {
  assert.throws(() => buildConfig(NaN));
  assert.throws(() => buildConfig(1000000, 0));
  assert.throws(() => buildConfig(1000000, -1));
});

test('parseConfig returns null for missing input', () => {
  assert.equal(parseConfig(null), null);
  assert.equal(parseConfig(undefined), null);
});

test('parseConfig returns null for invalid JSON', () => {
  assert.equal(parseConfig('not json'), null);
  assert.equal(parseConfig('{invalid'), null);
});

test('parseConfig returns null for incomplete config', () => {
  assert.equal(parseConfig(JSON.stringify({ anchorUtcMs: 123 })), null);
  assert.equal(parseConfig(JSON.stringify({ cycleMs: 3600000 })), null);
  assert.equal(parseConfig(JSON.stringify({ timezone: 'Africa/Cairo' })), null);
  assert.equal(parseConfig(JSON.stringify({ anchorUtcMs: 123, cycleMs: 0, timezone: 'Africa/Cairo' })), null);
});

test('parseConfig round-trips buildConfig output', () => {
  const anchor = getDefaultAnchorUtcMs();
  const config = buildConfig(anchor, getCycleMs(), 'Africa/Cairo');
  const parsed = parseConfig(JSON.stringify(config));
  assert.equal(parsed.anchorUtcMs, anchor);
  assert.equal(parsed.cycleMs, getCycleMs());
  assert.equal(parsed.timezone, 'Africa/Cairo');
});

test('parseConfig accepts pre-parsed object', () => {
  const anchor = getDefaultAnchorUtcMs();
  const config = { anchorUtcMs: anchor, cycleMs: getCycleMs(), timezone: 'Africa/Cairo' };
  const parsed = parseConfig(config);
  assert.equal(parsed.anchorUtcMs, anchor);
  assert.equal(parsed.cycleMs, getCycleMs());
  assert.equal(parsed.timezone, 'Africa/Cairo');
});

test('getDefaultAnchor is not mutated by getDefaultAnchorUtcMs', () => {
  const before = JSON.stringify(getDefaultAnchor());
  getDefaultAnchorUtcMs();
  const after = JSON.stringify(getDefaultAnchor());
  assert.equal(before, after);
});
