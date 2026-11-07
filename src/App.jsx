import { useCallback, useEffect, useRef, useState } from 'react';
import { usePresets } from './hooks/usePresets.js';
import { useStored } from './hooks/useStored.js';
import Recommend from './components/Recommend.jsx';
import CheatSheet from './components/CheatSheet.jsx';
import Library from './components/Library.jsx';
import PresetDetail from './components/PresetDetail.jsx';
import Editor from './components/Editor.jsx';

const TABS = [
  { id: 'recommend', label: 'Recommend' },
  { id: 'sheet', label: 'Cheat sheet' },
  { id: 'library', label: 'Library' },
];

export default function App() {
  const store = usePresets();
  const { presets, saveError } = store;
  const [ui, setUi] = useStored('nur-ui-v1', { tab: 'recommend' });
  const tab = TABS.some((t) => t.id === ui.tab) ? ui.tab : 'recommend';
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null); // { id } to edit, { id: null } for a new preset
  const [toast, setToast] = useState('');
  const timer = useRef(0);

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 4500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const opened = presets.find((p) => p.id === openId) || null;
  const editedPreset = editing?.id ? presets.find((p) => p.id === editing.id) : null;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <div>
            <h1>Aztec</h1>
            <p className="muted">Lightroom presets for Mecca, Madinah &amp; Jeddah</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" className="tab" aria-current={t.id === tab ? 'page' : undefined} onClick={() => setUi({ ...ui, tab: t.id })}>
              {t.label}
              {t.id === 'library' ? <span className="count">{presets.length}</span> : null}
            </button>
          ))}
        </nav>
      </header>

      {saveError ? (
        <p className="banner" role="alert">
          {saveError}
        </p>
      ) : null}

      <main>
        {tab === 'recommend' ? <Recommend presets={presets} onOpen={setOpenId} notify={notify} /> : null}
        {tab === 'sheet' ? <CheatSheet presets={presets} onOpen={setOpenId} /> : null}
        {tab === 'library' ? (
          <Library presets={presets} store={store} onOpen={setOpenId} onNew={() => setEditing({ id: null })} notify={notify} />
        ) : null}
      </main>

      <footer className="foot muted">
        Presets are saved in this browser only. Use Library → Export backup to keep a copy. Recommendations come from each preset’s own tags and settings plus the sun’s position in Saudi time.
      </footer>

      {opened ? (
        <PresetDetail
          preset={opened}
          notify={notify}
          onClose={() => setOpenId(null)}
          onEdit={() => {
            setOpenId(null);
            setEditing({ id: opened.id });
          }}
          onDuplicate={() => {
            const id = store.duplicate(opened.id);
            if (id) {
              setOpenId(id);
              notify('Duplicated. You are now looking at the copy.');
            }
          }}
          onDelete={() => {
            store.remove(opened.id);
            setOpenId(null);
            notify(`Deleted “${opened.name}”.`);
          }}
        />
      ) : null}

      {editing && (editing.id === null || editedPreset) ? (
        <Editor
          preset={editedPreset}
          onClose={() => setEditing(null)}
          onSave={(raw) => {
            if (editing.id) {
              store.update(editing.id, raw);
              setOpenId(editing.id);
              notify('Preset saved.');
            } else {
              const id = store.add(raw);
              setOpenId(id);
              notify('Preset added to your library.');
            }
            setEditing(null);
          }}
        />
      ) : null}

      <div className="toast" role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
