import { REGIONS, SKIES, STYLES, subjectsForRegion } from '../data/regions.js';
import { fmtTime, saudiDateString } from '../lib/sun.js';

/** A labelled group of toggle buttons. variant "cities" renders large text tabs. */
export function Choice({ label, options, value, onChange, variant = 'chips' }) {
  const cities = variant === 'cities';
  return (
    <div className="group">
      <div className="group-title" id={`g-${label.replace(/\W+/g, '-')}`}>
        {label}
      </div>
      <div className={cities ? 'cities' : 'chips'} role="group" aria-labelledby={`g-${label.replace(/\W+/g, '-')}`}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={cities ? 'city' : 'chip'}
            aria-pressed={o.id === value}
            onClick={() => onChange(o.id)}
            title={o.hint}
          >
            {o.label}
            {o.sub ? (
              <span className="ar" lang="ar" dir="rtl">
                {o.sub}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RegionTabs({ value, onChange, label = 'City' }) {
  return (
    <Choice
      variant="cities"
      label={label}
      value={value}
      onChange={onChange}
      options={REGIONS.map((r) => ({ id: r.id, label: r.name, sub: r.arabic }))}
    />
  );
}

export function SubjectChips({ regionId, value, onChange }) {
  return (
    <Choice
      label="What you are shooting"
      value={value}
      onChange={onChange}
      options={subjectsForRegion(regionId).map((s) => ({ id: s.id, label: s.label }))}
    />
  );
}

export function SkyChips({ value, onChange }) {
  return <Choice label="Sky" value={value} onChange={onChange} options={SKIES} />;
}

export function StyleChips({ value, onChange }) {
  return <Choice label="Look you want" value={value} onChange={onChange} options={STYLES} />;
}

export function WhenControls({ plan, patch, now }) {
  const toCustom = () => patch({ mode: 'custom', date: saudiDateString(now), time: fmtTime(now) });
  return (
    <div className="group">
      <div className="group-title" id="g-when">
        When
      </div>
      <div className="chips" role="group" aria-labelledby="g-when">
        <button type="button" className="chip" aria-pressed={plan.mode === 'now'} onClick={() => patch({ mode: 'now' })}>
          Now in Saudi Arabia
        </button>
        <button type="button" className="chip" aria-pressed={plan.mode === 'custom'} onClick={toCustom}>
          Pick a date and time
        </button>
      </div>
      {plan.mode === 'custom' ? (
        <div className="when-fields">
          <label className="field">
            <span>Date</span>
            <input type="date" value={plan.date} onChange={(e) => e.target.value && patch({ date: e.target.value })} />
          </label>
          <label className="field">
            <span>Time (Saudi time)</span>
            <input type="time" value={plan.time} onChange={(e) => e.target.value && patch({ time: e.target.value })} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
