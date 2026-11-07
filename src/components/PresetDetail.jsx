import { useState } from 'react';
import Modal from './Modal.jsx';
import Actions from './Actions.jsx';
import ToneCurve from './ToneCurve.jsx';
import { fmtSigned, settingsSections } from '../lib/presetModel.js';
import { toneStrip } from '../lib/swatch.js';

const HSL_COLORS = {
  red: '#e05a4f',
  orange: '#e8913a',
  yellow: '#e6c43a',
  green: '#54b36a',
  aqua: '#3ec1c9',
  blue: '#4d86e0',
  purple: '#9a6ad8',
  magenta: '#d65fa5',
};

export default function PresetDetail({ preset: p, onClose, onEdit, onDuplicate, onDelete, notify }) {
  const [confirm, setConfirm] = useState(false);
  const sections = settingsSections(p);
  const hasCurve = ['rgb', 'red', 'green', 'blue'].some((k) => Array.isArray(p.settings.toneCurve[k]) && p.settings.toneCurve[k].length >= 2);

  return (
    <Modal
      wide
      title={p.name}
      subtitle={p.reference || undefined}
      onClose={onClose}
      footer={
        <>
          <div className="btn-row">
            <Actions preset={p} notify={notify} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn" onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="btn" onClick={onDuplicate}>
              Duplicate
            </button>
            {confirm ? (
              <>
                <button type="button" className="btn danger" onClick={onDelete}>
                  Delete for good
                </button>
                <button type="button" className="btn" onClick={() => setConfirm(false)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" className="btn" onClick={() => setConfirm(true)}>
                Delete
              </button>
            )}
          </div>
        </>
      }
    >
      <div className="detail-strip" style={{ background: toneStrip(p, 14) }} aria-hidden="true" />
      {p.description ? <p className="detail-desc">{p.description}</p> : null}

      <dl className="meta">
        <div>
          <dt>Profile</dt>
          <dd>
            {p.settings.profile} · {p.settings.treatment === 'bw' ? 'Black & white' : 'Color'}
          </dd>
        </div>
        {p.timeOfDay.length ? (
          <div>
            <dt>Best light</dt>
            <dd>{p.timeOfDay.join(', ')}</dd>
          </div>
        ) : null}
        {p.locations.length ? (
          <div>
            <dt>Places</dt>
            <dd>{p.locations.join(', ')}</dd>
          </div>
        ) : null}
      </dl>

      {p.settings.notes ? <p className="note">{p.settings.notes}</p> : null}

      <div className="sections">
        {sections.map((sec) => (
          <section key={sec.id} className="sec">
            <h3>{sec.title}</h3>
            <dl>
              {sec.rows.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {sec.id === 'curve' && hasCurve ? <ToneCurve curve={p.settings.toneCurve} /> : null}
          </section>
        ))}
      </div>

      {p.settings.hsl.length ? (
        <section className="sec">
          <h3>Color mix (HSL)</h3>
          <div className="table-scroll">
            <table className="hsl">
              <thead>
                <tr>
                  <th scope="col">Channel</th>
                  <th scope="col">Hue</th>
                  <th scope="col">Sat</th>
                  <th scope="col">Lum</th>
                  <th scope="col">Why</th>
                </tr>
              </thead>
              <tbody>
                {p.settings.hsl.map((h) => (
                  <tr key={h.channel}>
                    <th scope="row">
                      <span className="dot" style={{ background: HSL_COLORS[h.channel.toLowerCase()] || 'var(--muted)' }} aria-hidden="true" />
                      {h.channel}
                    </th>
                    <td>{fmtSigned(h.hue)}</td>
                    <td>{fmtSigned(h.saturation)}</td>
                    <td>{fmtSigned(h.luminance)}</td>
                    <td className="muted">{h.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {p.tags.length ? (
        <p className="pills">
          {p.tags.map((t) => (
            <span key={t} className="pill">
              {t}
            </span>
          ))}
        </p>
      ) : null}

      {p.images.length ? (
        <section className="sec">
          <h3>Reference photos</h3>
          <ul className="thumbs">
            {p.images.map((src, i) => (
              <li key={i}>
                <img src={src} alt={`Reference ${i + 1} for ${p.name}`} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Modal>
  );
}
