import { useMemo } from 'react';
import { REGION_BY_ID, SLOT_BY_ID, SLOT_COLUMNS } from '../data/regions.js';
import { matrix, shortName } from '../lib/recommend.js';
import { useStored } from '../hooks/useStored.js';
import { RegionTabs, SkyChips, StyleChips } from './Controls.jsx';

export default function CheatSheet({ presets, onOpen }) {
  const [s, setS] = useStored('nur-sheet-v1', { regionId: 'mecca', sky: 'clear', style: 'auto' });
  const region = REGION_BY_ID[s.regionId] || REGION_BY_ID.mecca;
  const rows = useMemo(() => (presets.length ? matrix(presets, region.id, { sky: s.sky, style: s.style }) : []), [presets, region.id, s.sky, s.style]);

  return (
    <div className="sheet">
      <section className="panel controls">
        <RegionTabs value={region.id} onChange={(id) => setS({ ...s, regionId: id })} />
        <div className="control-row">
          <SkyChips value={s.sky} onChange={(v) => setS({ ...s, sky: v })} />
          <StyleChips value={s.style} onChange={(v) => setS({ ...s, style: v })} />
        </div>
      </section>

      <p className="muted section-sub">
        The top preset for every subject and light in {region.name}. Select a name to see its settings.
      </p>

      {rows.length ? (
        <div className="table-scroll">
          <table className="matrix">
            <thead>
              <tr>
                <th scope="col">Subject</th>
                {SLOT_COLUMNS.map((id) => {
                  const sl = SLOT_BY_ID[id];
                  return (
                    <th key={id} scope="col" style={{ borderBottomColor: sl.color }}>
                      <span className="dot" style={{ background: sl.color }} aria-hidden="true" />
                      {sl.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ subject, cells }) => (
                <tr key={subject.id}>
                  <th scope="row">{subject.label}</th>
                  {cells.map(({ slot, best }) => (
                    <td key={slot}>
                      <button type="button" onClick={() => onOpen(best.preset.id)} title={`${best.preset.name}, match ${best.score}`}>
                        {shortName(best.preset.name)}
                        <span className="muted"> {best.score}</span>
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel empty">
          <h2>No presets yet</h2>
          <p className="muted">Import preset files in the Library tab to fill this sheet.</p>
        </div>
      )}
    </div>
  );
}
