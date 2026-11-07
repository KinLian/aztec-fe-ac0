// Plain-Node checks for the pure logic (no React, no install needed).
// Run: node scripts/test-logic.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { sunTimes, solarPosition, classifySlot, dayRuns, fmtTime, fromSaudiLocal, saudiDayStart } from '../src/lib/sun.js';
import { normalizePreset, parseImportText, fingerprint, recipeText, settingsSections, rangeOf, exportPreset } from '../src/lib/presetModel.js';
import { toXmp, stableUuid } from '../src/lib/xmp.js';
import { toneStrip } from '../src/lib/swatch.js';
import { recommend, matrix, shortName } from '../src/lib/recommend.js';
import { REGIONS, SUBJECTS, SLOTS, SLOT_COLUMNS } from '../src/data/regions.js';

const here = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.log('  FAIL', msg);
  } else console.log('  ok  ', msg);
};
const within = (ms, hhmm, tolMin) => {
  const [h, m] = hhmm.split(':').map(Number);
  const [ah, am] = fmtTime(ms).split(':').map(Number);
  return Math.abs(ah * 60 + am - (h * 60 + m)) <= tolMin;
};

console.log('\n# Sun maths');
{
  // London, summer solstice 2024: sunrise 04:43 BST (03:43 UTC), sunset 21:21 BST (20:21 UTC)
  const t = sunTimes('2024-06-21', 51.5074, -0.1278);
  const utc = (d) => d.getUTCHours() * 60 + d.getUTCMinutes();
  ok(Math.abs(utc(t.sunrise) - (3 * 60 + 43)) <= 3, `London sunrise ${t.sunrise.toISOString()}`);
  ok(Math.abs(utc(t.sunset) - (20 * 60 + 21)) <= 3, `London sunset ${t.sunset.toISOString()}`);
}
for (const r of REGIONS) {
  const t = sunTimes('2026-11-07', r.lat, r.lon);
  console.log(`  ${r.name.padEnd(8)} sunrise ${fmtTime(t.sunrise)} noon ${fmtTime(t.solarNoon)} sunset ${fmtTime(t.sunset)} blue-end ${fmtTime(t.blueEnd)}`);
}
{
  const mecca = REGIONS[0];
  const t = sunTimes('2026-11-07', mecca.lat, mecca.lon);
  ok(within(t.solarNoon, '12:04', 4), 'Mecca solar noon about 12:04 on 7 Nov');
  const noon = solarPosition(t.solarNoon.getTime(), mecca.lat, mecca.lon);
  ok(noon.elevation > 49 && noon.elevation < 54, `Mecca noon elevation ${noon.elevation.toFixed(1)}°`);
  ok(classifySlot(-10, true) === 'night' && classifySlot(-6, false) === 'blue-hour' && classifySlot(60, false) === 'midday', 'slot classifier');
  const runs = dayRuns('2026-11-07', mecca.lat, mecca.lon);
  const order = runs.map((r) => r.slot).join(' > ');
  console.log('  runs:', order);
  ok(order === 'night > blue-hour > golden-am > morning > midday > afternoon > golden-pm > sunset > blue-hour > night', 'day runs follow the expected sequence');
  ok(runs[0].start === saudiDayStart('2026-11-07') && runs.at(-1).end === saudiDayStart('2026-11-07') + 86400000, 'runs cover the whole day');
  ok(fromSaudiLocal('2026-11-07', '12:00') === saudiDayStart('2026-11-07') + 12 * 3600000, 'Saudi local time conversion');
}

