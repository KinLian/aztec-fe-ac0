// A small "tone & tint" strip derived from a preset's curve, color grading and white balance.
// It is a visual hint of how lifted/matte and how warm/cool the look is, not a render.

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

function hslToRgb(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
  };
  return [f(0), f(8), f(4)];
}

function curveFn(points) {
  let pts = Array.isArray(points) && points.length >= 2 ? points.map(([x, y]) => [Number(x), Number(y)]) : [];
  pts.sort((a, b) => a[0] - b[0]);
  if (!pts.length || pts[0][0] > 0) pts.unshift([0, 0]);
  if (pts[pts.length - 1][0] < 255) pts.push([255, 255]);
  return (x) => {
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
    }
    return pts[pts.length - 1][1];
  };
}

export function toneStrip(preset, stops = 9) {
  const s = preset.settings;
  const curve = curveFn(s.toneCurve && s.toneCurve.rgb);
  const cg = s.colorGrading || {};
  const warm = ((Number(s.color && s.color.temp) || 0) / 100) * 0.25;
  const out = [];
  for (let i = 0; i < stops; i++) {
    const t = i / (stops - 1);
    const y = curve(t * 255) / 255;
    let [r, g, b] = [y, y, y];
    r += warm;
    b -= warm;
    const wSh = (1 - t) ** 2;
    const wHi = t ** 2;
    const wMid = Math.max(0, 1 - wSh - wHi);
    const tint = (z, w) => {
      if (!z || !z.sat) return;
      const [tr, tg, tb] = hslToRgb(Number(z.hue) || 0, 100, 50);
      const k = (Number(z.sat) / 100) * 2.2 * w;
      r += (tr / 255 - 0.5) * k;
      g += (tg / 255 - 0.5) * k;
      b += (tb / 255 - 0.5) * k;
    };
    tint(cg.shadows, wSh);
    tint(cg.midtones, wMid);
    tint(cg.highlights, wHi);
    tint(cg.global, 1);
    const c = [r, g, b].map((v) => Math.round(clamp(v) * 255));
    out.push(`rgb(${c[0]}, ${c[1]}, ${c[2]}) ${Math.round(t * 100)}%`);
  }
  return `linear-gradient(90deg, ${out.join(', ')})`;
}
