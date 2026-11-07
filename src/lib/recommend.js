// Recommendation engine: scores every preset for a place, subject, light slot, sky and style.
// Pure and data-driven: it reads each preset's own tags, locations, notes and numeric settings.

import {
  REGION_BY_ID,
  SUBJECT_BY_ID,
  SLOT_BY_ID,
  SLOT_COLUMNS,
  TIME_AFFINITY,
  STYLES,
  subjectsForRegion,
} from '../data/regions.js';
import { rangeOf, fmtSigned } from './presetModel.js';

export const WEIGHTS = { time: 38, subject: 34, style: 14, conditions: 10, region: 4 };

// When the user names a look ("Punchy", "Soft"...), that choice matters more than the default 14%.
// The other weights shrink proportionally so the total stays 100.
const STYLE_SHARE = 26;
const FOCUSED_WEIGHTS = Object.fromEntries(
  Object.entries(WEIGHTS).map(([k, w]) => [k, k === 'style' ? STYLE_SHARE : (w * (100 - STYLE_SHARE)) / (100 - WEIGHTS.style)]),
);

const norm = (s) => String(s).toLowerCase().trim();
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const DAY_SLOTS = ['morning', 'midday', 'afternoon'];
const WARM_SLOTS = ['golden-am', 'golden-pm', 'sunset'];

export const shortName = (name) => name.replace(/^Fujifilm\s+/i, 'Fuji ').replace(/\s+—\s+/, ' · ');

/** Numeric traits derived from a preset's own settings and tags. */
export function features(p) {
  const s = p.settings;
  const L = s.light || {};
  const E = s.effects || {};
  const tags = p.tags.map(norm);
  const contrast = rangeOf(L.contrast)?.mid ?? 0;
  const f = {
    contrast,
    highlights: rangeOf(L.highlights)?.mid ?? 0,
    exposureMax: rangeOf(L.exposure)?.max ?? 0,
    dehaze: Number(E.dehaze) || 0,
    clarity: Number(E.clarity) || 0,
    temp: Number(s.color?.temp) || 0,
    lumNR: Number(s.detail?.luminanceNR) || 0,
    bw: s.treatment === 'bw' || tags.includes('black & white'),
    film: tags.includes('film simulation'),
  };
  f.hi = tags.includes('high contrast') || contrast >= 10;
  f.lo = tags.includes('low contrast') || contrast <= -10;
  f.soft = f.lo || tags.some((t) => ['pastel', 'matte', 'airy'].includes(t));
  return f;
}

