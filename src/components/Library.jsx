import { useMemo, useRef, useState } from 'react';
import { downloadText } from '../lib/files.js';
import { exportPreset, parseImportText } from '../lib/presetModel.js';
import { features, shortName } from '../lib/recommend.js';
import { toneStrip } from '../lib/swatch.js';

const LOOKS = [
  { id: 'all', label: 'All looks', test: () => true },
  { id: 'hi', label: 'High contrast', test: (f) => f.hi && !f.bw },
  { id: 'lo', label: 'Low contrast & pastel', test: (f) => f.lo && !f.bw },
  { id: 'film', label: 'Film simulations', test: (f) => f.film },
  { id: 'bw', label: 'Black & white', test: (f) => f.bw },
];

const TIMES = [
  { id: 'all', label: 'Any light', test: () => true },
  { id: 'day', label: 'Daytime', test: (p) => p.timeOfDay.some((t) => /^(morning|midday|afternoon|any time)/i.test(t)) },
  { id: 'golden', label: 'Golden hour & sunset', test: (p) => p.timeOfDay.some((t) => /golden|sunrise|sunset/i.test(t)) },
  { id: 'night', label: 'Blue hour & night', test: (p) => p.timeOfDay.some((t) => /blue hour|night/i.test(t)) },
];

function matches(p, q) {
  if (!q) return true;
  const hay = [p.name, p.reference, p.description, ...p.tags, ...p.locations, ...p.timeOfDay].join(' ').toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export default function Library({ presets, store, onOpen, onNew, notify }) {
  const [q, setQ] = useState('');
  const [look, setLook] = useState('all');
  const [time, setTime] = useState('all');
  const [over, setOver] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef(null);

  const shown = useMemo(() => {
    const lk = LOOKS.find((l) => l.id === look);
    const tm = TIMES.find((t) => t.id === time);
    return presets.filter((p) => matches(p, q) && lk.test(features(p)) && tm.test(p));
  }, [presets, q, look, time]);

  async function importFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    const items = [];
    const problems = [];
    for (const f of files) {
      try {
        items.push(...parseImportText(await f.text()));
      } catch (e) {
        problems.push(`${f.name}: ${e instanceof SyntaxError ? 'not valid JSON' : e.message}`);
      }
    }
    const r = store.importMany(items);
    const bits = [];
    if (r.added) bits.push(`added ${r.added}`);
    if (r.skipped) bits.push(`skipped ${r.skipped} already in your library`);
    const failed = r.failed.length + problems.length;
    if (failed) bits.push(`${failed} could not be read (${[...problems, ...r.failed][0]})`);
    notify(bits.length ? `Import: ${bits.join(', ')}.` : 'Nothing to import in those files.');
  }

  function exportAll() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`aztec-presets-backup-${stamp}.json`, JSON.stringify({ version: 1, presets: presets.map(exportPreset) }, null, 2));
    notify(`Exported ${presets.length} presets. Import this file anywhere to restore them.`);
  }

  return (
    <div
      className={`library${over ? ' is-over' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        importFiles(e.dataTransfer.files);
      }}
    >
      <section className="panel lib-bar" aria-label="Library tools">
        <label className="field grow">
          <span>Search</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, place, tag, film…" />
        </label>
        <label className="field">
          <span>Look</span>
          <select value={look} onChange={(e) => setLook(e.target.value)}>
            {LOOKS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Light</span>
          <select value={time} onChange={(e) => setTime(e.target.value)}>
            {TIMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="btn-row lib-actions">
        <button type="button" className="btn primary" onClick={onNew}>
          New preset
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Import JSON files
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          multiple
          hidden
          onChange={(e) => {
            importFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button type="button" className="btn" onClick={exportAll} disabled={!presets.length}>
          Export backup
        </button>
        {confirmReset ? (
          <>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                store.resetDefaults();
                setConfirmReset(false);
                notify('Library reset to the 12 bundled presets.');
              }}
            >
              Yes, replace my library
            </button>
            <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={() => setConfirmReset(true)}>
            Reset to bundled presets
          </button>
        )}
      </div>
      {confirmReset ? <p className="muted small-text">This removes presets you added or edited. Export a backup first if you want to keep them.</p> : null}

      <p className="muted section-sub" aria-live="polite">
        {shown.length === presets.length ? `${presets.length} presets.` : `${shown.length} of ${presets.length} presets.`} Drop .json preset files anywhere on this page to import them.
      </p>

      {shown.length ? (
        <ul className="grid">
          {shown.map((p) => (
            <li key={p.id}>
              <button type="button" className="card" onClick={() => onOpen(p.id)}>
                <span className="card-strip" style={{ background: toneStrip(p, 10) }} aria-hidden="true" />
                <span className="card-body">
                  <strong className="card-name">{shortName(p.name)}</strong>
                  {p.reference ? <span className="muted small-text">{p.reference}</span> : null}
                  <span className="card-desc">{p.description}</span>
                  <span className="pills">
                    {p.timeOfDay.slice(0, 3).map((t) => (
                      <span key={t} className="pill">
                        {t}
                      </span>
                    ))}
                    {p.settings.treatment === 'bw' ? <span className="pill">B&amp;W</span> : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel empty">
          <h2>{presets.length ? 'No presets match' : 'Your library is empty'}</h2>
          <p className="muted">
            {presets.length ? 'Try a different search or filter.' : 'Import preset .json files, add a new one, or reset to the bundled presets.'}
          </p>
        </div>
      )}
    </div>
  );
}
