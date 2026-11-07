// Preset data model: normalising, formatting, import/export helpers.
// The stored shape matches the JSON files exactly (plus an internal `id`).

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => JSON.parse(JSON.stringify(v));
const str = (v) => (v == null ? '' : String(v).trim());
const strArr = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const objOrEmpty = (v) => (isObj(v) ? clone(v) : {});
const validIso = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const HSL_CHANNELS = ['Red', 'Orange', 'Yellow', 'Green', 'Aqua', 'Blue', 'Purple', 'Magenta'];
export const PROFILES = ['Adobe Color', 'Adobe Monochrome', 'Adobe Landscape', 'Adobe Neutral', 'Adobe Portrait', 'Adobe Standard', 'Adobe Vivid'];

/** A number, or a range string like "-0.20 to -0.40" → {min, max, mid}. */
export function rangeOf(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return { min: v, max: v, mid: v, isRange: false };
  if (typeof v !== 'string') return null;
  const nums = v.replace(/−/g, '-').match(/[-+]?\d*\.?\d+/g);
  if (!nums) return null;
  const vals = nums.map(Number);
  if (vals.length === 1) return { min: vals[0], max: vals[0], mid: vals[0], isRange: false };
  const min = Math.min(vals[0], vals[1]);
  const max = Math.max(vals[0], vals[1]);
  return { min, max, mid: Math.round(((min + max) / 2) * 20) / 20, isRange: true };
}

export function fmtSigned(n, decimals = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n);
  const s = decimals ? x.toFixed(decimals) : String(Math.round(x));
  return x > 0 ? `+${s}` : s === '-0' ? '0' : s;
}

export function slugify(s) {
  return (
    String(s)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'preset'
  );
}

export function uniqueId(base, taken) {
  const root = slugify(base);
  let id = root;
  let n = 2;
  while (taken.has(id)) id = `${root}-${n++}`;
  return id;
}

/** Validate and fill defaults. Throws on unusable input. */
export function normalizePreset(raw) {
  if (!isObj(raw)) throw new Error('Not a preset object');
  const name = str(raw.name);
  if (!name) throw new Error('Preset has no name');
  const s = isObj(raw.settings) ? raw.settings : {};
  const now = new Date().toISOString();
  return {
    name,
    reference: str(raw.reference),
    description: str(raw.description),
    timeOfDay: strArr(raw.timeOfDay),
    locations: strArr(raw.locations),
    tags: strArr(raw.tags),
    images: strArr(raw.images),
    settings: {
      profile: str(s.profile) || 'Adobe Color',
      treatment: s.treatment === 'bw' ? 'bw' : 'color',
      light: objOrEmpty(s.light),
      toneCurve: objOrEmpty(s.toneCurve),
      color: objOrEmpty(s.color),
      hsl: Array.isArray(s.hsl)
        ? s.hsl
            .filter((h) => isObj(h) && h.channel)
            .map((h) => ({
              channel: str(h.channel),
              hue: Number(h.hue) || 0,
              saturation: Number(h.saturation) || 0,
              luminance: Number(h.luminance) || 0,
              note: str(h.note),
            }))
        : [],
      bwMix: objOrEmpty(s.bwMix),
      colorGrading: objOrEmpty(s.colorGrading),
      effects: objOrEmpty(s.effects),
      detail: objOrEmpty(s.detail),
      notes: str(s.notes),
    },
    createdAt: validIso(raw.createdAt) || now,
    updatedAt: validIso(raw.updatedAt) || now,
  };
}

export function blankPreset() {
  return normalizePreset({
    name: 'New preset',
    timeOfDay: [],
    locations: [],
    tags: [],
    settings: { profile: 'Adobe Color', treatment: 'color' },
  });
}

/** Same JSON shape as the files you imported (no internal id). */
export function exportPreset(p) {
  const { id, ...rest } = p; // eslint-disable-line no-unused-vars
  return rest;
}

/** Content identity used to skip duplicate imports. */
export function fingerprint(p) {
  const { id, createdAt, updatedAt, ...rest } = p; // eslint-disable-line no-unused-vars
  return JSON.stringify(rest);
}

/** Accepts a single preset, an array of presets, or { presets: [...] }. */
export function parseImportText(text) {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  if (isObj(data) && Array.isArray(data.presets)) return data.presets;
  if (isObj(data) && data.name) return [data];
  throw new Error('No preset found in this file');
}

// ---------- display helpers shared by the UI, recipe text and XMP ----------

const LIGHT_KEYS = [
  ['exposure', 'Exposure'],
  ['contrast', 'Contrast'],
  ['highlights', 'Highlights'],
  ['shadows', 'Shadows'],
  ['whites', 'Whites'],
  ['blacks', 'Blacks'],
];

const has = (v) => v !== undefined && v !== null && v !== '';

function fmtValue(key, v) {
  if (key === 'exposure') {
    if (typeof v === 'number') return `${fmtSigned(v, 2)} EV`;
    return `${v} EV`;
  }
  return typeof v === 'number' ? fmtSigned(v) : String(v);
}

export const pointsText = (pts) => pts.map(([x, y]) => `(${x}, ${y})`).join(' → ');