function haystack(p) {
  const s = p.settings;
  return [
    p.name,
    p.reference,
    p.description,
    s.notes,
    s.toneCurve?.notes,
    ...(s.hsl || []).map((h) => h.note),
    ...p.tags.filter((t) => !t.includes('—')), // skip collection names
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function timeFit(p, slot) {
  let best = 0;
  let tag = null;
  for (const t of p.timeOfDay) {
    const v = TIME_AFFINITY[norm(t)]?.[slot] ?? 0;
    if (v > best) {
      best = v;
      tag = t;
    }
  }
  return { value: Math.max(best, 0.05), tag };
}

function subjectFit(p, subject, region) {
  const locs = p.locations.map(norm);
  const hit = (tokens) => tokens.filter((t) => locs.includes(norm(t)));
  const prim = hit(subject.primary);
  const sec = hit(subject.secondary);
  const hay = haystack(p);
  const kw = (subject.keywords || []).filter((k) => hay.includes(k));
  const base = prim.length ? 1 : sec.length ? 0.6 : 0.12;
  const boost = Math.min(0.4, kw.length * 0.25);
  return {
    value: Math.min(1, base + boost),
    prim,
    sec,
    kw,
    regionHit: locs.includes(norm(region.token)),
  };
}

function styleFit(f, style) {
  switch (style) {
    case 'punchy':
      return f.hi ? 1 : f.bw ? 0.3 : f.lo ? 0.15 : 0.4;
    case 'soft':
      return f.soft ? 1 : f.hi ? 0.15 : 0.4;
    case 'film':
      return f.film ? 1 : f.soft ? 0.6 : 0.2;
    case 'mono':
      return f.bw ? 1 : 0;
    default:
      return 0.5;
  }
}

function conditionFit(f, sky, slot) {
  if (sky === 'clear') {
    if (!DAY_SLOTS.includes(slot)) return 0.6;
    return clamp((-f.highlights - 45) / 40, 0, 1);
  }
  if (sky === 'hazy') {
    if (f.dehaze >= 10) return 1;
    if (f.dehaze > 0) return 0.8;
    return f.soft ? 0.65 : 0.4;
  }
  if (sky === 'overcast') {
    if (f.contrast > 0) return 1;
    return f.contrast > -20 ? 0.6 : 0.35;
  }
  return 0.5;
}

function adjustments(p, f, ctx) {
  const tips = [];
  const { slot, sky } = ctx;
  if (DAY_SLOTS.includes(slot) && sky === 'clear' && f.exposureMax > 0.05) {
    tips.push(
      `This preset adds up to ${fmtSigned(f.exposureMax, 2)} EV. Underexpose in camera (−0.3 to −0.7 EV) so white marble does not clip.`,
    );
  }
  if (sky === 'hazy' && f.dehaze <= 0) {
    tips.push(
      f.soft
        ? `Haze suits this look, so keep Dehaze at ${fmtSigned(f.dehaze)}.`
        : `Dehaze is ${fmtSigned(f.dehaze)} in the preset. Try +10 if distant ridgelines go milky.`,
    );
  }
  if (sky === 'overcast' && f.contrast <= -20) {
    tips.push(`Overcast light is already flat. Raise Contrast toward −10 so the frame keeps some depth.`);
  }
  if (WARM_SLOTS.includes(slot) && f.temp >= 8) {
    tips.push(`The light is already warm. Pull Temp back to about ${fmtSigned(f.temp - 4)} to avoid an orange cast.`);
  }
  if ((slot === 'night' || slot === 'blue-hour') && f.lumNR < 25) {
    tips.push('Add Luminance noise reduction around 30–35 for high-ISO night files.');
  }
  return tips;
}

/** Score one preset. ctx = { regionId, subjectId, slot, sky, style } */
export function scorePreset(p, ctx) {
  const region = REGION_BY_ID[ctx.regionId];
  const subject = SUBJECT_BY_ID[ctx.subjectId];
  const f = features(p);
  const time = timeFit(p, ctx.slot);
  const subj = subjectFit(p, subject, region);
  const style = styleFit(f, ctx.style);
  const cond = conditionFit(f, ctx.sky, ctx.slot);
  const parts = {
    time: time.value,
    subject: subj.value,
    style,
    conditions: cond,
    region: subj.regionHit ? 1 : 0.35,
  };
  const weights = ctx.style && ctx.style !== 'auto' ? FOCUSED_WEIGHTS : WEIGHTS;
  const raw = Object.entries(weights).reduce((sum, [k, w]) => sum + w * parts[k], 0);

  const slotLabel = SLOT_BY_ID[ctx.slot].label.toLowerCase();
  const styleLabel = (STYLES.find((s) => s.id === ctx.style)?.label || '').toLowerCase();
  const good = [];
  const watch = [];

  if (time.value >= 0.8) good.push(`Tagged for ${time.tag}, right on cue for ${slotLabel} light`);
  else if (time.tag && time.value >= 0.4)
    watch.push(`Tagged for ${time.tag}: usable at ${slotLabel}, but off its sweet spot`);
  else watch.push(`Not tagged for ${slotLabel} light, so expect to adjust exposure and white balance`);

  if (subj.prim.length) good.push(`Built for ${subj.prim[0]}: ${subject.label}`);
  else if (subj.sec.length) good.push(`Tagged ${subj.sec[0]}, a partial match for this subject`);
  if (subj.kw.length) good.push(`Its notes mention ${subj.kw.slice(0, 2).map((k) => `“${k}”`).join(' and ')}`);
  if (!subj.prim.length && !subj.sec.length && !subj.kw.length) watch.push('Not tagged for this kind of subject');

  if (ctx.style !== 'auto') {
    if (style >= 0.85) good.push(`Matches your ${styleLabel} preference`);
    else if (style <= 0.3) watch.push(`A different look from your ${styleLabel} preference`);
  }

  if (ctx.sky === 'clear' && DAY_SLOTS.includes(ctx.slot)) {
    if (cond >= 0.6) good.push(`Highlights ${fmtSigned(f.highlights)} protect bright marble in hard sun`);
    else if (cond <= 0.2) watch.push(`Highlights only ${fmtSigned(f.highlights)}, so hold about −0.5 EV in camera`);
  } else if (ctx.sky === 'hazy') {
    if (f.dehaze >= 10) good.push(`Dehaze ${fmtSigned(f.dehaze)} cuts through dust`);
    else if (f.dehaze <= 0 && f.soft) good.push(`Soft, matte rendering embraces haze (Dehaze ${fmtSigned(f.dehaze)})`);
  } else if (ctx.sky === 'overcast') {
    if (f.contrast > 0) good.push(`Contrast ${fmtSigned(f.contrast)} adds punch to flat light`);
    else if (f.contrast <= -20) watch.push(`Already very flat (Contrast ${fmtSigned(f.contrast)}), so overcast may look lifeless`);
  }

  return {
    preset: p,
    score: Math.round(raw),
    raw,
    parts,
    good,
    watch,
    tips: adjustments(p, f, ctx),
  };
}

/** Ranked list, best first. */
export function recommend(presets, ctx) {
  return presets
    .map((p) => scorePreset(p, ctx))
    .sort((a, b) => b.raw - a.raw || a.preset.name.localeCompare(b.preset.name));
}

/** Top picks for each slot run in a day plan. */
export function recommendForRuns(presets, ctx, runs, take = 2) {
  const cache = new Map();
  return runs.map((run) => {
    if (!cache.has(run.slot)) cache.set(run.slot, recommend(presets, { ...ctx, slot: run.slot }).slice(0, take));
    return { ...run, picks: cache.get(run.slot) };
  });
}

/** Cheat-sheet matrix for one region: subjects × slots → best result. */
export function matrix(presets, regionId, { sky = 'clear', style = 'auto' } = {}) {
  return subjectsForRegion(regionId).map((subject) => ({
    subject,
    cells: SLOT_COLUMNS.map((slot) => ({
      slot,
      best: recommend(presets, { regionId, subjectId: subject.id, slot, sky, style })[0],
    })),
  }));
}
