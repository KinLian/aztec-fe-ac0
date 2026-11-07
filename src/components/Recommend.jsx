import { useMemo, useState } from 'react';
import { REGION_BY_ID, SLOT_BY_ID, SUBJECT_BY_ID, ETIQUETTE, CAMERA_PREP, subjectsForRegion } from '../data/regions.js';
import { recommend, recommendForRuns, shortName } from '../lib/recommend.js';
import { dayRuns, fmtDuration, fmtTime, fromSaudiLocal, saudiDateString, saudiDayStart, slotAt, sunTimes } from '../lib/sun.js';
import { toneStrip } from '../lib/swatch.js';
import { useNow, useStored } from '../hooks/useStored.js';
import Actions from './Actions.jsx';
import DayRibbon from './DayRibbon.jsx';
import { RegionTabs, SkyChips, StyleChips, SubjectChips, WhenControls } from './Controls.jsx';

const DEFAULTS = { regionId: 'mecca', subjectId: 'mecca-haram', sky: 'clear', style: 'auto', mode: 'now', date: '', time: '' };

export default function Recommend({ presets, onOpen, notify }) {
  const [saved, setSaved] = useStored('nur-plan-v1', DEFAULTS);
  const [picked, setPicked] = useState(null);
  const now = useNow();

  // guard against a stale saved subject
  const region = REGION_BY_ID[saved.regionId] || REGION_BY_ID.mecca;
  const subject = SUBJECT_BY_ID[saved.subjectId]?.region === region.id ? SUBJECT_BY_ID[saved.subjectId] : subjectsForRegion(region.id)[0];
  const plan = { ...saved, regionId: region.id, subjectId: subject.id };

  const patch = (p) => {
    setPicked(null);
    setSaved((s) => ({ ...s, ...p }));
  };
  const setRegion = (id) => patch({ regionId: id, subjectId: subjectsForRegion(id)[0].id });

  const target = plan.mode === 'custom' && plan.date ? fromSaudiLocal(plan.date, plan.time || '12:00') : now;
  const dateStr = saudiDateString(target);
  const isToday = dateStr === saudiDateString(now);

  const calc = useMemo(() => {
    const times = sunTimes(dateStr, region.lat, region.lon);
    const runs = dayRuns(dateStr, region.lat, region.lon);
    return { times, runs };
  }, [dateStr, region]);

  const here = slotAt(target, region.lat, region.lon);
  const activeIndex = picked ?? Math.max(0, calc.runs.findIndex((r) => target >= r.start && target < r.end));
  const viewSlot = picked != null ? calc.runs[picked].slot : here.slot;
  const slot = SLOT_BY_ID[viewSlot];

  const ctx = { regionId: region.id, subjectId: subject.id, sky: plan.sky, style: plan.style };
  const ranked = useMemo(() => recommend(presets, { ...ctx, slot: viewSlot }), [presets, region.id, subject.id, plan.sky, plan.style, viewSlot]); // eslint-disable-line react-hooks/exhaustive-deps
  const dayPlan = useMemo(() => recommendForRuns(presets, ctx, calc.runs, 2), [presets, calc.runs, region.id, subject.id, plan.sky, plan.style]); // eslint-disable-line react-hooks/exhaustive-deps

  const best = ranked[0];
  const rest = ranked.slice(1, 4);
  const t = calc.times;
  const dayStart = saudiDayStart(dateStr);
  const whenLabel = plan.mode === 'now' ? 'right now' : `${plan.date} at ${plan.time}`;

  return (
    <div className="recommend">
      <section className="panel controls" aria-label="Shot details">
        <RegionTabs value={region.id} onChange={setRegion} />
        <p className="tagline">{region.tagline}</p>
        <SubjectChips regionId={region.id} value={subject.id} onChange={(id) => patch({ subjectId: id })} />
        <div className="control-row">
          <WhenControls plan={plan} patch={patch} now={now} />
          <SkyChips value={plan.sky} onChange={(v) => patch({ sky: v })} />
          <StyleChips value={plan.style} onChange={(v) => patch({ style: v })} />
        </div>
      </section>

      <section className="panel light" aria-label="Light in this city">
        <div className="light-head">
          <div>
            <h2>
              {slot.label} in {region.name}
            </h2>
            <p className="muted">
              {picked != null
                ? `Showing this part of the day. The sun is ${here.elevation.toFixed(0)}° above the horizon at ${plan.mode === 'now' ? 'the time you chose' : plan.time}.`
                : `Sun ${here.elevation >= 0 ? `${here.elevation.toFixed(0)}° above` : `${Math.abs(here.elevation).toFixed(0)}° below`} the horizon ${whenLabel}${isToday ? '' : ` (${dateStr})`}. ${slot.rule}.`}
            </p>
          </div>
          {picked != null ? (
            <button type="button" className="btn small" onClick={() => setPicked(null)}>
              Back to {plan.mode === 'now' ? 'now' : 'chosen time'}
            </button>
          ) : null}
        </div>

        <DayRibbon runs={calc.runs} dayStart={dayStart} markerMs={target} activeIndex={activeIndex} onPick={setPicked} />

        <dl className="suntimes">
          {[
            ['Sunrise', t.sunrise],
            ['Golden hour ends', t.goldenEnd],
            ['Solar noon', t.solarNoon],
            ['Golden hour starts', t.goldenPmStart],
            ['Sunset', t.sunset],
            ['Dark sky', t.blueEnd],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{fmtTime(v)}</dd>
            </div>
          ))}
        </dl>
        <p className="tip">{slot.tip}</p>
      </section>

      {best ? (
        <section className="hero" aria-label="Best preset">
          <div className="hero-strip" style={{ background: toneStrip(best.preset, 12) }} aria-hidden="true" />
          <div className="hero-main">
            <p className="muted small-text">Best match for {subject.label.toLowerCase()} in {slot.label.toLowerCase()} light</p>
            <h2 className="hero-name">{best.preset.name}</h2>
            {best.preset.reference ? <p className="muted">{best.preset.reference}</p> : null}
            <p className="hero-desc">{best.preset.description}</p>

            <div className="score" aria-label={`Match score ${best.score} out of 100`}>
              <div className="score-bar">
                <span style={{ width: `${best.score}%` }} />
              </div>
              <strong>{best.score}</strong>
              <span className="muted">out of 100</span>
            </div>

            <div className="why">
              {best.good.length ? (
                <div>
                  <h3>Why it fits</h3>
                  <ul>
                    {best.good.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {best.watch.length || best.tips.length ? (
                <div>
                  <h3>Watch for</h3>
                  <ul>
                    {[...best.watch, ...best.tips].map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="btn-row">
              <button type="button" className="btn primary" onClick={() => onOpen(best.preset.id)}>
                View settings
              </button>
              <Actions preset={best.preset} notify={notify} />
            </div>
          </div>
        </section>
      ) : (
        <section className="panel empty">
          <h2>No presets yet</h2>
          <p className="muted">Import preset files in the Library tab and the recommendations will appear here.</p>
        </section>
      )}

      {rest.length ? (
        <section aria-label="Other options">
          <h2 className="section-title">Other options</h2>
          <ol className="runners">
            {rest.map((r) => (
              <li key={r.preset.id}>
                <button type="button" className="runner" onClick={() => onOpen(r.preset.id)}>
                  <span className="runner-strip" style={{ background: toneStrip(r.preset, 7) }} aria-hidden="true" />
                  <span className="runner-text">
                    <strong>{r.preset.name}</strong>
                    <span className="muted">{r.good[0] || r.watch[0]}</span>
                  </span>
                  <span className="runner-score">{r.score}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-label="Plan the whole day">
        <h2 className="section-title">Plan the whole day{isToday ? '' : ` for ${dateStr}`}</h2>
        <p className="muted section-sub">
          The same shot ({subject.label.toLowerCase()}) through the light of the day. Times are Saudi time.
        </p>
        <ol className="dayplan">
          {dayPlan.map((run, i) => {
            const sl = SLOT_BY_ID[run.slot];
            return (
              <li key={i} className={i === activeIndex ? 'is-active' : ''}>
                <span className="dp-swatch" style={{ background: sl.color }} aria-hidden="true" />
                <div className="dp-when">
                  <strong>{sl.label}</strong>
                  <span className="muted">
                    {fmtTime(run.start)} to {fmtTime(run.end === dayStart + 86400000 ? run.end - 60000 : run.end)}
                    {' '}({fmtDuration(run.end - run.start)})
                  </span>
                </div>
                <div className="dp-picks">
                  {run.picks.map((p, k) => (
                    <button key={p.preset.id} type="button" className={`pick${k === 0 ? ' first' : ''}`} onClick={() => onOpen(p.preset.id)}>
                      {shortName(p.preset.name)} <span className="muted">{p.score}</span>
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="panel notes" aria-label="Shooting notes">
        <div>
          <h2 className="section-title">Shooting {region.name}</h2>
          <ul>
            {region.character.map((c) => (
              <li key={c}>{c}</li>
            ))}
            <li>{subject.tip}</li>
          </ul>
          {region.note ? <p className="muted">{region.note}</p> : null}
        </div>
        <div>
          <h2 className="section-title">Before you shoot</h2>
          <ul>
            <li>{CAMERA_PREP}</li>
            {ETIQUETTE.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
