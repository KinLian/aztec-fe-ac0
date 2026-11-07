import { normalizePreset } from '../lib/presetModel.js';

// Every JSON file in ./presets becomes a seed preset (id = file name without .json).
const modules = import.meta.glob('./presets/*.json', { eager: true, import: 'default' });

export const SEED_PRESETS = Object.entries(modules)
  .map(([file, json]) => ({
    id: file.split('/').pop().replace(/\.json$/, ''),
    ...normalizePreset(json),
  }))
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