/** Structured settings for display: [{id, title, rows: [[label, value]]}] (HSL rows excluded). */
export function settingsSections(p) {
  const s = p.settings;
  const out = [];
  const push = (id, title, rows) => rows.length && out.push({ id, title, rows });

  push(
    'light',
    'Light',
    LIGHT_KEYS.filter(([k]) => has(s.light[k])).map(([k, label]) => [label, fmtValue(k, s.light[k])]),
  );

  const curveRows = [];
  const tc = s.toneCurve;
  [['rgb', 'RGB curve'], ['red', 'Red curve'], ['green', 'Green curve'], ['blue', 'Blue curve']].forEach(([k, label]) => {
    if (Array.isArray(tc[k]) && tc[k].length) curveRows.push([label, pointsText(tc[k])]);
  });
  if (tc.notes) curveRows.push(['Note', tc.notes]);
  push('curve', 'Tone curve', curveRows);

  push(
    'color',
    'Color',
    [['temp', 'Temp'], ['tint', 'Tint'], ['vibrance', 'Vibrance'], ['saturation', 'Saturation']]
      .filter(([k]) => has(s.color[k]))
      .map(([k, label]) => [label, fmtSigned(s.color[k])]),
  );

  if (s.treatment === 'bw' || Object.keys(s.bwMix).length) {
    push(
      'bw',
      'B&W mix',
      ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta']
        .filter((k) => has(s.bwMix[k]))
        .map((k) => [k[0].toUpperCase() + k.slice(1), fmtSigned(s.bwMix[k])]),
    );
  }

  const gradeRows = [];
  const cg = s.colorGrading;
  [['shadows', 'Shadows'], ['midtones', 'Midtones'], ['highlights', 'Highlights'], ['global', 'Global']].forEach(([k, label]) => {
    const z = cg[k];
    if (!z) return;
    const bits = [];
    if (has(z.hue)) bits.push(`Hue ${z.hue}°`);
    if (has(z.sat)) bits.push(`Sat ${z.sat}%`);
    if (has(z.lum)) bits.push(`Lum ${fmtSigned(z.lum)}`);
    if (bits.length) gradeRows.push([label, bits.join(' · ')]);
  });
  if (has(cg.blending)) gradeRows.push(['Blending', String(cg.blending)]);
  if (has(cg.balance)) gradeRows.push(['Balance', fmtSigned(cg.balance)]);
  push('grading', 'Color grading', gradeRows);

  const fx = s.effects;
  const fxRows = [['texture', 'Texture'], ['clarity', 'Clarity'], ['dehaze', 'Dehaze']]
    .filter(([k]) => has(fx[k]))
    .map(([k, label]) => [label, fmtSigned(fx[k])]);
  if (isObj(fx.grain)) {
    const g = [];
    if (has(fx.grain.amount)) g.push(`Amount ${fx.grain.amount}`);
    if (has(fx.grain.size)) g.push(`Size ${fx.grain.size}`);
    if (has(fx.grain.roughness)) g.push(`Roughness ${fx.grain.roughness}`);
    if (g.length) fxRows.push(['Grain', g.join(' · ')]);
  }
  push('effects', 'Effects', fxRows);

  push(
    'detail',
    'Detail',
    [['sharpening', 'Sharpening'], ['masking', 'Masking'], ['luminanceNR', 'Luminance NR'], ['colorNR', 'Color NR']]
      .filter(([k]) => has(s.detail[k]))
      .map(([k, label]) => [label, String(s.detail[k])]),
  );

  return out;
}

/** Plain-text recipe for typing into Lightroom Mobile by hand. */
export function recipeText(p) {
  const s = p.settings;
  const L = [];
  L.push(p.reference ? `${p.name} (${p.reference})` : p.name);
  if (p.description) L.push(p.description);
  L.push(`Profile: ${s.profile} · ${s.treatment === 'bw' ? 'Black & white' : 'Color'}`);
  if (p.timeOfDay.length) L.push(`Best for: ${p.timeOfDay.join(', ')}`);
  if (p.locations.length) L.push(`Places: ${p.locations.join(', ')}`);

  const sections = settingsSections(p);
  for (const sec of sections) {
    L.push('', sec.title.toUpperCase());
    sec.rows.forEach(([label, value]) => L.push(`  ${label}: ${value}`));
    if (sec.id === 'color' && s.hsl.length) {
      L.push('', 'COLOR MIX (HSL)');
      s.hsl.forEach((h) =>
        L.push(
          `  ${h.channel}: Hue ${fmtSigned(h.hue)} | Sat ${fmtSigned(h.saturation)} | Lum ${fmtSigned(h.luminance)}${h.note ? `  (${h.note})` : ''}`,
        ),
      );
    }
  }
  if (s.hsl.length && !sections.some((x) => x.id === 'color')) {
    L.push('', 'COLOR MIX (HSL)');
    s.hsl.forEach((h) =>
      L.push(`  ${h.channel}: Hue ${fmtSigned(h.hue)} | Sat ${fmtSigned(h.saturation)} | Lum ${fmtSigned(h.luminance)}`),
    );
  }
  if (s.notes) L.push('', `Note: ${s.notes}`);
  return L.join('\n');
}