console.log('\n# Presets load and round-trip');
const dir = path.join(here, '../src/data/presets');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const presets = files.map((f) => ({ id: f.replace('.json', ''), ...normalizePreset(JSON.parse(readFileSync(path.join(dir, f), 'utf8'))) }));
ok(presets.length === 12, `12 seed presets (${presets.length})`);
ok(new Set(presets.map((p) => p.name)).size === 12, 'preset names are unique');
{
  const raw = JSON.parse(readFileSync(path.join(dir, 'haramain-marble-gold.json'), 'utf8'));
  const back = parseImportText(JSON.stringify(exportPreset(presets.find((p) => p.id === 'haramain-marble-gold'))))[0];
  ok(JSON.stringify(normalizePreset(back).settings) === JSON.stringify(normalizePreset(raw).settings), 'export → import keeps settings identical');
  ok(JSON.stringify(raw.settings.hsl) === JSON.stringify(normalizePreset(raw).settings.hsl) && raw.settings.light.contrast === 12, 'normalising does not alter the original values');
  ok(fingerprint(presets[0]) === fingerprint({ ...presets[0], id: 'x', updatedAt: 'z' }), 'fingerprint ignores id and timestamps');
  ok(rangeOf('-0.20 to -0.40').mid === -0.3 && rangeOf(0.15).mid === 0.15 && rangeOf('+0.15 to +0.30').max === 0.3, 'exposure range parsing');
  ok(parseImportText('{"presets":[{"name":"a"}]}').length === 1, 'import accepts {presets:[…]}');
  let threw = false;
  try { normalizePreset({ description: 'no name' }); } catch { threw = true; }
  ok(threw, 'rejects a preset with no name');
}
for (const p of presets) {
  const strip = toneStrip(p);
  const xmp = toXmp(p);
  const recipe = recipeText(p);
  if (!strip.startsWith('linear-gradient') || !xmp.includes('<crs:Name>') || recipe.length < 80 || settingsSections(p).length < 3) {
    ok(false, `output for ${p.name}`);
  }
}
ok(true, 'tone strip, XMP and recipe text generated for all presets');
{
  const marble = toXmp(presets.find((p) => p.id === 'haramain-marble-gold'));
  ok(marble.includes('crs:Exposure2012="-0.30"'), 'XMP uses midpoint of exposure range');
  ok(marble.includes('crs:HueAdjustmentYellow="-8"') && marble.includes('crs:SaturationAdjustmentYellow="+15"'), 'XMP HSL attributes');
  ok(marble.includes('<crs:ToneCurvePV2012>') && marble.includes('<rdf:li>255, 245</rdf:li>'), 'XMP tone curve');
  const acros = toXmp(presets.find((p) => p.id === 'fujifilm-acros-warm-monochrome'));
  ok(acros.includes('crs:ConvertToGrayscale="True"') && acros.includes('crs:GrayMixerBlue="-40"'), 'XMP black & white mix');
  const nost = toXmp(presets.find((p) => p.id === 'fujifilm-nostalgic-negative'));
  ok(nost.includes('<crs:ToneCurvePV2012Blue>'), 'XMP blue channel curve');
  ok(stableUuid('a') === stableUuid('a') && stableUuid('a') !== stableUuid('b'), 'stable UUID');
  ok(!/&(?!amp;|lt;|gt;|quot;)/.test(toXmp(presets.find((p) => p.id === 'haramain-marble-gold').constructor === Object ? { ...presets[0], name: 'A & B' } : presets[0]).replace(/<\?xml.*?\?>/, '')), 'XML escaping of &');
}

console.log('\n# Recommendations');
const top = (regionId, subjectId, slot, sky = 'clear', style = 'auto', n = 1) =>
  recommend(presets, { regionId, subjectId, slot, sky, style }).slice(0, n).map((r) => `${r.preset.name} (${r.score})`);
const topName = (...a) => recommend(presets, { regionId: a[0], subjectId: a[1], slot: a[2], sky: a[3] || 'clear', style: a[4] || 'auto' })[0].preset.name;

const cases = [
  ['mecca', 'mecca-haram', 'midday', 'clear', 'auto'],
  ['mecca', 'mecca-haram', 'morning', 'clear', 'auto'],
  ['mecca', 'mecca-tawaf', 'midday', 'clear', 'mono'],
  ['mecca', 'mecca-night', 'night', 'clear', 'auto'],
  ['mecca', 'mecca-night', 'blue-hour', 'clear', 'punchy'],
  ['madinah', 'madinah-nabawi', 'afternoon', 'clear', 'auto'],
  ['madinah', 'madinah-nabawi', 'golden-pm', 'clear', 'soft'],
  ['madinah', 'madinah-night', 'night', 'clear', 'soft'],
  ['madinah', 'madinah-night', 'blue-hour', 'clear', 'punchy'],
  ['madinah', 'madinah-uhud', 'morning', 'clear', 'punchy'],
  ['madinah', 'madinah-uhud', 'golden-pm', 'hazy', 'film'],
  ['madinah', 'madinah-historic', 'afternoon', 'clear', 'film'],
  ['jeddah', 'jeddah-balad', 'morning', 'clear', 'auto'],
  ['jeddah', 'jeddah-rahma', 'midday', 'clear', 'punchy'],
  ['jeddah', 'jeddah-coast', 'afternoon', 'hazy', 'soft'],
  ['jeddah', 'jeddah-night', 'night', 'clear', 'auto'],
];
for (const c of cases) console.log(`  ${c.join(' / ').padEnd(58)} → ${top(...c, 3).join(' | ')}`);

