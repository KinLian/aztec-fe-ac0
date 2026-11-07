import { useCallback, useEffect, useRef, useState } from 'react';
import { SEED_PRESETS } from '../data/seed.js';
import { fingerprint, normalizePreset, uniqueId } from '../lib/presetModel.js';

const KEY = 'nur-presets-v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.presets)) {
        const taken = new Set();
        return data.presets
          .map((p) => {
            try {
              const n = normalizePreset(p);
              const id = uniqueId(p.id || n.name, taken);
              taken.add(id);
              return { id, ...n };
            } catch {
              return null;
            }
          })
          .filter(Boolean);
      }
    }
  } catch {
    /* storage unavailable or corrupt: fall back to the bundled presets */
  }
  return SEED_PRESETS;
}

function uniqueName(name, names) {
  if (!names.has(name)) return name;
  let n = 2;
  while (names.has(`${name} (${n})`)) n++;
  return `${name} (${n})`;
}

export function usePresets() {
  const [presets, setPresets] = useState(load);
  const [saveError, setSaveError] = useState(null);
  const ref = useRef(presets);
  ref.current = presets;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, presets }));
      setSaveError(null);
    } catch {
      setSaveError('Your browser could not save the library (storage is full or blocked). Export a backup so nothing is lost.');
    }
  }, [presets]);

  const add = useCallback((raw) => {
    const n = normalizePreset(raw);
    const taken = new Set(ref.current.map((p) => p.id));
    const id = uniqueId(n.name, taken);
    setPresets((prev) => [...prev, { id, ...n }]);
    return id;
  }, []);

  const update = useCallback((id, raw) => {
    const n = normalizePreset(raw);
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { id, ...n, createdAt: p.createdAt, updatedAt: new Date().toISOString() } : p)),
    );
  }, []);

  const remove = useCallback((id) => setPresets((prev) => prev.filter((p) => p.id !== id)), []);

  const duplicate = useCallback((id) => {
    const src = ref.current.find((p) => p.id === id);
    if (!src) return null;
    const names = new Set(ref.current.map((p) => p.name));
    const { id: _id, ...rest } = src;
    const n = normalizePreset({
      ...rest,
      name: uniqueName(`${src.name} (copy)`, names),
      createdAt: undefined,
      updatedAt: undefined,
    });
    const newId = uniqueId(n.name, new Set(ref.current.map((p) => p.id)));
    setPresets((prev) => [...prev, { id: newId, ...n }]);
    return newId;
  }, []);

  /** items = array of raw preset objects. Skips exact duplicates, renames name clashes. */
  const importMany = useCallback((items) => {
    const result = { added: 0, skipped: 0, failed: [] };
    const taken = new Set(ref.current.map((p) => p.id));
    const names = new Set(ref.current.map((p) => p.name));
    const prints = new Set(ref.current.map((p) => fingerprint(p)));
    const next = [];
    items.forEach((raw) => {
      try {
        const n = normalizePreset(raw);
        const fp = fingerprint(n);
        if (prints.has(fp)) {
          result.skipped++;
          return;
        }
        prints.add(fp);
        n.name = uniqueName(n.name, names);
        names.add(n.name);
        const id = uniqueId(n.name, taken);
        taken.add(id);
        next.push({ id, ...n });
        result.added++;
      } catch (e) {
        result.failed.push(e.message);
      }
    });
    if (next.length) setPresets((prev) => [...prev, ...next]);
    return result;
  }, []);

  const resetDefaults = useCallback(() => setPresets(SEED_PRESETS), []);

  return { presets, saveError, add, update, remove, duplicate, importMany, resetDefaults };
}
