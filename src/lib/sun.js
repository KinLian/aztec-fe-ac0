// Offline solar maths (NOAA low-precision algorithm, good to about a minute).
// Everything here is pure so it can be unit-tested in Node.

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export const SAUDI_TZ = 'Asia/Riyadh'; // UTC+3 all year, no DST
export const SAUDI_OFFSET_MIN = 180;

// Sun-elevation thresholds (degrees) that define the shooting slots.
export const ELEV = { night: -8, blue: -4, golden: 6, sunsetTop: 2, high: 45 };

const mod = (n, m) => ((n % m) + m) % m;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function solarParams(ms) {
  const jd = ms / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = mod(280.46646 + T * (36000.76983 + T * 0.0003032), 360);
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const Mr = M * RAD;
  const C =
    Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mr) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) * DEG;
  const y = Math.tan((eps * RAD) / 2) ** 2;
  const L0r = L0 * RAD;
  const eqTime =
    4 *
    DEG *
    (y * Math.sin(2 * L0r) -
      2 * e * Math.sin(Mr) +
      4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) -
      0.5 * y * y * Math.sin(4 * L0r) -
      1.25 * e * e * Math.sin(2 * Mr));
  return { decl, eqTime };
}

/** Sun elevation (degrees, no refraction) and whether it is past solar noon. */
export function solarPosition(ms, lat, lon) {
  const { decl, eqTime } = solarParams(ms);
  const d = new Date(ms);
  const minutesUTC =
    d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + d.getUTCMilliseconds() / 60000;
  const tst = mod(minutesUTC + eqTime + 4 * lon, 1440); // true solar time, minutes
  const hourAngle = tst / 4 - 180; // degrees, negative in the morning
  const latR = lat * RAD;
  const decR = decl * RAD;
  const cosZ = Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(hourAngle * RAD);
  const elevation = 90 - Math.acos(clamp(cosZ, -1, 1)) * DEG;
  return { elevation, afterNoon: hourAngle > 0 };
}

/** Which shooting slot is the light in? */
export function classifySlot(elevation, afterNoon) {
  if (elevation < ELEV.night) return 'night';
  if (elevation < ELEV.blue) return 'blue-hour';
  if (!afterNoon) {
    if (elevation < ELEV.golden) return 'golden-am';
    if (elevation < ELEV.high) return 'morning';
    return 'midday';
  }
  if (elevation >= ELEV.high) return 'midday';
  if (elevation >= ELEV.golden) return 'afternoon';
  if (elevation >= ELEV.sunsetTop) return 'golden-pm';
  return 'sunset';
}

export function slotAt(ms, lat, lon) {
  const { elevation, afterNoon } = solarPosition(ms, lat, lon);
  return { slot: classifySlot(elevation, afterNoon), elevation, afterNoon };
}

function eventTime(dayStartUtc, lat, lon, elev, part) {
  // declination and equation of time are taken near local solar noon
  const { decl, eqTime } = solarParams(dayStartUtc + (720 - 4 * lon) * 60000);
  const noonMin = 720 - 4 * lon - eqTime;
  if (part === 'noon') return new Date(dayStartUtc + noonMin * 60000);
  const cosH =
    (Math.sin(elev * RAD) - Math.sin(lat * RAD) * Math.sin(decl * RAD)) /
    (Math.cos(lat * RAD) * Math.cos(decl * RAD));
  if (cosH > 1 || cosH < -1) return null;
  const H = Math.acos(cosH) * DEG;
  const min = part === 'am' ? noonMin - 4 * H : noonMin + 4 * H;
  return new Date(dayStartUtc + min * 60000);
}

/** Key light events for a Saudi-local calendar date ("YYYY-MM-DD"). Values are Date objects. */
export function sunTimes(dateStr, lat, lon) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const day0 = Date.UTC(y, m - 1, d);
  const at = (e, p) => eventTime(day0, lat, lon, e, p);
  return {
    blueStart: at(ELEV.night, 'am'),
    goldenStart: at(ELEV.blue, 'am'),
    sunrise: at(-0.833, 'am'),
    goldenEnd: at(ELEV.golden, 'am'),
    solarNoon: at(0, 'noon'),
    goldenPmStart: at(ELEV.golden, 'pm'),
    sunset: at(-0.833, 'pm'),
    goldenPmEnd: at(ELEV.blue, 'pm'),
    blueEnd: at(ELEV.night, 'pm'),
  };
}

/** Local (Saudi) midnight at the start of the given date, in epoch ms. */
export function saudiDayStart(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d) - SAUDI_OFFSET_MIN * 60000;
}

/** Contiguous slot runs across a Saudi-local day, sampled every `stepMin` minutes. */
export function dayRuns(dateStr, lat, lon, stepMin = 5) {
  const start = saudiDayStart(dateStr);
  const end = start + 24 * 3600000;
  const runs = [];
  for (let t = start; t < end; t += stepMin * 60000) {
    const { slot, afterNoon } = slotAt(t + (stepMin * 30000), lat, lon);
    const last = runs[runs.length - 1];
    if (last && last.slot === slot) last.end = t + stepMin * 60000;
    else runs.push({ slot, start: t, end: t + stepMin * 60000, afterNoon });
  }
  runs[runs.length - 1].end = end;
  return runs;
}

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: SAUDI_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAUDI_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "HH:MM" in Saudi time. */
export function fmtTime(msOrDate) {
  if (!msOrDate) return '—';
  return timeFmt.format(msOrDate);
}

/** "YYYY-MM-DD" in Saudi time. */
export function saudiDateString(msOrDate = Date.now()) {
  return dateFmt.format(msOrDate);
}

/** Epoch ms for a Saudi-local date + "HH:MM". */
export function fromSaudiLocal(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - SAUDI_OFFSET_MIN * 60000;
}

export function fmtDuration(ms) {
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
