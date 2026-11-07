const CHANNELS = [
  ['rgb', 'RGB', 'currentColor'],
  ['red', 'Red', '#d9534f'],
  ['green', 'Green', '#3f9d5b'],
  ['blue', 'Blue', '#4d8be0'],
];

function withEnds(points) {
  const pts = points.map(([x, y]) => [Number(x), Number(y)]).sort((a, b) => a[0] - b[0]);
  if (pts[0][0] > 0) pts.unshift([0, 0]);
  if (pts[pts.length - 1][0] < 255) pts.push([255, 255]);
  return pts;
}

// Catmull-Rom spline converted to cubic Béziers (y flipped for SVG).
function smoothPath(points) {
  const P = withEnds(points).map(([x, y]) => [x, 255 - y]);
  let d = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export default function ToneCurve({ curve }) {
  const drawn = CHANNELS.filter(([k]) => Array.isArray(curve[k]) && curve[k].length >= 2);
  if (!drawn.length) return null;
  return (
    <svg className="curve" viewBox="-6 -6 267 267" role="img" aria-label="Tone curve">
      <rect x="0" y="0" width="255" height="255" fill="none" stroke="var(--line)" />
      {[64, 128, 192].map((g) => (
        <g key={g} stroke="var(--line)" strokeWidth="1">
          <line x1={g} y1="0" x2={g} y2="255" />
          <line x1="0" y1={g} x2="255" y2={g} />
        </g>
      ))}
      <line x1="0" y1="255" x2="255" y2="0" stroke="var(--muted)" strokeDasharray="4 5" />
      {drawn.map(([k, , color]) => (
        <path key={k} d={smoothPath(curve[k])} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      ))}
      {drawn.map(([k, , color]) =>
        withEnds(curve[k]).map(([x, y], i) => <circle key={`${k}${i}`} cx={x} cy={255 - y} r="4.5" fill="var(--bg)" stroke={color} strokeWidth="2" />),
      )}
    </svg>
  );
}
