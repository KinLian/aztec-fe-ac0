// Checks the editor form conversion. Run: node scripts/test-form.mjs
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePreset } from '../src/lib/presetModel.js';
import { toForm, fromForm } from '../src/lib/presetForm.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/data/presets');
let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('  FAIL', m); } else console.log('  ok  ', m); };

// Every bundled preset must survive form -> preset unchanged (settings and lists).
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const p = normalizePreset(JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
  const back = normalizePreset(fromForm(toForm(p)));
  const same = JSON.stringify(back.settings) === JSON.stringify(p.settings) && JSON.stringify([back.name, back.reference, back.description, back.timeOfDay, back.locations, back.tags]) === JSON.stringify([p.name, p.reference, p.description, p.timeOfDay, p.locations, p.tags]);
  ok(same, `round trip ${p.name}`);
  if (!same) { console.log(JSON.stringify(p.settings)); console.log(JSON.stringify(back.settings)); }
}

const base = toForm(normalizePreset({ name: 'X', settings: {} }));
const bad = (mut, re) => { try { fromForm(mut(structuredClone(base))); return false; } catch (e) { return re.test(e.message); } };
ok(bad((f) => { f.name = ' '; return f; }, /name/i), 'rejects empty name');
ok(bad((f) => { f.light.contrast = 'abc'; return f; }, /Contrast must be a number/), 'rejects non-numeric contrast');
ok(bad((f) => { f.light.exposure = 'lots'; return f; }, /Exposure/), 'rejects bad exposure');
ok(bad((f) => { f.curve.rgb = '0, 22'; return f; }, /at least two points/), 'rejects one-point curve');
ok(bad((f) => { f.curve.rgb = '0, 22; 300, 255'; return f; }, /between 0 and 255/), 'rejects out-of-range curve');
const f = structuredClone(base);
f.light.exposure = '-0.20 to -0.40'; f.light.contrast = '-15'; f.curve.rgb = '0, 22; 255, 235'; f.hsl.Blue.hue = '−5'; f.tags = ['a', 'b', 'a']; f.timeOfDay = ['Night'];
const out = fromForm(f);
ok(out.settings.light.exposure === '-0.20 to -0.40' && out.settings.light.contrast === -15, 'range exposure and numbers parsed');
ok(JSON.stringify(out.settings.toneCurve.rgb) === '[[0,22],[255,235]]', 'curve parsed');
ok(out.settings.hsl.length === 1 && out.settings.hsl[0].hue === -5, 'unicode minus accepted, empty HSL rows skipped');
ok(out.tags.join() === 'a,b', 'tags de-duplicated');
console.log(failed ? `\n${failed} FAILED` : '\nAll form checks passed');
process.exit(failed ? 1 : 0);
