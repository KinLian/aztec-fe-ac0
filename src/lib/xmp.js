// Export a preset as a Lightroom / Camera Raw .xmp preset (best-effort).
// Uses relative white balance (IncrementalTemperature / IncrementalTint) so it nudges,
// rather than overrides, the photo's own white balance.

import { rangeOf, slugify, HSL_CHANNELS } from './presetModel.js';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const sgn = (n, d = 0) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return undefined;
  const s = d ? x.toFixed(d) : String(Math.round(x));
  return x > 0 ? `+${s}` : s === '-0' ? '0' : s;
};

/** Deterministic UUID so re-exporting the same preset replaces it instead of duplicating it. */
export function stableUuid(seed) {
  const bases = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
  const parts = bases.map((b, k) => {
    let x = b >>> 0;
    for (let i = 0; i < seed.length; i++) {
      x ^= seed.charCodeAt(i) + k;
      x = Math.imul(x, 16777619) >>> 0;
    }
    return x.toString(16).padStart(8, '0');
  });
  const hex = parts.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`.toUpperCase();
}

export const xmpFileName = (p) => `${slugify(p.name)}.xmp`;

export function toXmp(p, group = 'Aztec · Mecca, Medina & Jeddah') {
  const s = p.settings;
  const L = s.light || {};
  const C = s.color || {};
  const E = s.effects || {};
  const D = s.detail || {};
  const G = s.colorGrading || {};
  const A = [];
  const add = (k, v) => {
    if (v !== undefined && v !== null && v !== '') A.push([k, String(v)]);
  };
  const num = (v, d = 0) => (v === undefined || v === null || v === '' ? undefined : sgn(v, d));

  // Light
  const ex = rangeOf(L.exposure);
  if (ex) add('Exposure2012', sgn(ex.mid, 2));
  add('Contrast2012', num(L.contrast));
  add('Highlights2012', num(L.highlights));
  add('Shadows2012', num(L.shadows));
  add('Whites2012', num(L.whites));
  add('Blacks2012', num(L.blacks));

  // Color (relative white balance)
  add('IncrementalTemperature', num(C.temp));
  add('IncrementalTint', num(C.tint));
  add('Vibrance', num(C.vibrance));
  add('Saturation', num(C.saturation));

  // Presence / effects
  add('Texture', num(E.texture));
  add('Clarity2012', num(E.clarity));
  add('Dehaze', num(E.dehaze));
  if (E.grain && typeof E.grain === 'object') {
    add('GrainAmount', E.grain.amount);
    add('GrainSize', E.grain.size);
    add('GrainFrequency', E.grain.roughness);
  }

  // Detail
  add('Sharpness', D.sharpening);
  add('SharpenEdgeMasking', D.masking);
  add('LuminanceSmoothing', D.luminanceNR);
  add('ColorNoiseReduction', D.colorNR);

  // Color mix
  for (const h of s.hsl || []) {
    const ch = HSL_CHANNELS.find((c) => c.toLowerCase() === String(h.channel).toLowerCase());
    if (!ch) continue;
    add(`HueAdjustment${ch}`, sgn(h.hue));
    add(`SaturationAdjustment${ch}`, sgn(h.saturation));
    add(`LuminanceAdjustment${ch}`, sgn(h.luminance));
  }

  // Color grading
  if (G.shadows) {
    add('SplitToningShadowHue', G.shadows.hue);
    add('SplitToningShadowSaturation', G.shadows.sat);
    add('ColorGradeShadowLum', num(G.shadows.lum));
  }
  if (G.highlights) {
    add('SplitToningHighlightHue', G.highlights.hue);
    add('SplitToningHighlightSaturation', G.highlights.sat);
    add('ColorGradeHighlightLum', num(G.highlights.lum));
  }
  if (G.midtones) {
    add('ColorGradeMidtoneHue', G.midtones.hue);
    add('ColorGradeMidtoneSat', G.midtones.sat);
    add('ColorGradeMidtoneLum', num(G.midtones.lum));
  }
  if (G.global) {
    add('ColorGradeGlobalHue', G.global.hue);
    add('ColorGradeGlobalSat', G.global.sat);
    add('ColorGradeGlobalLum', num(G.global.lum));
  }
  add('ColorGradeBlending', G.blending);
  add('SplitToningBalance', num(G.balance));

  // Black & white
  const bw = s.treatment === 'bw';
  if (bw) {
    add('ConvertToGrayscale', 'True');
    ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'].forEach((k) => {
      if (s.bwMix && s.bwMix[k] !== undefined) add(`GrayMixer${k[0].toUpperCase()}${k.slice(1)}`, sgn(s.bwMix[k]));
    });
  }
  add('CameraProfile', s.profile);

  // Tone curves (child sequences)
  const seqs = [];
  const tc = s.toneCurve || {};
  [['rgb', 'ToneCurvePV2012'], ['red', 'ToneCurvePV2012Red'], ['green', 'ToneCurvePV2012Green'], ['blue', 'ToneCurvePV2012Blue']].forEach(
    ([k, tag]) => {
      if (Array.isArray(tc[k]) && tc[k].length >= 2) {
        seqs.push(
          `   <crs:${tag}>\n    <rdf:Seq>\n${tc[k].map(([x, y]) => `     <rdf:li>${x}, ${y}</rdf:li>`).join('\n')}\n    </rdf:Seq>\n   </crs:${tag}>`,
        );
      }
    },
  );
  if (seqs.length) add('ToneCurveName2012', 'Custom');

  const head = [
    ['PresetType', 'Normal'],
    ['Cluster', ''],
    ['UUID', stableUuid(p.name)],
    ['SupportsAmount', 'True'],
    ['SupportsColor', 'True'],
    ['SupportsMonochrome', 'True'],
    ['SupportsHighDynamicRange', 'True'],
    ['SupportsNormalDynamicRange', 'True'],
    ['SupportsSceneReferred', 'True'],
    ['SupportsOutputReferred', 'True'],
    ['CameraModelRestriction', ''],
    ['Copyright', ''],
    ['ContactInfo', ''],
    ['Version', '15.0'],
    ['ProcessVersion', '11.0'],
    ['HasSettings', 'True'],
  ];

  const attrLines = [...head, ...A].map(([k, v]) => `   crs:${k}="${esc(v)}"`).join('\n');
  const alt = (tag, value) =>
    `   <crs:${tag}>\n    <rdf:Alt>\n     <rdf:li xml:lang="x-default">${esc(value)}</rdf:li>\n    </rdf:Alt>\n   </crs:${tag}>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
   xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
${attrLines}>
${alt('Name', p.name)}
${alt('ShortName', '')}
${alt('SortName', p.name)}
${alt('Group', group)}
${alt('Description', p.description || '')}${seqs.length ? '\n' + seqs.join('\n') : ''}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`;
}
