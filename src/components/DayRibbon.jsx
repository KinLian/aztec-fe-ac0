import { SLOT_BY_ID } from '../data/regions.js';
import { fmtTime } from '../lib/sun.js';

const DAY = 86400000;
const TICKS = [0, 6, 12, 18];

/** The whole day as coloured light slots. Optional marker and clickable segments. */
export default function DayRibbon({ runs, dayStart, markerMs, activeIndex, onPick }) {
  const markerPct = markerMs != null ? ((markerMs - dayStart) / DAY) * 100 : null;
  return (
    <div className="ribbon">
      <div className="ribbon-track" role="group" aria-label="Light through the day, midnight to midnight">
        {runs.map((r, i) => {
          const slot = SLOT_BY_ID[r.slot];
          const pct = ((r.end - r.start) / DAY) * 100;
          const text = `${slot.label}, ${fmtTime(r.start)} to ${fmtTime(r.end)}`;
          const style = { width: `${pct}%`, background: slot.color, color: slot.ink };
          const cls = `ribbon-seg${i === activeIndex ? ' is-active' : ''}`;
          const label = pct >= 11 ? slot.label : null;
          return onPick ? (
            <button key={i} type="button" className={cls} style={style} title={text} aria-label={text} aria-pressed={i === activeIndex} onClick={() => onPick(i)}>
              {label}
            </button>
          ) : (
            <div key={i} className={cls} style={style} title={text} role="img" aria-label={text}>
              {label}
            </div>
          );
        })}
        {markerPct != null && markerPct >= 0 && markerPct <= 100 ? (
          <span className="ribbon-marker" style={{ left: `${markerPct}%` }} aria-hidden="true" />
        ) : null}
      </div>
      <div className="ribbon-ticks" aria-hidden="true">
        {TICKS.map((h) => (
          <span key={h} style={{ left: `${(h / 24) * 100}%` }}>
            {String(h).padStart(2, '0')}:00
          </span>
        ))}
      </div>
    </div>
  );
}