ok(topName('mecca', 'mecca-haram', 'midday', 'clear', 'auto') !== '', 'midday Haram returns a pick');
ok(topName('mecca', 'mecca-tawaf', 'midday', 'clear', 'mono') === 'Fujifilm Acros — Warm Monochrome', 'B&W style at Tawaf picks Acros');
ok(['Sacred Nocturne', 'Velvet Medina'].includes(topName('madinah', 'madinah-night', 'night')), 'Madinah night picks a night preset');
ok(topName('madinah', 'madinah-night', 'night', 'clear', 'punchy') === 'Sacred Nocturne', 'punchy night picks Sacred Nocturne');
ok(topName('madinah', 'madinah-night', 'night', 'clear', 'soft') === 'Velvet Medina', 'soft night picks Velvet Medina');
ok(topName('madinah', 'madinah-uhud', 'morning', 'clear', 'punchy') === 'Uhud Volcanic Earth', 'punchy morning at Uhud picks Uhud Volcanic Earth');
ok(topName('madinah', 'madinah-uhud', 'golden-pm', 'clear', 'film') === 'Fujifilm Nostalgic Negative' || topName('madinah', 'madinah-uhud', 'golden-pm', 'clear', 'film').startsWith('Fujifilm'), 'film look at Uhud golden hour picks a Fujifilm sim');
ok(topName('madinah', 'madinah-nabawi', 'afternoon', 'clear', 'film') !== '', 'Nabawi afternoon film');
ok(topName('jeddah', 'jeddah-balad', 'afternoon', 'clear', 'film') === 'Fujifilm Classic Negative — Desert Neg', 'Al-Balad documentary look picks Classic Negative');
ok(topName('madinah', 'madinah-uhud', 'midday', 'clear', 'punchy') === 'Uhud Volcanic Earth', 'explicit Punchy at midday Uhud does not return a flat grade');
ok(!/Eterna|Mirage|Ethereal/.test(topName('madinah', 'madinah-uhud', 'midday', 'clear', 'punchy')), 'punchy never picks a very flat preset');
// no night preset should win a midday pick, and no day preset should win night
const nightPick = recommend(presets, { regionId: 'mecca', subjectId: 'mecca-night', slot: 'night', sky: 'clear', style: 'auto' })[0].preset;
ok(nightPick.timeOfDay.some((t) => /night|blue/i.test(t)), `night pick is tagged for night (${nightPick.name})`);
for (const slot of ['morning', 'midday', 'afternoon']) {
  const pick = recommend(presets, { regionId: 'mecca', subjectId: 'mecca-haram', slot, sky: 'clear', style: 'auto' })[0].preset;
  ok(!pick.timeOfDay.every((t) => /night|blue hour/i.test(t)), `${slot} pick is not a night-only preset (${pick.name})`);
}

console.log('\n# Matrix covers every subject and slot');
for (const r of REGIONS) {
  const m = matrix(presets, r.id);
  ok(m.length >= 5 && m.every((row) => row.cells.length === SLOT_COLUMNS.length && row.cells.every((c) => c.best)), `${r.name}: ${m.length} subjects × ${SLOT_COLUMNS.length} slots`);
}
// distinct winners across the whole matrix, so we know the pack is actually being used
const winners = new Set();
for (const r of REGIONS) for (const row of matrix(presets, r.id)) for (const c of row.cells) winners.add(c.best.preset.name);
console.log(`  distinct presets that win at least one cell (clear / auto): ${winners.size} of ${presets.length}`);
console.log('  never win:', presets.filter((p) => !winners.has(p.name)).map((p) => shortName(p.name)).join(', ') || '(none)');
ok(SUBJECTS.every((s) => REGIONS.some((r) => r.id === s.region)), 'every subject belongs to a region');
ok(SLOTS.length === 8, '8 slots');

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
