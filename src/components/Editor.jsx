import { useState } from 'react';
import Modal from './Modal.jsx';
import { TIME_TAGS } from '../data/regions.js';
import { resizeImage } from '../lib/files.js';
import { HSL_CHANNELS, PROFILES, blankPreset } from '../lib/presetModel.js';
import { BW, COLOR, CURVES, DETAIL, EFFECTS, GRAIN, LIGHT, ZONES, ZONE_FIELDS, fromForm, toForm } from '../lib/presetForm.js';

// Location tokens the recommender understands (see data/regions.js), plus the three cities.
const KNOWN_PLACES = ['Mecca', 'Medina', 'Jeddah', 'Haramain courtyards', 'Tawaf', 'Interiors', 'Night architecture', 'Architecture', 'Mount Uhud', 'Historical sites', 'Desert', 'Street'];

const KNOWN_TAGS = ['low contrast', 'high contrast', 'film simulation', 'pastel', 'matte', 'night', 'warm', 'black & white'];

const setIn = (o, path, val) => {
  if (!path.length) return val;
  const [k, ...rest] = path;
  return { ...o, [k]: setIn(o?.[k] ?? {}, rest, val) };
};

function Num({ label, value, onChange, wide }) {
  return (
    <label className={`field${wide ? ' grow' : ''}`}>
      <span>{label}</span>
      <input type="text" inputMode="text" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Picker({ label, options, value, onChange, allowCustom }) {
  const [custom, setCustom] = useState('');
  const all = [...options, ...value.filter((v) => !options.includes(v))];
  const toggle = (o) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  const add = () => {
    const t = custom.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setCustom('');
  };
  return (
    <div className="group">
      <div className="group-title">{label}</div>
      <div className="chips" role="group" aria-label={label}>
        {all.map((o) => (
          <button key={o} type="button" className="chip" aria-pressed={value.includes(o)} onClick={() => toggle(o)}>
            {o}
          </button>
        ))}
      </div>
      {allowCustom ? (
        <div className="inline-add">
          <input
            type="text"
            value={custom}
            placeholder="Add another"
            aria-label={`Add to ${label}`}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" className="btn small" onClick={add}>
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Block({ title, hint, open, children }) {
  return (
    <details className="block" open={open}>
      <summary>
        {title}
        {hint ? <span className="muted"> {hint}</span> : null}
      </summary>
      <div className="block-body">{children}</div>
    </details>
  );
}

export default function Editor({ preset, onClose, onSave }) {
  const isNew = !preset;
  const [f, setF] = useState(() => toForm(preset || blankPreset()));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (path, val) => setF((cur) => setIn(cur, path, val));

  const submit = (e) => {
    e.preventDefault();
    try {
      onSave(fromForm(f));
    } catch (err) {
      setError(err.message);
      document.getElementById('editor-error')?.scrollIntoView({ block: 'nearest' });
    }
  };

  async function addImages(files) {
    setBusy(true);
    setError('');
    try {
      const added = [];
      for (const file of files) added.push(await resizeImage(file));
      setF((cur) => ({ ...cur, images: [...cur.images, ...added] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      wide
      title={isNew ? 'New preset' : `Edit ${preset.name}`}
      subtitle="Leave a field empty to leave that setting out."
      onClose={onClose}
      footer={
        <div className="btn-row">
          <button type="submit" form="editor-form" className="btn primary" disabled={busy}>
            {isNew ? 'Add to library' : 'Save changes'}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      }
    >
      <form id="editor-form" className="editor" onSubmit={submit} noValidate>
        {error ? (
          <p id="editor-error" className="banner" role="alert">
            {error}
          </p>
        ) : null}

        <div className="form-grid">
          <label className="field grow">
            <span>Name</span>
            <input type="text" value={f.name} onChange={(e) => set(['name'], e.target.value)} required />
          </label>
          <label className="field grow">
            <span>Reference (film or look it imitates)</span>
            <input type="text" value={f.reference} onChange={(e) => set(['reference'], e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Description</span>
          <textarea rows={2} value={f.description} onChange={(e) => set(['description'], e.target.value)} />
        </label>

        <Picker label="Best light" options={TIME_TAGS} value={f.timeOfDay} onChange={(v) => set(['timeOfDay'], v)} />
        <Picker label="Places and subjects" options={KNOWN_PLACES} value={f.locations} onChange={(v) => set(['locations'], v)} allowCustom />

        <Picker label="Tags (select to remove)" options={KNOWN_TAGS} value={f.tags} onChange={(v) => set(['tags'], v)} allowCustom />
        <p className="muted small-text">“low contrast”, “high contrast” and “film simulation” steer which look the recommender thinks this is.</p>

        <div className="form-grid">
          <label className="field">
            <span>Profile</span>
            <select value={f.profile} onChange={(e) => set(['profile'], e.target.value)}>
              {[...new Set([...PROFILES, f.profile])].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Treatment</span>
            <select value={f.treatment} onChange={(e) => set(['treatment'], e.target.value)}>
              <option value="color">Color</option>
              <option value="bw">Black &amp; white</option>
            </select>
          </label>
        </div>

        <Block title="Light" open>
          <div className="num-grid">
            {LIGHT.map(([k, l]) => (
              <Num key={k} label={l} value={f.light[k]} onChange={(v) => set(['light', k], v)} />
            ))}
          </div>
          <p className="muted small-text">Exposure can be a range such as “-0.20 to -0.40”. A range is exported as its midpoint.</p>
        </Block>

        <Block title="Tone curve" hint="points as x, y from 0 to 255" open={CURVES.some(([k]) => f.curve[k])}>
          <div className="form-grid">
            {CURVES.map(([k, l]) => (
              <Num key={k} wide label={`${l} curve`} value={f.curve[k]} onChange={(v) => set(['curve', k], v)} />
            ))}
          </div>
          <Num wide label="Curve note" value={f.curveNote} onChange={(v) => set(['curveNote'], v)} />
          <p className="muted small-text">Example: “0, 22; 255, 235” lifts the blacks and softens the whites.</p>
        </Block>

        <Block title="Color" open>
          <div className="num-grid">
            {COLOR.map(([k, l]) => (
              <Num key={k} label={l} value={f.color[k]} onChange={(v) => set(['color', k], v)} />
            ))}
          </div>
        </Block>

        <Block title="Color mix (HSL)" open={HSL_CHANNELS.some((c) => f.hsl[c].hue || f.hsl[c].saturation || f.hsl[c].luminance)}>
          {HSL_CHANNELS.map((c) => (
            <div key={c} className="hsl-row">
              <strong>{c}</strong>
              <Num label="Hue" value={f.hsl[c].hue} onChange={(v) => set(['hsl', c, 'hue'], v)} />
              <Num label="Sat" value={f.hsl[c].saturation} onChange={(v) => set(['hsl', c, 'saturation'], v)} />
              <Num label="Lum" value={f.hsl[c].luminance} onChange={(v) => set(['hsl', c, 'luminance'], v)} />
              <Num wide label="Note" value={f.hsl[c].note} onChange={(v) => set(['hsl', c, 'note'], v)} />
            </div>
          ))}
        </Block>

        {f.treatment === 'bw' || BW.some((k) => f.bw[k]) ? (
          <Block title="Black & white mix" open>
            <div className="num-grid">
              {BW.map((k) => (
                <Num key={k} label={k[0].toUpperCase() + k.slice(1)} value={f.bw[k]} onChange={(v) => set(['bw', k], v)} />
              ))}
            </div>
          </Block>
        ) : null}

        <Block title="Color grading" open={ZONES.some(([z]) => ZONE_FIELDS.some(([k]) => f.grading[z][k]))}>
          {ZONES.map(([z, zl]) => (
            <div key={z} className="hsl-row grade-row">
              <strong>{zl}</strong>
              {ZONE_FIELDS.map(([k, l]) => (
                <Num key={k} label={l} value={f.grading[z][k]} onChange={(v) => set(['grading', z, k], v)} />
              ))}
            </div>
          ))}
          <div className="num-grid">
            <Num label="Blending" value={f.grading.blending} onChange={(v) => set(['grading', 'blending'], v)} />
            <Num label="Balance" value={f.grading.balance} onChange={(v) => set(['grading', 'balance'], v)} />
          </div>
        </Block>

        <Block title="Effects and detail" open={[...EFFECTS.map(([k]) => f.effects[k]), ...DETAIL.map(([k]) => f.detail[k])].some(Boolean)}>
          <div className="num-grid">
            {EFFECTS.map(([k, l]) => (
              <Num key={k} label={l} value={f.effects[k]} onChange={(v) => set(['effects', k], v)} />
            ))}
            {GRAIN.map(([k, l]) => (
              <Num key={k} label={`Grain ${l.toLowerCase()}`} value={f.grain[k]} onChange={(v) => set(['grain', k], v)} />
            ))}
            {DETAIL.map(([k, l]) => (
              <Num key={k} label={l} value={f.detail[k]} onChange={(v) => set(['detail', k], v)} />
            ))}
          </div>
        </Block>

        <label className="field">
          <span>Notes</span>
          <textarea rows={2} value={f.notes} onChange={(e) => set(['notes'], e.target.value)} />
        </label>

        <div className="group">
          <div className="group-title">Reference photos</div>
          <p className="muted small-text">Photos are shrunk and kept in this browser only. Add a few, not dozens.</p>
          {f.images.length ? (
            <ul className="thumbs">
              {f.images.map((src, i) => (
                <li key={i}>
                  <img src={src} alt={`Reference ${i + 1}`} />
                  <button type="button" className="btn small" onClick={() => set(['images'], f.images.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <label className="btn small file-btn">
            {busy ? 'Adding…' : 'Add photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addImages([...e.target.files]);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </form>
    </Modal>
  );
}
