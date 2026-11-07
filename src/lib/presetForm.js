// Editor form <-> preset conversion. The form keeps every number as the text the user typed,
// so partial input such as "-" never gets mangled. Pure functions: testable in Node.

import { HSL_CHANNELS, rangeOf } from './presetModel.js';

export const LIGHT = [['exposure', 'Exposure (EV)'], ['contrast', 'Contrast'], ['highlights', 'Highlights'], ['shadows', 'Shadows'], ['whites', 'Whites'], ['blacks', 'Blacks']];
export const COLOR = [['temp', 'Temp'], ['tint', 'Tint'], ['vibrance', 'Vibrance'], ['saturation', 'Saturation']];
export const EFFECTS = [['texture', 'Texture'], ['clarity', 'Clarity'], ['dehaze', 'Dehaze']];
export const GRAIN = [['amount', 'Amount'], ['size', 'Size'], ['roughness', 'Roughness']];
export const DETAIL = [['sharpening', 'Sharpening'], ['masking', 'Masking'], ['luminanceNR', 'Luminance NR'], ['colorNR', 'Color NR']];
export const ZONES = [['shadows', 'Shadows'], ['midtones', 'Midtones'], ['highlights', 'Highlights'], ['global', 'Global']];
export const ZONE_FIELDS = [['hue', 'Hue °'], ['sat', 'Sat %'], ['lum', 'Lum']];
export const BW = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
export const CURVES = [['rgb', 'RGB'], ['red', 'Red'], ['green', 'Green'], ['blue', 'Blue']];

const txt = (v) => (v === undefined || v === null ? '' : String(v));
const fields = (obj, list) => Object.fromEntries(list.map(([k]) => [k, txt(obj?.[k])]));

export function toForm(p) {
  const s = p.settings;
  return {
    name: p.name,
    reference: p.reference,
    description: p.description,
    timeOfDay: [...p.timeOfDay],
    locations: [...p.locations],
    tags: [...p.tags],
    images: [...p.images],
    profile: s.profile,
    treatment: s.treatment,
    light: fields(s.light, LIGHT),
    color: fields(s.color, COLOR),
    effects: fields(s.effects, EFFECTS),
    grain: fields(s.effects?.grain, GRAIN),
    detail: fields(s.detail, DETAIL),
    grading: {
      ...Object.fromEntries(ZONES.map(([z]) => [z, fields(s.colorGrading?.[z], ZONE_FIELDS)])),
      blending: txt(s.colorGrading?.blending),
      balance: txt(s.colorGrading?.balance),
    },
    bw: Object.fromEntries(BW.map((k) => [k, txt(s.bwMix?.[k])])),
    hsl: Object.fromEntries(
      HSL_CHANNELS.map((c) => {
        const h = s.hsl.find((x) => x.channel.toLowerCase() === c.toLowerCase());
        return [c, { hue: h ? txt(h.hue) : '', saturation: h ? txt(h.saturation) : '', luminance: h ? txt(h.luminance) : '', note: h?.note || '' }];
      }),
    ),
    curve: Object.fromEntries(CURVES.map(([k]) => [k, (s.toneCurve?.[k] || []).map((pt) => pt.join(', ')).join('; ')])),
    curveNote: s.toneCurve?.notes || '',
    notes: s.notes,
  };
}

const fail = (msg) => {
  throw new Error(msg);
};

function num(raw, label) {
  const t = txt(raw).trim().replace(/−/g, '-');
  if (t === '') return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) fail(`${label} must be a number (you typed “${t}”).`);
  return n;
}

function group(obj, list, label) {
  const out = {};
  for (const [k, l] of list) {
    const n = num(obj[k], `${label} ${l}`);
    if (n !== undefined) out[k] = n;
  }
  return out;
}

/** Exposure may be a single number or a range such as "-0.20 to -0.40". */
function exposure(raw) {
  const t = txt(raw).trim().replace(/−/g, '-');
  if (!t) return undefined;
  if (Number.isFinite(Number(t))) return Number(t);
  if (rangeOf(t)) return t;
  return fail(`Exposure must be a number or a range like “-0.20 to -0.40” (you typed “${t}”).`);
}

export function parsePoints(raw, label) {
  const t = txt(raw).trim();
  if (!t) return undefined;
  const n = t.match(/-?\d+(?:\.\d+)?/g) || [];
  if (n.length < 4 || n.length % 2) fail(`${label} curve needs at least two points written like “0, 22; 255, 235”.`);
  const pts = [];
  for (let i = 0; i < n.length; i += 2) {
    const x = Number(n[i]);
    const y = Number(n[i + 1]);
    if (x < 0 || x > 255 || y < 0 || y > 255) fail(`${label} curve values must be between 0 and 255.`);
    pts.push([x, y]);
  }
  return pts;
}

const list = (v) => [...new Set(v.map((s) => s.trim()).filter(Boolean))];

/** Returns a raw preset object (same shape as the JSON files). Throws Error with a readable message. */
export function fromForm(f) {
  if (!f.name.trim()) fail('Give the preset a name.');

  const light = group(f.light, LIGHT.slice(1), 'Light');
  const ex = exposure(f.light.exposure);
  const lightOut = ex === undefined ? light : { exposure: ex, ...light };

  const effects = group(f.effects, EFFECTS, 'Effects');
  const grain = group(f.grain, GRAIN, 'Grain');
  if (Object.keys(grain).length) effects.grain = grain;

  const colorGrading = {};
  for (const [z, label] of ZONES) {
    const zone = group(f.grading[z], ZONE_FIELDS, `${label}`);
    if (Object.keys(zone).length) colorGrading[z] = zone;
  }
  const blending = num(f.grading.blending, 'Blending');
  const balance = num(f.grading.balance, 'Balance');
  if (blending !== undefined) colorGrading.blending = blending;
  if (balance !== undefined) colorGrading.balance = balance;

  const bwMix = {};
  for (const k of BW) {
    const n = num(f.bw[k], `B&W ${k}`);
    if (n !== undefined) bwMix[k] = n;
  }

  const hsl = [];
  for (const c of HSL_CHANNELS) {
    const r = f.hsl[c];
    const [hue, saturation, luminance] = [num(r.hue, `${c} hue`), num(r.saturation, `${c} saturation`), num(r.luminance, `${c} luminance`)];
    if (hue === undefined && saturation === undefined && luminance === undefined && !r.note.trim()) continue;
    hsl.push({ channel: c, hue: hue ?? 0, saturation: saturation ?? 0, luminance: luminance ?? 0, note: r.note.trim() });
  }

  const toneCurve = {};
  for (const [k, label] of CURVES) {
    const pts = parsePoints(f.curve[k], label);
    if (pts) toneCurve[k] = pts;
  }
  if (f.curveNote.trim()) toneCurve.notes = f.curveNote.trim();

  return {
    name: f.name.trim(),
    reference: f.reference.trim(),
    description: f.description.trim(),
    timeOfDay: list(f.timeOfDay),
    locations: list(f.locations),
    tags: list(f.tags),
    images: f.images,
    settings: {
      profile: f.profile,
      treatment: f.treatment,
      light: lightOut,
      toneCurve,
      color: group(f.color, COLOR, 'Color'),
      hsl,
      ...(f.treatment === 'bw' || Object.keys(bwMix).length ? { bwMix } : {}),
      colorGrading,
      effects,
      detail: group(f.detail, DETAIL, 'Detail'),
      notes: f.notes.trim(),
    },
  };
}
